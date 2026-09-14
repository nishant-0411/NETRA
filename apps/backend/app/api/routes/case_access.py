"""Lead-investigator workflow for granting case graph access."""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.auth import get_current_user
from app.services.case_access_service import (
    case_access,
    access_requests,
    assign_initial_lead,
    get_case_access,
    officer_summary,
    request_access,
    require_case_lead,
    transfer_lead,
)


router = APIRouter(prefix="/case-access", tags=["Case Access"])


class LeadAssignmentRequest(BaseModel):
    police_id: str = Field(min_length=1, max_length=100)


class AccessRequestCreate(BaseModel):
    message: str | None = Field(default=None, max_length=500)


class AccessRequestDecision(BaseModel):
    approve: bool


def _access_summary(access: dict, viewer_police_id: str) -> dict:
    lead_id = access["lead_investigator_police_id"]
    return {
        "case_id": access["case_id"],
        "lead_investigator": officer_summary(lead_id) or {"police_id": lead_id},
        "has_access": viewer_police_id in access.get("police_ids", []),
        "is_lead": viewer_police_id == lead_id,
        "authorised_personnel_count": len(access.get("police_ids", [])),
    }


@router.get("/{case_id}")
def case_access_summary(case_id: str, current_user: dict = Depends(get_current_user)):
    """Any signed-in officer can see who leads a case, but not its graph data."""
    access = get_case_access(case_id)
    if not access:
        raise HTTPException(status_code=404, detail="Case access has not been configured.")
    return _access_summary(access, current_user["police_id"])


@router.get("/lead/workload")
def lead_workload(current_user: dict = Depends(get_current_user)):
    """Show a lead how many investigators are assigned across their cases."""
    lead_id = current_user["police_id"]
    cases = []
    unique_collaborator_ids = set()

    for access in case_access.find(
        {"lead_investigator_police_id": lead_id},
        {"_id": 0, "case_id": 1, "police_ids": 1},
    ).sort("case_id", 1):
        personnel_ids = access.get("police_ids", [])
        collaborator_ids = [police_id for police_id in personnel_ids if police_id != lead_id]
        unique_collaborator_ids.update(collaborator_ids)
        cases.append(
            {
                "case_id": access["case_id"],
                "working_personnel_count": len(personnel_ids),
                "collaborator_count": len(collaborator_ids),
            }
        )

    return {
        "lead_police_id": lead_id,
        "lead_case_count": len(cases),
        "unique_collaborator_count": len(unique_collaborator_ids),
        "cases": cases,
    }


@router.post("/{case_id}/lead", status_code=status.HTTP_201_CREATED)
def assign_case_lead(
    case_id: str,
    payload: LeadAssignmentRequest,
    current_user: dict = Depends(get_current_user),
):
    """Claim an unassigned case or transfer leadership as the present lead."""
    target_police_id = payload.police_id.strip()
    existing = get_case_access(case_id)
    if existing is None:
        if target_police_id != current_user["police_id"]:
            raise HTTPException(
                status_code=403,
                detail="Only an investigator may claim themselves as lead for an unassigned case.",
            )
        access = assign_initial_lead(case_id, target_police_id)
    else:
        access = transfer_lead(case_id, current_user["police_id"], target_police_id)
    return _access_summary(access, current_user["police_id"])


@router.post("/{case_id}/requests", status_code=status.HTTP_201_CREATED)
def create_access_request(
    case_id: str,
    payload: AccessRequestCreate,
    current_user: dict = Depends(get_current_user),
):
    """Request access from the designated lead investigator."""
    return request_access(case_id, current_user["police_id"], payload.message)


@router.get("/{case_id}/requests")
def list_access_requests(case_id: str, current_user: dict = Depends(get_current_user)):
    """Only the case lead can inspect the pending access queue."""
    require_case_lead(case_id, current_user["police_id"])
    requests = []
    for request in access_requests.find(
        {"case_id": case_id, "status": "pending"},
        {"case_id": 1, "requester_police_id": 1, "message": 1, "created_at": 1},
    ).sort("created_at", 1):
        requester_id = request["requester_police_id"]
        requests.append(
            {
                "id": str(request["_id"]),
                "case_id": request["case_id"],
                "requester": officer_summary(requester_id) or {"police_id": requester_id},
                "message": request.get("message"),
                "created_at": request["created_at"],
            }
        )
    return {"case_id": case_id, "requests": requests}


@router.post("/{case_id}/requests/{request_id}/decision")
def decide_access_request(
    case_id: str,
    request_id: str,
    payload: AccessRequestDecision,
    current_user: dict = Depends(get_current_user),
):
    """Approve or reject a pending request; approvals grant graph access."""
    require_case_lead(case_id, current_user["police_id"])
    try:
        request_object_id = ObjectId(request_id)
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Invalid access request ID.") from exc

    request = access_requests.find_one(
        {"_id": request_object_id, "case_id": case_id, "status": "pending"}
    )
    if not request:
        raise HTTPException(status_code=404, detail="Pending access request not found.")

    now = datetime.now(timezone.utc)
    decision = "approved" if payload.approve else "rejected"
    if payload.approve:
        # `$addToSet` keeps the case's police-ID list free from duplicates.
        from app.services.case_access_service import case_access

        case_access.update_one(
            {"case_id": case_id},
            {
                "$addToSet": {"police_ids": request["requester_police_id"]},
                "$set": {"updated_at": now},
            },
        )

    access_requests.update_one(
        {"_id": request_object_id, "status": "pending"},
        {
            "$set": {
                "status": decision,
                "decided_by_police_id": current_user["police_id"],
                "decided_at": now,
                "updated_at": now,
            }
        },
    )
    return {
        "case_id": case_id,
        "request_id": request_id,
        "status": decision,
        "police_id": request["requester_police_id"],
    }


@router.delete("/{case_id}/personnel/{police_id}")
def revoke_case_access(
    case_id: str,
    police_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove a collaborator's graph access; case leads cannot revoke themselves."""
    access = require_case_lead(case_id, current_user["police_id"])
    lead_id = access["lead_investigator_police_id"]
    if police_id == lead_id:
        raise HTTPException(
            status_code=409,
            detail="Transfer case leadership before revoking the current lead's access.",
        )
    if police_id not in access.get("police_ids", []):
        raise HTTPException(status_code=404, detail="This officer does not have case access.")

    case_access.update_one(
        {"case_id": case_id},
        {
            "$pull": {"police_ids": police_id},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    return {"case_id": case_id, "revoked_police_id": police_id, "status": "revoked"}
