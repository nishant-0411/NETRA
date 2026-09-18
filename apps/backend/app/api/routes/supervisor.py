"""Supervisor API Routes for NETRA.

Provides role-protected endpoints for station heads and supervisors to:
- View all station cases & unassigned cases
- Assign cases to officers in the same station
- Transfer cases between officers with reason tracking
- View officer workloads
- Access case assignment history & supervisor audit logs
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.routes.auth import get_current_supervisor
from app.services import supervisor_service


router = APIRouter(prefix="/supervisor", tags=["Supervisor Portal"])


class AssignCaseRequest(BaseModel):
    officer_police_id: str = Field(min_length=1, max_length=100)


class TransferCaseRequest(BaseModel):
    new_officer_police_id: str = Field(min_length=1, max_length=100)
    reason: Optional[str] = Field(default=None, max_length=1000)


@router.get("/cases", response_model=List[Dict[str, Any]])
def list_supervisor_cases(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    priority_filter: Optional[str] = Query(default=None, alias="priority"),
    officer_filter: Optional[str] = Query(default=None, alias="officer_id"),
    search: Optional[str] = Query(default=None),
    current_supervisor: dict = Depends(get_current_supervisor),
):
    """View all cases with current officer assignment, with filtering by status, priority, officer, and text search."""
    return supervisor_service.get_all_cases_supervisor(
        status_filter=status_filter,
        priority_filter=priority_filter,
        officer_filter=officer_filter,
        search=search,
    )


@router.get("/unassigned", response_model=List[Dict[str, Any]])
def list_unassigned_cases(
    current_supervisor: dict = Depends(get_current_supervisor),
):
    """View all unassigned cases requiring investigator allocation."""
    return supervisor_service.get_all_cases_supervisor(status_filter="UNASSIGNED")


@router.get("/officers", response_model=List[Dict[str, Any]])
def list_station_officers(
    department: Optional[str] = None,
    current_supervisor: dict = Depends(get_current_supervisor),
):
    """View complete list of officers in the station along with active/pending/completed case workloads."""
    dept = department or current_supervisor.get("department")
    return supervisor_service.get_station_officers_workload(department=dept)


@router.post("/cases/{case_id}/assign")
def assign_case(
    case_id: str,
    payload: AssignCaseRequest,
    current_supervisor: dict = Depends(get_current_supervisor),
):
    """Assign an unassigned case (or existing case) to an officer in the police station."""
    return supervisor_service.assign_case_to_officer(
        case_id=case_id,
        target_police_id=payload.officer_police_id.strip(),
        supervisor=current_supervisor,
    )


@router.post("/cases/{case_id}/transfer")
def transfer_case(
    case_id: str,
    payload: TransferCaseRequest,
    current_supervisor: dict = Depends(get_current_supervisor),
):
    """Transfer an assigned case from one officer to another officer in the police station."""
    return supervisor_service.transfer_case(
        case_id=case_id,
        new_police_id=payload.new_officer_police_id.strip(),
        supervisor=current_supervisor,
        reason=payload.reason.strip() if payload.reason else None,
    )


@router.get("/history")
def get_assignment_history(
    case_id: Optional[str] = None,
    current_supervisor: dict = Depends(get_current_supervisor),
):
    """View case assignment and transfer history timeline with timestamps and officers involved."""
    return supervisor_service.get_assignment_history(case_id=case_id)


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 100,
    current_supervisor: dict = Depends(get_current_supervisor),
):
    """View supervisor audit log entries for all supervisor actions."""
    return supervisor_service.get_supervisor_audit_logs(limit=limit)
