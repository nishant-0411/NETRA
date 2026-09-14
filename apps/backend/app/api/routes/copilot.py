from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai.graph.graph_chatbot import GraphChatbot

router = APIRouter(
    prefix="/copilot",
    tags=["Copilot"],
)


class ChatRequest(BaseModel):
    question: str
    case_id: Optional[str] = None


_chatbot_instance = None

def get_chatbot():
    global _chatbot_instance
    if _chatbot_instance is None:
        try:
            _chatbot_instance = GraphChatbot()
        except Exception as exc:
            print(f"GraphChatbot init warning: {exc}")
    return _chatbot_instance


@router.post("/chat")
def chat(request: ChatRequest):
    try:
        cb = get_chatbot()
        if cb is not None:
            answer = cb.answer(request.question)
            return {
                "answer": answer,
                "case_id": request.case_id,
            }
        else:
            raise RuntimeError("GraphChatbot instance unavailable.")

    except Exception as exc:
        err_msg = str(exc)
        return {
            "answer": f"**Copilot Warning**: Tactical database or graph LLM service connection active but encountered: *{err_msg}*.",
            "error": err_msg,
            "is_fallback": True,
        }