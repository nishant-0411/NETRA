"""Case-level access control backed by MongoDB.

`case_access` is deliberately the only source of truth for membership.  A
single document maps a case to its lead investigator and authorised police
IDs; a user's accessible cases are derived from that map rather than stored a
second time in the user document.
"""

from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.db.mongodb import active_db


case_access = active_db["case_access"]
access_requests = active_db["case_access_requests"]
users = active_db["users"]


@lru_cache(maxsize=1)
def ensure_access_indexes() -> None:
    """Create indexes once per application process."""
    case_access.create_index("case_id", unique=True, name="case_access_case_id_unique")
    case_access.create_index("police_ids", name="case_access_police_ids")
    access_requests.create_index(
        [("case_id", 1), ("requester_police_id", 1)],
        unique=True,
        partialFilterExpression={"status": "pending"},
        name="one_pending_request_per_case_and_officer",
    )
    access_requests.create_index(
        [("case_id", 1), ("status", 1)], name="case_access_request_queue"
    )


def accessible_case_ids(police_id: str) -> List[str]:
    ensure_access_indexes()
    if not police_id:
        return []

    # Supervisors have oversight of all station cases
    user = users.find_one({"police_id": police_id}, {"role": 1})
    if user and user.get("role") == "supervisor":
        return sorted([row["case_id"] for row in active_db["cases"].find({}, {"_id": 0, "case_id": 1})])

    # 1. From case_access collection
    access_cursor = case_access.find(
        {"$or": [{"police_ids": police_id}, {"lead_investigator_police_id": police_id}]},
        {"_id": 0, "case_id": 1}
    )
    access_ids = [row["case_id"] for row in access_cursor]

    # 2. From cases collection
    cases_cursor = active_db["cases"].find(
        {"assigned_officer_police_id": police_id},
        {"_id": 0, "case_id": 1}
    )
    case_ids = [row["case_id"] for row in cases_cursor]

    return sorted(list(set(access_ids + case_ids)))


def get_case_access(case_id: str) -> Optional[Dict[str, Any]]:
    ensure_access_indexes()
    return case_access.find_one({"case_id": case_id})


def require_case_access(case_id: str, police_id: str) -> Dict[str, Any]:
    access = get_case_access(case_id)
    case_doc = active_db["cases"].find_one({"case_id": case_id}, {"_id": 0, "assigned_officer_police_id": 1})
    assigned_id = case_doc.get("assigned_officer_police_id") if case_doc else None

    allowed_ids = access.get("police_ids", []) if access else []
    lead_id = access.get("lead_investigator_police_id") if access else None

    if police_id not in allowed_ids and police_id != lead_id and police_id != assigned_id:
        user = users.find_one({"police_id": police_id}, {"role": 1})
        if not user or user.get("role") != "supervisor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this case graph.",
            )
    return access or {}


def require_case_lead(case_id: str, police_id: str) -> Dict[str, Any]:
    access = get_case_access(case_id)
    if not access:
        raise HTTPException(status_code=404, detail="Case access has not been configured.")
    if access.get("lead_investigator_police_id") != police_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the lead investigator can manage this case's access.",
        )
    return access


def officer_summary(police_id: str) -> Optional[Dict[str, str]]:
    officer = users.find_one(
        {"police_id": police_id},
        {"_id": 0, "police_id": 1, "username": 1, "rank": 1, "department": 1},
    )
    return officer


def assign_initial_lead(case_id: str, police_id: str) -> Dict[str, Any]:
    """Atomically claim an unconfigured case; only the caller may claim it."""
    ensure_access_indexes()
    now = datetime.now(timezone.utc)
    try:
        case_access.insert_one(
            {
                "case_id": case_id,
                "lead_investigator_police_id": police_id,
                "police_ids": [police_id],
                "created_at": now,
                "updated_at": now,
            }
        )
    except DuplicateKeyError as exc:
        # Duplicate-key is deliberately translated without relying on a
        # pymongo-specific exception so this remains simple to test.
        if get_case_access(case_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This case already has a lead investigator.",
            ) from exc
        raise
    return get_case_access(case_id)


def transfer_lead(case_id: str, current_lead_id: str, new_lead_id: str) -> Dict[str, Any]:
    require_case_lead(case_id, current_lead_id)
    if not officer_summary(new_lead_id):
        raise HTTPException(status_code=404, detail="The requested police ID was not found.")

    now = datetime.now(timezone.utc)
    case_access.update_one(
        {"case_id": case_id},
        {
            "$set": {
                "lead_investigator_police_id": new_lead_id,
                "updated_at": now,
            },
            "$addToSet": {"police_ids": new_lead_id},
        },
    )
    return get_case_access(case_id)


def request_access(case_id: str, requester_police_id: str, message: Optional[str]) -> Dict[str, Any]:
    access = get_case_access(case_id)
    if not access:
        raise HTTPException(status_code=404, detail="Case access has not been configured.")
    if requester_police_id in access.get("police_ids", []):
        raise HTTPException(status_code=409, detail="You already have access to this case.")

    now = datetime.now(timezone.utc)
    request = {
        "case_id": case_id,
        "requester_police_id": requester_police_id,
        "message": (message or "").strip() or None,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = access_requests.insert_one(request)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a pending request for this case.",
        ) from exc
    request["id"] = str(result.inserted_id)
    request.pop("_id", None)
    return request
