from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.auth import get_current_user
from app.db.mongodb import active_db
from app.services.case_access_service import (
    accessible_case_ids,
    assign_initial_lead,
    get_case_access,
    officer_summary,
)

router = APIRouter(
    prefix="/cases",
    tags=["Cases"],
)

class CaseCreateRequest(BaseModel):
    """The minimum dossier data a lead investigator supplies to open a case."""

    case_title: str = Field(min_length=3, max_length=300)
    fir_number: str = Field(min_length=1, max_length=120)
    police_station: str = Field(min_length=1, max_length=300)
    crime_type: str = Field(min_length=1, max_length=200)
    case_id: Optional[str] = Field(default=None, min_length=3, max_length=80)
    threat_level: str = Field(default="MEDIUM", max_length=30)
    ipc_sections: List[str] = Field(default_factory=list)
    master_plot: str = Field(default="", max_length=10_000)


def _case_payload(case_doc: Dict[str, Any]) -> Dict[str, Any]:
    """Attach the current lead record to a case response without duplicating it in MongoDB."""
    payload = dict(case_doc)
    payload.pop("_id", None)
    access = get_case_access(payload["case_id"])
    if access:
        lead_id = access.get("lead_investigator_police_id")
        payload["lead_investigator_police_id"] = lead_id
        payload["lead_investigator"] = officer_summary(lead_id) or {"police_id": lead_id}
        payload["authorised_personnel_count"] = len(access.get("police_ids", []))
    return payload


def _new_case_id() -> str:
    """Generate a collision-resistant ID; IDs are never derived from the case title."""
    return f"CASE-{uuid4().hex[:8].upper()}"

@router.get("", response_model=List[Dict[str, Any]])
@router.get("/", response_model=List[Dict[str, Any]])
async def list_cases(
    all_cases: bool = False,
    current_user: dict = Depends(get_current_user),
):
    """
    Returns the signed-in officer's authorised case dossiers (or all system cases if all_cases=True).
    """
    try:
        if all_cases:
            db_cases = list(active_db["cases"].find({}, {"_id": 0}))
            return [_case_payload(case_doc) for case_doc in db_cases]
        case_ids = accessible_case_ids(current_user["police_id"])
        if not case_ids:
            return []
        db_cases = list(active_db["cases"].find({"case_id": {"$in": case_ids}}, {"_id": 0}))
        return [_case_payload(case_doc) for case_doc in db_cases]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load case dossiers: {exc}") from exc

@router.get("/{case_id}")
async def get_case(case_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get detailed case dossier by case_id.
    """
    try:
        if case_id not in accessible_case_ids(current_user["police_id"]):
            raise HTTPException(status_code=403, detail="You do not have access to this case.")
        case_doc = active_db["cases"].find_one({"case_id": case_id}, {"_id": 0})
        if case_doc:
            return _case_payload(case_doc)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to load case dossier: {exc}") from exc

    raise HTTPException(status_code=404, detail=f"Case {case_id} not found")


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_case(
    payload: CaseCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Open a dossier and make its creator the initial lead investigator."""
    case_id = (payload.case_id or _new_case_id()).strip().upper()
    now = datetime.now(timezone.utc)
    lead_name = " ".join(
        part for part in [current_user.get("rank"), current_user.get("username")] if part
    )
    case_doc = {
        "case_id": case_id,
        "case_title": payload.case_title.strip(),
        "fir_number": payload.fir_number.strip(),
        "police_station": payload.police_station.strip(),
        "crime_type": payload.crime_type.strip(),
        "threat_level": payload.threat_level.strip().upper(),
        "ipc_sections": [section.strip() for section in payload.ipc_sections if section.strip()],
        "master_plot": payload.master_plot.strip(),
        "investigating_officer": lead_name or current_user["police_id"],
        "created_at": now,
        "updated_at": now,
        "last_synced": None,
        "sync_status": "PENDING INITIAL INGESTION",
        "priority_leads": [],
        "suspects": [],
        "victims": [],
        "witnesses": [],
        "vehicles": [],
        "phones": [],
        "weapons": [],
        "financial_transfers": [],
    }

    active_db["cases"].create_index("case_id", unique=True, name="cases_case_id_unique")
    try:
        active_db["cases"].insert_one(case_doc)
    except Exception as exc:
        if active_db["cases"].find_one({"case_id": case_id}, {"_id": 1}):
            raise HTTPException(status_code=409, detail=f"Case {case_id} already exists.") from exc
        raise HTTPException(status_code=500, detail=f"Unable to create case: {exc}") from exc

    try:
        assign_initial_lead(case_id, current_user["police_id"])
    except Exception as exc:
        # Do not leave a case that no investigator is authorised to operate.
        active_db["cases"].delete_one({"case_id": case_id})
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Unable to assign the case lead: {exc}") from exc

    return _case_payload(case_doc)
