"""Case-scoped hybrid retrieval for the NETRA Copilot."""

from __future__ import annotations

import logging
from typing import Any

from app.db.mongodb import active_db
from app.services.graph_service import driver
from app.services.vector_store import CaseVectorStore, VectorStoreError
from etl.pipelines.utils import get_langchain_llm

logger = logging.getLogger(__name__)


class CaseRagService:
    """Answer from the active case's evidence and Neo4j relationships only."""

    @staticmethod
    def _case_summary(case: dict[str, Any]) -> str:
        return "\n".join(
            value for value in [
                f"Case: {case.get('case_id')} — {case.get('case_title', '')}",
                f"FIR: {case.get('fir_number', 'not recorded')}",
                f"Crime type: {case.get('crime_type', 'not recorded')}",
                f"Threat level: {case.get('threat_level', 'not recorded')}",
                f"Lead investigator: {case.get('investigating_officer', 'not recorded')}",
                f"Case summary: {case.get('master_plot', '')}",
            ] if value.strip()
        )

    @staticmethod
    def _graph_context(case_id: str) -> str:
        query = """
        MATCH (:Case {case_id: $case_id})-[:HAS_DOCUMENT]->(:Document)-[:MENTIONS]->(entity)
        OPTIONAL MATCH (entity)-[relationship]-(related)
        WHERE EXISTS {
            MATCH (:Case {case_id: $case_id})-[:HAS_DOCUMENT]->(:Document)-[:MENTIONS]->(related)
        }
        RETURN coalesce(entity.name, entity.value, entity.phone_number, entity.registration_number,
                        entity.account_number, elementId(entity)) AS source,
               type(relationship) AS relationship,
               coalesce(related.name, related.value, related.phone_number, related.registration_number,
                        related.account_number, elementId(related)) AS target
        LIMIT 40
        """
        try:
            with driver.session() as session:
                rows = list(session.run(query, case_id=case_id))
            return "\n".join(
                f"{row['source']} — {row['relationship']} — {row['target']}"
                for row in rows if row["relationship"]
            ) or "No direct entity-to-entity relationships are recorded yet."
        except Exception as exc:
            logger.warning("[Copilot] Graph retrieval failed for %s: %s", case_id, exc)
            return "Graph relationships are temporarily unavailable."

    @classmethod
    def answer(cls, case_id: str, question: str) -> dict[str, Any]:
        case = active_db["cases"].find_one({"case_id": case_id}, {"_id": 0})
        if not case:
            raise ValueError(f"Case {case_id} was not found.")

        chunks: list[dict[str, Any]] = []
        retrieval_error = None
        try:
            # Older uploads are embedded on their first Copilot request.
            CaseVectorStore.ensure_case_index(case_id)
            chunks = CaseVectorStore.search(case_id, question, limit=5)
        except VectorStoreError as exc:
            retrieval_error = str(exc)
            logger.warning("[Copilot] Evidence-vector retrieval failed for %s: %s", case_id, exc)

        evidence_context = "\n\n".join(
            f"Evidence: {chunk['filename']} (relevance {chunk['score']:.2f})\n{chunk['content']}"
            for chunk in chunks
        ) or "No semantically matching evidence chunk was retrieved."
        case_context = cls._case_summary(case)
        graph_context = cls._graph_context(case_id)

        fallback_answer = (
            f"**{case.get('case_title') or case_id}**\n\n{case_context}\n\n"
            f"Evidence retrieval: {len(chunks)} relevant chunk(s). "
            "Ask about a person, vehicle, phone, account, or a specific document for a more focused answer."
        )
        llm = get_langchain_llm()
        if not llm:
            return {"answer": fallback_answer, "case_id": case_id, "sources": chunks, "is_fallback": True}

        prompt = f"""You are NETRA Copilot for a criminal-investigation platform.
Answer only from the case-scoped material below. If the material does not support a claim, say that it is not established. Be concise and cite evidence filenames when they support the answer.

CASE DETAILS:
{case_context}

NEO4J CASE RELATIONSHIPS:
{graph_context}

RETRIEVED EVIDENCE:
{evidence_context}

QUESTION: {question}
"""
        try:
            answer = str(llm.invoke(prompt)).strip()
            return {
                "answer": answer or fallback_answer,
                "case_id": case_id,
                "sources": [{key: chunk[key] for key in ("document_id", "filename", "score")} for chunk in chunks],
                "retrieval_warning": retrieval_error,
            }
        except Exception as exc:
            logger.warning("[Copilot] LLM synthesis failed for %s: %s", case_id, exc)
            return {
                "answer": fallback_answer,
                "case_id": case_id,
                "sources": chunks,
                "is_fallback": True,
                "retrieval_warning": retrieval_error or str(exc),
            }
