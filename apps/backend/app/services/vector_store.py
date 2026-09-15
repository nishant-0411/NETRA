"""Persistent, case-scoped document embeddings backed by MongoDB.

Vectors are generated through Ollama's embedding API and stored in
``netra_active.document_chunks``. Retrieval is deliberately filtered by
``case_id`` before cosine similarity is calculated, so a copilot request cannot
retrieve another investigation's evidence.

MongoDB's normal indexes are used for the case/document lookup. Similarity is
calculated in-process because the repository does not yet provision a MongoDB
Atlas Vector Search index. This is appropriate for the current small case
corpus; replace ``search`` with ``$vectorSearch`` once that index exists.
"""

from __future__ import annotations

import json
import math
import os
import re
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from app.db.mongodb import active_db


DEFAULT_EMBEDDING_MODEL = "nomic-embed-text"
CHUNK_SIZE = 1_200
CHUNK_OVERLAP = 200
MAX_SEARCH_CANDIDATES = 500


class VectorStoreError(RuntimeError):
    """Raised when an embedding request or vector payload is invalid."""


@lru_cache(maxsize=1)
def ensure_vector_indexes() -> None:
    collection = active_db["document_chunks"]
    collection.create_index(
        [("case_id", 1), ("embedding_model", 1), ("document_id", 1), ("chunk_index", 1)],
        unique=True,
        name="case_document_chunk_unique",
    )
    collection.create_index(
        [("case_id", 1), ("embedding_model", 1)],
        name="case_embedding_lookup",
    )


def embedding_model() -> str:
    return os.getenv("OLLAMA_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL).strip()


def _ollama_base_url() -> str:
    return os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")


def _ollama_post(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    request = Request(
        f"{_ollama_base_url()}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise VectorStoreError(f"Ollama embedding request failed with HTTP {exc.code}.") from exc
    except Exception as exc:
        raise VectorStoreError(f"Ollama embedding request failed: {exc}") from exc


def embed_texts(texts: list[str], model: str | None = None) -> list[list[float]]:
    """Embed a batch, supporting both current and older Ollama APIs."""
    if not texts:
        return []
    model = model or embedding_model()
    try:
        response = _ollama_post("/api/embed", {"model": model, "input": texts})
        embeddings = response.get("embeddings")
        if isinstance(embeddings, list) and len(embeddings) == len(texts):
            return [[float(value) for value in embedding] for embedding in embeddings]
    except VectorStoreError:
        # Older Ollama installs expose one prompt at a time at /api/embeddings.
        pass

    embeddings: list[list[float]] = []
    for text in texts:
        response = _ollama_post("/api/embeddings", {"model": model, "prompt": text})
        embedding = response.get("embedding")
        if not isinstance(embedding, list):
            raise VectorStoreError("Ollama did not return an embedding vector.")
        embeddings.append([float(value) for value in embedding])
    return embeddings


def chunk_text(text: str) -> list[str]:
    """Split evidence into readable, overlapping character chunks."""
    normalized = re.sub(r"\s+", " ", text or "").strip()
    if not normalized:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        end = min(len(normalized), start + CHUNK_SIZE)
        if end < len(normalized):
            boundary = normalized.rfind(" ", start, end)
            if boundary > start + (CHUNK_SIZE // 2):
                end = boundary
        chunks.append(normalized[start:end].strip())
        if end == len(normalized):
            break
        start = max(end - CHUNK_OVERLAP, start + 1)
    return chunks


def processed_document_text(document: dict[str, Any]) -> str:
    """Prefer extracted source text and retain structured ETL evidence."""
    data = document.get("data") or {}
    document_text = str(data.get("document_text") or "").strip()
    structured_data = json.dumps(
        {
            "filename": document.get("filename"),
            "document_type": document.get("document_type"),
            "extracted_entities": data.get("extracted_entities", []),
            "database_intelligence": data.get("database_intelligence", []),
            "summary": data.get("summary", {}),
        },
        default=str,
        ensure_ascii=False,
    )
    return f"{document_text}\n\nStructured extraction:\n{structured_data}".strip()


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        return -1.0
    dot_product = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return -1.0
    return dot_product / (left_norm * right_norm)


class CaseVectorStore:
    """Create and retrieve embeddings for evidence belonging to one case."""

    @classmethod
    def index_processed_document(cls, document: dict[str, Any]) -> int:
        case_id = str(document.get("case_id") or "").strip()
        document_id = str(document.get("document_id") or "").strip()
        if not case_id or not document_id:
            raise VectorStoreError("A processed document needs case_id and document_id for indexing.")

        text_chunks = chunk_text(processed_document_text(document))
        if not text_chunks:
            return 0

        model = embedding_model()
        vectors = embed_texts(text_chunks, model)
        if len(vectors) != len(text_chunks):
            raise VectorStoreError("The embedding provider returned an unexpected number of vectors.")

        ensure_vector_indexes()
        collection = active_db["document_chunks"]
        now = datetime.now(timezone.utc)
        collection.delete_many(
            {"case_id": case_id, "document_id": document_id, "embedding_model": model}
        )
        records = [
            {
                "case_id": case_id,
                "document_id": document_id,
                "filename": document.get("filename") or document_id,
                "document_type": document.get("document_type"),
                "chunk_index": index,
                "content": chunk,
                "embedding": vector,
                "embedding_model": model,
                "created_at": now,
            }
            for index, (chunk, vector) in enumerate(zip(text_chunks, vectors))
        ]
        collection.insert_many(records, ordered=True)
        return len(records)

    @classmethod
    def ensure_case_index(cls, case_id: str) -> int:
        """Backfill vectors for older processed documents on their first chat."""
        model = embedding_model()
        indexed = 0
        for document in active_db["processed_documents"].find({"case_id": case_id}):
            exists = active_db["document_chunks"].find_one(
                {
                    "case_id": case_id,
                    "document_id": document.get("document_id"),
                    "embedding_model": model,
                },
                {"_id": 1},
            )
            if not exists:
                indexed += cls.index_processed_document(document)
        return indexed

    @classmethod
    def search(cls, case_id: str, question: str, limit: int = 5) -> list[dict[str, Any]]:
        model = embedding_model()
        query_embedding = embed_texts([question], model)[0]
        ensure_vector_indexes()
        candidates = list(
            active_db["document_chunks"].find(
                {"case_id": case_id, "embedding_model": model},
                {"_id": 0, "embedding": 1, "content": 1, "document_id": 1,
                 "filename": 1, "document_type": 1, "chunk_index": 1},
            ).limit(MAX_SEARCH_CANDIDATES)
        )
        for candidate in candidates:
            candidate["score"] = _cosine_similarity(query_embedding, candidate.get("embedding") or [])
            candidate.pop("embedding", None)
        return sorted(candidates, key=lambda candidate: candidate["score"], reverse=True)[:limit]
