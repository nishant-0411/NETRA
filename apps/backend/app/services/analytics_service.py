import logging
from typing import Dict, List, Any
from app.services.graph_service import driver

logger = logging.getLogger(__name__)

class GraphAnalyticsService:
    @staticmethod
    def run_community_detection() -> Dict[str, Any]:
        """
        Run Louvain community detection to find closely knit groups.
        Requires Neo4j Graph Data Science (GDS) library.
        """
        logger.info("[Analytics] Running Community Detection (Louvain)...")
        query = """
        CALL gds.graph.project(
            'networkGraph',
            ['Person', 'Phone', 'Vehicle', 'Account'],
            '*'
        );
        """
        louvain_query = """
        CALL gds.louvain.stream('networkGraph')
        YIELD nodeId, communityId
        RETURN gds.util.asNode(nodeId).name AS name, communityId
        ORDER BY communityId ASC;
        """
        cleanup_query = "CALL gds.graph.drop('networkGraph', false);"
        
        try:
            with driver.session() as session:
                session.run(query)
                result = session.run(louvain_query)
                communities = [{"name": record["name"], "communityId": record["communityId"]} for record in result]
                session.run(cleanup_query)
                return {"status": "success", "communities": communities}
        except Exception as e:
            logger.error(f"[Analytics] Community Detection Failed: {e}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    def run_centrality_analysis() -> Dict[str, Any]:
        """
        Run PageRank centrality to identify key connectors and influencers.
        """
        logger.info("[Analytics] Running Centrality Analysis (PageRank)...")
        query = """
        CALL gds.graph.project(
            'centralityGraph',
            ['Person', 'Phone', 'Vehicle'],
            '*'
        );
        """
        pagerank_query = """
        CALL gds.pageRank.stream('centralityGraph')
        YIELD nodeId, score
        RETURN gds.util.asNode(nodeId).name AS name, score
        ORDER BY score DESC LIMIT 50;
        """
        cleanup_query = "CALL gds.graph.drop('centralityGraph', false);"

        try:
            with driver.session() as session:
                session.run(query)
                result = session.run(pagerank_query)
                central_nodes = [{"name": record["name"], "score": record["score"]} for record in result]
                session.run(cleanup_query)
                return {"status": "success", "central_nodes": central_nodes}
        except Exception as e:
            logger.error(f"[Analytics] Centrality Analysis Failed: {e}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    def run_anomaly_detection() -> Dict[str, Any]:
        """
        Run anomaly detection to find unusual patterns (e.g., highly connected nodes with low community overlap).
        In a real scenario, this could use FastRP + KNN + Outlier Detection in GDS.
        Here we use a heuristic based on degree mismatch for simplicity if GDS ML is unavailable.
        """
        logger.info("[Analytics] Running Anomaly Detection...")
        query = """
        MATCH (n:Person)-[r]-()
        WITH n, count(r) as degree
        WHERE degree > 50
        RETURN n.name AS name, degree, "Unusually high connection density" as reason
        ORDER BY degree DESC LIMIT 10;
        """
        try:
            with driver.session() as session:
                result = session.run(query)
                anomalies = [{"name": record["name"], "degree": record["degree"], "reason": record["reason"]} for record in result]
                return {"status": "success", "anomalies": anomalies}
        except Exception as e:
            logger.error(f"[Analytics] Anomaly Detection Failed: {e}")
            return {"status": "error", "message": str(e)}
