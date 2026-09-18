from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

# pyrefly: ignore [missing-import]
from app.api.routes.auth import get_current_user
# pyrefly: ignore [missing-import]
from app.services.case_access_service import require_case_access
# pyrefly: ignore [missing-import]
from app.services.rag_service import CaseRagService

router = APIRouter(
    prefix="/copilot",
    tags=["Copilot"],
)


class ChatRequest(BaseModel):
    question: str
    case_id: str


@router.post("/chat")
def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    try:
        require_case_access(request.case_id, current_user["police_id"])
        return CaseRagService.answer(request.case_id, request.question)
    except HTTPException:
        raise
    except Exception as exc:
        err_msg = str(exc)
        return {
            "answer": f"**Copilot Warning**: Case retrieval encountered: *{err_msg}*.",
            "error": err_msg,
            "is_fallback": True,
        }
