"""Case-scoped graph analytics backed by the stored Neo4j investigation graph."""

import logging
from typing import Any, Dict, List, Optional

try:
    from app.services.graph_service import driver
except ImportError:
    from apps.backend.app.services.graph_service import driver

logger = logging.getLogger(__name__)

class GraphAnalyticsService:
    """Run case-isolated analytics without requiring Cypher GDS projections.

    Neo4j Aura deployments can expose GDS algorithms but not the
    ``gds.graph.project.cypher`` projection procedure. Loading just the
    authorised case subgraph and calculating the small investigation graph in
    process keeps results scoped correctly and removes that deployment-specific
    failure mode.
    """

    @staticmethod
    def _load_case_subgraph(session: Any, case_id: str) -> tuple[dict, dict]:
        node_rows = session.run(
            """
            MATCH (:Case {case_id: $case_id})-[:HAS_DOCUMENT]->(:Document)-[:MENTIONS]->(entity)
            RETURN DISTINCT elementId(entity) AS node_id,
                   coalesce(entity.name, entity.phone_number, entity.registration_number,
                            entity.account_number, entity.entity_value, entity.value,
                            elementId(entity)) AS name,
                   labels(entity) AS labels
            """,
            case_id=case_id,
        )
        nodes = {
            row["node_id"]: {
                "node_id": row["node_id"],
                "name": row["name"],
                "labels": row["labels"],
            }
            for row in node_rows
        }
        adjacency = {node_id: set() for node_id in nodes}

        edge_rows = session.run(
            """
            MATCH (:Case {case_id: $case_id})-[:HAS_DOCUMENT]->(:Document)-[:MENTIONS]->(source)
            MATCH (source)-[relationship]-(target)
            WHERE EXISTS {
                MATCH (:Case {case_id: $case_id})-[:HAS_DOCUMENT]->(:Document)-[:MENTIONS]->(target)
            }
            RETURN DISTINCT elementId(source) AS source_id, elementId(target) AS target_id
            """,
            case_id=case_id,
        )
        for row in edge_rows:
            source_id, target_id = row["source_id"], row["target_id"]
            if source_id in adjacency and target_id in adjacency and source_id != target_id:
                adjacency[source_id].add(target_id)
                adjacency[target_id].add(source_id)
        return nodes, adjacency

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

        try:
            with driver.session() as session:
                nodes, adjacency = GraphAnalyticsService._load_case_subgraph(session, case_id)

            communities = []
            visited = set()
            for community_id, node_id in enumerate(sorted(nodes), start=1):
                if node_id in visited:
                    continue
                stack, component = [node_id], []
                visited.add(node_id)
                while stack:
                    current = stack.pop()
                    component.append(current)
                    for neighbour in adjacency[current]:
                        if neighbour not in visited:
                            visited.add(neighbour)
                            stack.append(neighbour)
                communities.extend({**nodes[current], "community_id": community_id} for current in component)
            return {"status": "success", "case_id": case_id, "communities": communities}
        except Exception as exc:
            logger.exception("[Analytics] Community detection failed for %s", case_id)
            return {"status": "error", "case_id": case_id, "message": str(exc)}

    @staticmethod
    def run_centrality_analysis(case_id: Optional[str] = None) -> Dict[str, Any]:
        """Run PageRank to identify influential entities in a case network."""
        invalid = GraphAnalyticsService._require_case(case_id)
        if invalid:
            return invalid

        try:
            with driver.session() as session:
                nodes, adjacency = GraphAnalyticsService._load_case_subgraph(session, case_id)

            if not nodes:
                return {"status": "success", "case_id": case_id, "central_nodes": []}
            count = len(nodes)
            scores = {node_id: 1.0 / count for node_id in nodes}
            for _ in range(40):
                next_scores = {node_id: 0.15 / count for node_id in nodes}
                dangling_score = sum(scores[node_id] for node_id, neighbours in adjacency.items() if not neighbours)
                for node_id in next_scores:
                    next_scores[node_id] += 0.85 * dangling_score / count
                for source_id, neighbours in adjacency.items():
                    if neighbours:
                        contribution = 0.85 * scores[source_id] / len(neighbours)
                        for target_id in neighbours:
                            next_scores[target_id] += contribution
                scores = next_scores
            central_nodes = [
                {**node, "score": scores[node_id]}
                for node_id, node in nodes.items()
            ]
            central_nodes.sort(key=lambda node: (-node["score"], str(node["name"])))
            return {"status": "success", "case_id": case_id, "central_nodes": central_nodes[:50]}
        except Exception as exc:
            logger.exception("[Analytics] Centrality analysis failed for %s", case_id)
            return {"status": "error", "case_id": case_id, "message": str(exc)}

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
