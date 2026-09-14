from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import json
from pathlib import Path
from app.db.mongodb import active_db

router = APIRouter(
    prefix="/cases",
    tags=["Cases"],
)

def _load_fallback_cases() -> List[Dict[str, Any]]:
    """Loads cases from local casesData.json fallback file if MongoDB collection is empty."""
    try:
        # Search upward for casesData.json
        curr = Path(__file__).resolve()
        for parent in [curr, *curr.parents]:
            candidate = parent / "apps" / "frontend" / "src" / "data" / "casesData.json"
            if candidate.exists():
                with open(candidate, "r", encoding="utf-8") as f:
                    return json.load(f)
    except Exception as exc:
        print(f"Fallback cases load error: {exc}")
    return []

@router.get("", response_model=List[Dict[str, Any]])
@router.get("/", response_model=List[Dict[str, Any]])
async def list_cases():
    """
    Returns list of all active investigation cases from MongoDB or fallback dataset.
    """
    try:
        if active_db is not None:
            db_cases = list(active_db["cases"].find({}, {"_id": 0}))
            if db_cases:
                return db_cases
    except Exception:
        pass
    
    return _load_fallback_cases()

@router.get("/{case_id}")
async def get_case(case_id: str):
    """
    Get detailed case dossier by case_id.
    """
    try:
        if active_db is not None:
            case_doc = active_db["cases"].find_one({"case_id": case_id}, {"_id": 0})
            if case_doc:
                return case_doc
    except Exception:
        pass
    
    cases = _load_fallback_cases()
    for case_item in cases:
        if case_item.get("case_id") == case_id:
            return case_item
            
    raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
