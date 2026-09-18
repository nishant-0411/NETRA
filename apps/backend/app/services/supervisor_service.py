"""Supervisor Service for NETRA.

Handles case assignment, case transfer, officer workload tracking,
assignment history recording, and audit logging for Station Heads and Supervisors.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.db.mongodb import active_db
from app.services.case_access_service import (
    case_access,
    get_case_access,
    officer_summary,
    transfer_lead,
)

cases_col = active_db["cases"]
users_col = active_db["users"]
history_col = active_db["case_assignment_history"]
audit_col = active_db["supervisor_audit_logs"]


def ensure_supervisor_indexes() -> None:
    history_col.create_index([("case_id", 1), ("created_at", -1)], name="history_by_case")
    audit_col.create_index([("created_at", -1)], name="audit_by_date")


def log_supervisor_action(
    supervisor: Dict[str, Any],
    action: str,
    target_case_id: Optional[str] = None,
    previous_officer: Optional[str] = None,
    new_officer: Optional[str] = None,
    details: Optional[str] = None,
) -> Dict[str, Any]:
    """Store an immutable audit log entry for supervisor actions."""
    ensure_supervisor_indexes()
    now = datetime.now(timezone.utc)
    entry = {
        "supervisor_police_id": supervisor.get("police_id"),
        "supervisor_name": supervisor.get("username"),
        "supervisor_rank": supervisor.get("rank"),
        "action": action,
        "target_case_id": target_case_id,
        "previous_officer_police_id": previous_officer,
        "new_officer_police_id": new_officer,
        "details": details or "",
        "created_at": now,
    }
    result = audit_col.insert_one(entry)
    entry["_id"] = str(result.inserted_id)
    return entry


def record_history(
    case_id: str,
    action: str,
    performed_by: Dict[str, Any],
    previous_officer_id: Optional[str] = None,
    new_officer_id: Optional[str] = None,
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    """Record case assignment and transfer events."""
    ensure_supervisor_indexes()
    now = datetime.now(timezone.utc)
    prev_summary = officer_summary(previous_officer_id) if previous_officer_id else None
    new_summary = officer_summary(new_officer_id) if new_officer_id else None

    item = {
        "case_id": case_id,
        "action": action,  # ASSIGNED | TRANSFERRED | REASSIGNED
        "performed_by_police_id": performed_by.get("police_id"),
        "performed_by_name": f"{performed_by.get('rank', '')} {performed_by.get('username', '')}".strip(),
        "previous_officer": prev_summary or ({"police_id": previous_officer_id} if previous_officer_id else None),
        "new_officer": new_summary or ({"police_id": new_officer_id} if new_officer_id else None),
        "reason": reason or "",
        "created_at": now,
    }
    result = history_col.insert_one(item)
    item["_id"] = str(result.inserted_id)
    return item


def assign_case_to_officer(
    case_id: str,
    target_police_id: str,
    supervisor: Dict[str, Any],
) -> Dict[str, Any]:
    """Assign an unassigned or existing case to an officer."""
    case_doc = cases_col.find_one({"case_id": case_id})
    if not case_doc:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")

    target_officer = users_col.find_one({"police_id": target_police_id})
    if not target_officer:
        raise HTTPException(status_code=404, detail=f"Officer with Police ID {target_police_id} not found.")

    previous_lead = None
    access = get_case_access(case_id)
    if access:
        previous_lead = access.get("lead_investigator_police_id")

    officer_display_name = f"{target_officer.get('rank', '')} {target_officer.get('username', '')}".strip()
    now = datetime.now(timezone.utc)

    # 1. Update case status & assigned officer
    cases_col.update_one(
        {"case_id": case_id},
        {
            "$set": {
                "assigned_officer_police_id": target_police_id,
                "assigned_officer_name": officer_display_name,
                "investigating_officer": officer_display_name,
                "status": "ACTIVE",
                "updated_at": now,
            }
        },
    )

    # 2. Update case_access collection
    if not access:
        case_access.insert_one(
            {
                "case_id": case_id,
                "lead_investigator_police_id": target_police_id,
                "police_ids": [target_police_id],
                "created_at": now,
                "updated_at": now,
            }
        )
    else:
        case_access.update_one(
            {"case_id": case_id},
            {
                "$set": {
                    "lead_investigator_police_id": target_police_id,
                    "updated_at": now,
                },
                "$addToSet": {"police_ids": target_police_id},
            },
        )

    # 3. Record history & audit log
    action_type = "TRANSFERRED" if previous_lead and previous_lead != target_police_id else "ASSIGNED"
    record_history(
        case_id=case_id,
        action=action_type,
        performed_by=supervisor,
        previous_officer_id=previous_lead,
        new_officer_id=target_police_id,
        reason=f"Case {action_type.lower()} by supervisor {supervisor.get('username')}",
    )

    log_supervisor_action(
        supervisor=supervisor,
        action=action_type,
        target_case_id=case_id,
        previous_officer=previous_lead,
        new_officer=target_police_id,
        details=f"Case {case_id} {action_type.lower()} to officer {target_police_id} ({officer_display_name}).",
    )

    updated_case = cases_col.find_one({"case_id": case_id}, {"_id": 0})
    return updated_case


def transfer_case(
    case_id: str,
    new_police_id: str,
    supervisor: Dict[str, Any],
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    """Transfer an assigned case from current officer to a new officer."""
    case_doc = cases_col.find_one({"case_id": case_id})
    if not case_doc:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")

    new_officer = users_col.find_one({"police_id": new_police_id})
    if not new_officer:
        raise HTTPException(status_code=404, detail=f"Officer with Police ID {new_police_id} not found.")

    access = get_case_access(case_id)
    previous_lead = access.get("lead_investigator_police_id") if access else case_doc.get("assigned_officer_police_id")

    if previous_lead == new_police_id:
        raise HTTPException(status_code=409, detail=f"Case {case_id} is already assigned to officer {new_police_id}.")

    officer_display_name = f"{new_officer.get('rank', '')} {new_officer.get('username', '')}".strip()
    now = datetime.now(timezone.utc)

    # Update cases doc
    cases_col.update_one(
        {"case_id": case_id},
        {
            "$set": {
                "assigned_officer_police_id": new_police_id,
                "assigned_officer_name": officer_display_name,
                "investigating_officer": officer_display_name,
                "status": "ACTIVE",
                "updated_at": now,
            }
        },
    )

    # Update case_access doc
    if not access:
        case_access.insert_one(
            {
                "case_id": case_id,
                "lead_investigator_police_id": new_police_id,
                "police_ids": [new_police_id],
                "created_at": now,
                "updated_at": now,
            }
        )
    else:
        case_access.update_one(
            {"case_id": case_id},
            {
                "$set": {
                    "lead_investigator_police_id": new_police_id,
                    "updated_at": now,
                },
                "$addToSet": {"police_ids": new_police_id},
            },
        )

    # Record history & audit
    record_history(
        case_id=case_id,
        action="TRANSFERRED",
        performed_by=supervisor,
        previous_officer_id=previous_lead,
        new_officer_id=new_police_id,
        reason=reason or "Case transferred by station supervisor.",
    )

    log_supervisor_action(
        supervisor=supervisor,
        action="CASE_TRANSFERRED",
        target_case_id=case_id,
        previous_officer=previous_lead,
        new_officer=new_police_id,
        details=f"Transferred case {case_id} from {previous_lead or 'unassigned'} to {new_police_id}. Reason: {reason or 'None'}",
    )

    return cases_col.find_one({"case_id": case_id}, {"_id": 0})


def get_station_officers_workload(department: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return all officers in the station with their current workload stats."""
    query = {}
    if department:
        query["department"] = department

    all_users = list(users_col.find(query, {"password_hash": 0}))
    all_cases = list(cases_col.find({}, {"_id": 0, "case_id": 1, "status": 1, "assigned_officer_police_id": 1, "police_station": 1}))

    # Map case access leads
    access_docs = list(case_access.find({}, {"_id": 0, "case_id": 1, "lead_investigator_police_id": 1}))
    lead_map = {doc["case_id"]: doc.get("lead_investigator_police_id") for doc in access_docs}

    officers = []
    for user in all_users:
        pid = user.get("police_id", "")
        if not pid:
            continue

        assigned = []
        active_count = 0
        pending_count = 0
        completed_count = 0

        for c in all_cases:
            case_id = c.get("case_id")
            case_lead = lead_map.get(case_id) or c.get("assigned_officer_police_id")
            if case_lead == pid:
                assigned.append(case_id)
                st = (c.get("status") or "ACTIVE").upper()
                if st in ["ACTIVE", "OPEN", "RUNNING"]:
                    active_count += 1
                elif st in ["PENDING", "UNASSIGNED"]:
                    pending_count += 1
                elif st in ["COMPLETED", "CLOSED"]:
                    completed_count += 1
                else:
                    active_count += 1

        officers.append({
            "id": str(user["_id"]),
            "username": user.get("username"),
            "email": user.get("email"),
            "police_id": pid,
            "rank": user.get("rank", "Constable"),
            "state": user.get("state", ""),
            "department": user.get("department", ""),
            "role": user.get("role", "investigator"),
            "active_cases_count": active_count,
            "pending_cases_count": pending_count,
            "completed_cases_count": completed_count,
            "total_assigned_cases": len(assigned),
            "assigned_case_ids": assigned,
        })

    return officers


