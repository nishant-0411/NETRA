from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from app.services.graph_service import driver
from app.services.analytics_service import GraphAnalyticsService
from app.services.rag_service import RagService

router = APIRouter(
    prefix="/api",
    tags=["Network & Intelligence"],
)


# ─── Graph Data ───────────────────────────────────────────────

@router.get("/graph/{case_id}")
async def get_case_graph(case_id: str):
    """Return all nodes and edges for a given case."""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (d:Document {case_id: $case_id})-[r]-(n)
                WITH collect(DISTINCT n) AS nodes, collect(DISTINCT r) AS rels, collect(DISTINCT d) AS docs
                UNWIND nodes + docs AS node
                WITH collect(DISTINCT node) AS allNodes, rels
                UNWIND allNodes AS n
                WITH collect({
                    id: elementId(n),
                    labels: labels(n),
                    properties: properties(n)
                }) AS nodeList, rels
                UNWIND rels AS r
                RETURN nodeList,
                       collect({
                           id: elementId(r),
                           type: type(r),
                           source: elementId(startNode(r)),
                           target: elementId(endNode(r)),
                           properties: properties(r)
                       }) AS edgeList
            """, case_id=case_id)
            record = result.single()
            if not record:
                return {"nodes": [], "edges": []}
            return {"nodes": record["nodeList"], "edges": record["edgeList"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/full")
async def get_full_graph():
    """Return the entire graph (limited to 500 nodes)."""
    try:
        with driver.session() as session:
            nodes_result = session.run("""
                MATCH (n) RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS properties LIMIT 500
            """)
            nodes = [{"id": r["id"], "labels": r["labels"], "properties": r["properties"]} for r in nodes_result]

            edges_result = session.run("""
                MATCH (a)-[r]->(b) RETURN elementId(r) AS id, type(r) AS type,
                elementId(a) AS source, elementId(b) AS target, properties(r) AS properties LIMIT 1000
            """)
            edges = [{"id": r["id"], "type": r["type"], "source": r["source"], "target": r["target"], "properties": r["properties"]} for r in edges_result]

            return {"nodes": nodes, "edges": edges}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Node Detail ──────────────────────────────────────────────

@router.get("/node/{node_id}")
async def get_node_detail(node_id: str):
    """Get full details for a node including description and image."""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (n) WHERE elementId(n) = $node_id
                OPTIONAL MATCH (n)-[r]-(m)
                RETURN n, labels(n) AS labels, properties(n) AS props,
                       collect({type: type(r), target_name: m.name, target_labels: labels(m)}) AS connections
            """, node_id=node_id)
            record = result.single()
            if not record:
                raise HTTPException(status_code=404, detail="Node not found")
            return {
                "labels": record["labels"],
                "properties": record["props"],
                "connections": record["connections"],
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Edge Detail ──────────────────────────────────────────────

@router.get("/edge/{edge_id}")
async def get_edge_detail(edge_id: str):
    """Get details about an edge including the reason two entities are connected."""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (a)-[r]->(b) WHERE elementId(r) = $edge_id
                RETURN type(r) AS type, properties(r) AS props,
                       {name: a.name, labels: labels(a)} AS source,
                       {name: b.name, labels: labels(b)} AS target
            """, edge_id=edge_id)
            record = result.single()
            if not record:
                raise HTTPException(status_code=404, detail="Edge not found")
            return {
                "type": record["type"],
                "properties": record["props"],
                "source": record["source"],
                "target": record["target"],
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Suspect Scoring ─────────────────────────────────────────

@router.get("/suspects/{case_id}")
async def get_suspects(case_id: str):
    """Get suspect scores and reasoning for a case."""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (d:Document {case_id: $case_id})-[:MENTIONS|REFERENCES]-(p:Person)
                OPTIONAL MATCH (p)-[r]-()
                WITH p, count(r) AS connections
                RETURN p.person_id AS person_id, p.name AS name,
                       connections,
                       p.suspect_score AS suspect_score,
                       p.suspect_reason AS suspect_reason
                ORDER BY connections DESC
            """, case_id=case_id)
            suspects = []
            for r in result:
                score = r["suspect_score"] or round(min(r["connections"] / 20.0, 1.0), 2)
                reason = r["suspect_reason"] or f"Connected to {r['connections']} entities in this case network."
                suspects.append({
                    "person_id": r["person_id"],
                    "name": r["name"],
                    "connections": r["connections"],
                    "suspect_score": score,
                    "suspect_reason": reason,
                })
            return {"case_id": case_id, "suspects": suspects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Explore: Cross-Case Link Scanner ────────────────────────

@router.get("/explore/{node_id}")
async def explore_node(node_id: str, depth: int = Query(default=2, le=3)):
    """
    Explore a node across all cases in the database.
    Finds similar individuals and cross-case links up to `depth` hops.
    """
    try:
        with driver.session() as session:
            # Get the node's properties for matching
            node_result = session.run("""
                MATCH (n) WHERE elementId(n) = $node_id
                RETURN properties(n) AS props, labels(n) AS labels
            """, node_id=node_id)
            node_record = node_result.single()
            if not node_record:
                raise HTTPException(status_code=404, detail="Node not found")

            props = node_record["props"]
            labels = node_record["labels"]
            name = props.get("name", "")
            phone = props.get("phone_number", "")

            # Find similar nodes across all cases
            similar_result = session.run("""
                MATCH (n) WHERE elementId(n) = $node_id
                MATCH (n)-[*1..""" + str(depth) + """]-(related)
                WHERE related <> n
                OPTIONAL MATCH (related)-[:MENTIONS|REFERENCES]-(d:Document)
                RETURN DISTINCT elementId(related) AS id, labels(related) AS labels,
                       properties(related) AS properties,
                       collect(DISTINCT d.case_id) AS linked_cases
                LIMIT 50
            """, node_id=node_id)

            related_nodes = []
            for r in similar_result:
                related_nodes.append({
                    "id": r["id"],
                    "labels": r["labels"],
                    "properties": r["properties"],
                    "linked_cases": [c for c in r["linked_cases"] if c],
                })

            # Also find name-based fuzzy matches across all cases
            name_matches = []
            if name:
                name_result = session.run("""
                    MATCH (p:Person)
                    WHERE p.name =~ $pattern AND elementId(p) <> $node_id
                    OPTIONAL MATCH (p)-[:MENTIONS|REFERENCES]-(d:Document)
                    RETURN elementId(p) AS id, labels(p) AS labels, properties(p) AS properties,
                           collect(DISTINCT d.case_id) AS linked_cases
                    LIMIT 20
                """, pattern=f"(?i).*{name.split()[0]}.*", node_id=node_id)
                for r in name_result:
                    name_matches.append({
                        "id": r["id"],
                        "labels": r["labels"],
                        "properties": r["properties"],
                        "linked_cases": [c for c in r["linked_cases"] if c],
                    })

            return {
                "node_id": node_id,
                "node_properties": props,
                "related_nodes": related_nodes,
                "name_matches": name_matches,
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Analytics ────────────────────────────────────────────────

@router.get("/analytics/communities")
async def get_communities():
    return GraphAnalyticsService.run_community_detection()


@router.get("/analytics/centrality")
async def get_centrality():
    return GraphAnalyticsService.run_centrality_analysis()


@router.get("/analytics/anomalies")
async def get_anomalies():
    return GraphAnalyticsService.run_anomaly_detection()


# ─── RAG Chat ────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str

@router.post("/chat")
async def chat(req: ChatRequest):
    return RagService.query_knowledge_base(req.question)
