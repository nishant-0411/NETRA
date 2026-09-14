"""Case-scoped graph analytics backed by Neo4j Graph Data Science."""

import logging
from typing import Any, Dict, List, Optional
from uuid import uuid4

try:
    from app.services.graph_service import driver
except ImportError:
    from apps.backend.app.services.graph_service import driver

logger = logging.getLogger(__name__)

_CASE_NODE_QUERY = """
MATCH (:Case {case_id: $case_id})-[:HAS_DOCUMENT]->(:Document)-[:MENTIONS]->(entity)
OPTIONAL MATCH (entity)-[*1..2]-(related)
WITH collect(DISTINCT entity) + collect(DISTINCT related) AS candidates
UNWIND candidates AS node
WITH DISTINCT node
WHERE node IS NOT NULL
RETURN id(node) AS id
"""

_CASE_RELATIONSHIP_QUERY = """
MATCH (:Case {case_id: $case_id})-[:HAS_DOCUMENT]->(:Document)-[:MENTIONS]->(entity)
OPTIONAL MATCH (entity)-[*1..2]-(related)
WITH collect(DISTINCT entity) + collect(DISTINCT related) AS candidates
UNWIND candidates AS source
WITH candidates, DISTINCT source
MATCH (source)-[relationship]-(target)
WHERE target IN candidates
RETURN id(source) AS source, id(target) AS target, 1.0 AS weight
"""


class GraphAnalyticsService:
    """Run short-lived GDS projections for an individual investigation."""

    @staticmethod
    def _graph_name(analysis: str) -> str:
        # Unique projections prevent one concurrent request from dropping another.
        return f"netra_{analysis}_{uuid4().hex}"

    @staticmethod
    def _project_case_graph(session: Any, graph_name: str, case_id: str) -> None:
        session.run(
            """
            CALL gds.graph.project.cypher(
                $graph_name, $node_query, $relationship_query,
                {
                    validateRelationships: false,
                    parameters: {case_id: $case_id}
                }
            )
            """,
            graph_name=graph_name,
            node_query=_CASE_NODE_QUERY,
            relationship_query=_CASE_RELATIONSHIP_QUERY,
            case_id=case_id,
        ).consume()

    @staticmethod
    def _drop_graph(session: Any, graph_name: str) -> None:
        session.run("CALL gds.graph.drop($graph_name, false)", graph_name=graph_name).consume()

    @staticmethod
    def _require_case(case_id: Optional[str]) -> Optional[Dict[str, Any]]:
        if case_id:
            return None
        return {"status": "error", "message": "case_id is required for graph analytics."}

    @staticmethod
    def run_community_detection(case_id: Optional[str] = None) -> Dict[str, Any]:
        """Run Louvain community detection for entities linked to ``case_id``."""
        invalid = GraphAnalyticsService._require_case(case_id)
        if invalid:
            return invalid

        graph_name = GraphAnalyticsService._graph_name("communities")
        projected = False
        try:
            with driver.session() as session:
                GraphAnalyticsService._project_case_graph(session, graph_name, case_id)
                projected = True
                result = session.run(
                    """
                    CALL gds.louvain.stream($graph_name)
                    YIELD nodeId, communityId
                    WITH gds.util.asNode(nodeId) AS node, communityId
                    RETURN elementId(node) AS node_id,
                           coalesce(node.name, node.phone_number, node.registration_number,
                                    node.account_number, node.entity_value, elementId(node)) AS name,
                           labels(node) AS labels, communityId
                    ORDER BY communityId, name
                    """,
                    graph_name=graph_name,
                )
                return {
                    "status": "success",
                    "case_id": case_id,
                    "communities": [
                        {"node_id": row["node_id"], "name": row["name"], "labels": row["labels"],
                         "community_id": row["communityId"]}
                        for row in result
                    ],
                }
        except Exception as exc:
            logger.exception("[Analytics] Community detection failed for %s", case_id)
            return {"status": "error", "case_id": case_id, "message": str(exc)}
        finally:
            if projected:
                try:
                    with driver.session() as session:
                        GraphAnalyticsService._drop_graph(session, graph_name)
                except Exception:
                    logger.warning("[Analytics] Could not drop projection %s", graph_name)

    @staticmethod
    def run_centrality_analysis(case_id: Optional[str] = None) -> Dict[str, Any]:
        """Run PageRank to identify influential entities in a case network."""
        invalid = GraphAnalyticsService._require_case(case_id)
        if invalid:
            return invalid

        graph_name = GraphAnalyticsService._graph_name("centrality")
        projected = False
        try:
            with driver.session() as session:
                GraphAnalyticsService._project_case_graph(session, graph_name, case_id)
                projected = True
                result = session.run(
                    """
                    CALL gds.pageRank.stream($graph_name)
                    YIELD nodeId, score
                    WITH gds.util.asNode(nodeId) AS node, score
                    RETURN elementId(node) AS node_id,
                           coalesce(node.name, node.phone_number, node.registration_number,
                                    node.account_number, node.entity_value, elementId(node)) AS name,
                           labels(node) AS labels, score
                    ORDER BY score DESC, name
                    LIMIT 50
                    """,
                    graph_name=graph_name,
                )
                return {
                    "status": "success",
                    "case_id": case_id,
                    "central_nodes": [
                        {"node_id": row["node_id"], "name": row["name"], "labels": row["labels"],
                         "score": row["score"]}
                        for row in result
                    ],
                }
        except Exception as exc:
            logger.exception("[Analytics] Centrality analysis failed for %s", case_id)
            return {"status": "error", "case_id": case_id, "message": str(exc)}
        finally:
            if projected:
                try:
                    with driver.session() as session:
                        GraphAnalyticsService._drop_graph(session, graph_name)
                except Exception:
                    logger.warning("[Analytics] Could not drop projection %s", graph_name)

    @staticmethod
    def run_anomaly_detection(case_id: Optional[str] = None) -> Dict[str, Any]:
        """Find case entities whose direct connection density is unusually high."""
        invalid = GraphAnalyticsService._require_case(case_id)
        if invalid:
            return invalid

        query = """
        MATCH (:Case {case_id: $case_id})-[:HAS_DOCUMENT]->(:Document)-[:MENTIONS]->(entity)
        OPTIONAL MATCH (entity)-[relationship]-()
        WITH entity, count(relationship) AS degree
        WHERE degree > $minimum_degree
        RETURN elementId(entity) AS node_id,
               coalesce(entity.name, entity.phone_number, entity.registration_number,
                        entity.account_number, entity.entity_value, elementId(entity)) AS name,
               labels(entity) AS labels, degree,
               'Unusually high connection density' AS reason
        ORDER BY degree DESC, name
        LIMIT 10
        """
        try:
            with driver.session() as session:
                result = session.run(query, case_id=case_id, minimum_degree=5)
                anomalies: List[Dict[str, Any]] = [
                    {"node_id": row["node_id"], "name": row["name"], "labels": row["labels"],
                     "degree": row["degree"], "reason": row["reason"]}
                    for row in result
                ]
                return {"status": "success", "case_id": case_id, "anomalies": anomalies}
        except Exception as exc:
            logger.exception("[Analytics] Anomaly detection failed for %s", case_id)
            return {"status": "error", "case_id": case_id, "message": str(exc)}
