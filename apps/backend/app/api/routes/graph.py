from fastapi import APIRouter, HTTPException

try:
    from app.services.graph_service import get_case_graph
except ImportError:
    from apps.backend.app.services.graph_service import get_case_graph

router = APIRouter(prefix="/api", tags=["Graph"])


@router.get("/cases/{case_id}/graph")
def case_graph(case_id: str):
    try:
        data = get_case_graph(case_id)
        return data
    except Exception as exc:
        print(f"Error fetching case graph for {case_id}: {exc}")
        return {
            "case_id": case_id,
            "nodes": [],
            "edges": [],
            "error": str(exc),
            "status": "error",
        }