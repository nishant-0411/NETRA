from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Body
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path
import shutil
import tempfile
import os
from ai.similarity.workflow import add_document_to_vdb, get_similar_case_report, find_similar_by_text

router = APIRouter(tags=["Similarity"])

class SimilarityQueryRequest(BaseModel):
    query: str
    k: Optional[int] = 5
    exclude_case_id: Optional[str] = None

def _save_upload_to_temp(file: UploadFile) -> tuple[Path, str]:
    filename = file.filename or "upload.txt"
    suffix = Path(filename).suffix or ".txt"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        shutil.copyfileobj(file.file, tmp)
    finally:
        tmp.close()
        file.file.close()

    return Path(tmp.name), filename


def _cleanup_temp_file(path: Path):
    if path.exists():
        os.remove(path)


@router.post("/similarity/query")
def query_similarity(payload: SimilarityQueryRequest):
    """
    Search vector database for case reports similar to a text query.
    """
    try:
        results = find_similar_by_text(
            payload.query,
            k=payload.k or 5,
            exclude_case_id=payload.exclude_case_id
        )
        return {"results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similarity query failed: {e}")


@router.get("/similarity/case/{case_id}")
def find_similar_by_case(case_id: str, k: int = 5):
    """
    Find case reports from other cases similar to the given case_id.
    """
    try:
        # Check if local files exist for this case in data/unstructured
        base_dir = Path(__file__).resolve().parents[4]
        case_dir = base_dir / "data" / "unstructured" / case_id
        
        query_text = ""
        if case_dir.exists() and case_dir.is_dir():
            # Try to read FIR.txt or any available report to form the query
            fir_file = case_dir / "FIR.txt"
            if fir_file.exists():
                with open(fir_file, "r", encoding="utf-8") as f:
                    query_text = f.read()
            else:
                for report_file in case_dir.iterdir():
                    if report_file.is_file() and report_file.suffix == ".txt":
                        with open(report_file, "r", encoding="utf-8") as f:
                            query_text += f.read()[:1000] + "\n"
                        if len(query_text) > 1500:
                            break

        if not query_text:
            query_text = f"Case investigation for {case_id} involving criminal network syndicate"

        results = find_similar_by_text(query_text, k=k, exclude_case_id=case_id)
        return {"case_id": case_id, "results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to find similar cases: {e}")


@router.post("/similarity/similar")
@router.post("/documents/similar")
def find_similar_documents(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    Find the most similar existing reports to an uploaded report file.
    """
    temp_path, _ = _save_upload_to_temp(file)

    try:
        results = get_similar_case_report(temp_path)
    except Exception as e:
        _cleanup_temp_file(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to run similarity search: {e}")

    background_tasks.add_task(_cleanup_temp_file, temp_path)

    return {"results": results, "count": len(results)}


@router.post("/similarity/upload")
def upload_document(
    background_tasks: BackgroundTasks,
    case_id: str = Form(...),
    file: UploadFile = File(...),
):
    temp_path, filename = _save_upload_to_temp(file)

    try:
        doc_id = add_document_to_vdb(temp_path, case_id=case_id, report_name=filename)
    except Exception as e:
        _cleanup_temp_file(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to add document: {e}")

    background_tasks.add_task(_cleanup_temp_file, temp_path)

    return {"document_id": doc_id, "case_id": case_id, "filename": filename}