def get_all_cases_supervisor(
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    officer_filter: Optional[str] = None,
    search: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Return all cases with computed status, lead officer info, and support filtering."""
    all_cases = list(cases_col.find({}, {"_id": 0}))
    access_docs = list(case_access.find({}, {"_id": 0}))
    access_map = {doc["case_id"]: doc for doc in access_docs}

    result = []
    for case_doc in all_cases:
        case_id = case_doc["case_id"]
        acc = access_map.get(case_id)
        lead_id = acc.get("lead_investigator_police_id") if acc else case_doc.get("assigned_officer_police_id")

        assigned_officer = officer_summary(lead_id) if lead_id else None
        case_status = case_doc.get("status")
        if not case_status:
            case_status = "ACTIVE" if lead_id else "UNASSIGNED"

        case_item = {
            **case_doc,
            "status": case_status,
            "assigned_officer_police_id": lead_id,
            "assigned_officer": assigned_officer,
            "lead_investigator": assigned_officer or ({"police_id": lead_id} if lead_id else None),
            "authorised_personnel_count": len(acc.get("police_ids", [])) if acc else 0,
        }

        # Apply Filters
        if status_filter:
            sf = status_filter.upper()
            if sf == "UNASSIGNED" and lead_id:
                continue
            elif sf == "ASSIGNED" and not lead_id:
                continue
            elif sf not in ["UNASSIGNED", "ASSIGNED"] and case_status.upper() != sf:
                continue

        if priority_filter and case_doc.get("threat_level", "").upper() != priority_filter.upper():
            continue

        if officer_filter:
            if officer_filter == "unassigned" and lead_id:
                continue
            elif officer_filter != "unassigned" and lead_id != officer_filter:
                continue

        if search:
            q = search.lower()
            title = case_doc.get("case_title", "").lower()
            fir = case_doc.get("fir_number", "").lower()
            cid = case_id.lower()
            station = case_doc.get("police_station", "").lower()
            officer_name = (assigned_officer.get("username", "") if assigned_officer else "").lower()
            if not (q in title or q in fir or q in cid or q in station or q in officer_name):
                continue

        result.append(case_item)

    return result


def get_assignment_history(case_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return case assignment/transfer timeline history."""
    query = {}
    if case_id:
        query["case_id"] = case_id
    records = list(history_col.find(query, {"_id": 0}).sort("created_at", -1))
    return records


def get_supervisor_audit_logs(limit: int = 100) -> List[Dict[str, Any]]:
    """Return supervisor action audit logs."""
    logs = list(audit_col.find({}, {"_id": 0}).sort("created_at", -1).limit(limit))
    return logs
