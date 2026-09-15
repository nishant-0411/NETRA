from fastapi import APIRouter, Depends, HTTPException

from app.api.routes.auth import get_current_user
from app.services.case_access_service import require_case_access

try:
    from app.services.graph_service import (
        get_case_graph,
        get_case_graph_stats,
    )
    from app.services.analytics_service import GraphAnalyticsService
except ImportError:
    from apps.backend.app.services.graph_service import (
        get_case_graph,
        get_case_graph_stats,
    )
    from apps.backend.app.services.analytics_service import GraphAnalyticsService

router = APIRouter(prefix="/api", tags=["Graph"])


@router.get("/cases/{case_id}/graph")
def case_graph(case_id: str, current_user: dict = Depends(get_current_user)):
    # Authorization is checked before any Neo4j query so graph structure and
    # analytics cannot leak to personnel outside the investigation.
    require_case_access(case_id, current_user["police_id"])
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

@router.get("/cases/{case_id}/graph/stats")
def case_graph_stats(
    case_id: str,
    current_user: dict = Depends(get_current_user),
):
    require_case_access(case_id, current_user["police_id"])

    try:
        return get_case_graph_stats(case_id)
    except Exception as exc:
        print(f"Error fetching graph stats for {case_id}: {exc}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to fetch graph statistics: {exc}",
        )
    
@router.get("/cases/{case_id}/analytics/{analysis}")
def case_graph_analytics(
    case_id: str,
    analysis: str,
    current_user: dict = Depends(get_current_user),
):
    """Run a graph analysis against the selected investigation's Neo4j subgraph."""
    require_case_access(case_id, current_user["police_id"])
    analyses = {
        "communities": GraphAnalyticsService.run_community_detection,
        "centrality": GraphAnalyticsService.run_centrality_analysis,
        "anomalies": GraphAnalyticsService.run_anomaly_detection,
    }
    runner = analyses.get(analysis.lower())
    if runner is None:
        raise HTTPException(
            status_code=404,
            detail="Unknown analysis. Use communities, centrality, or anomalies.",
        )

    result = runner(case_id)
    if result.get("status") == "error":
        raise HTTPException(status_code=503, detail=result.get("message", "Analysis failed."))
    return result
