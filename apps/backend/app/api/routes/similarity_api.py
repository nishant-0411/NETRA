from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from pathlib import Path
import shutil
import tempfile
import os
from ai.similarity.workflow import add_document_to_vdb, get_similar_case_report

router = APIRouter(prefix="/documents", tags=["documents"])

def _save_upload_to_temp(file: UploadFile) -> tuple[Path, str]:
    """
    Save an incoming UploadFile to a temporary file on disk.

    FastAPI's UploadFile is a streamed, in-request object - the vector-DB
    functions expect a real filesystem Path, so this bridges the two by
    copying the upload's contents into a temp file and returning its path.
    Also resolves and returns a guaranteed non-None filename, since
    UploadFile.filename is typed as str | None (a client could omit it).

    Args:
        file (UploadFile): The incoming file from the request.

    Returns:
        tuple[Path, str]: (path to the temp file, resolved original filename)
    """
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
    """
    Delete a temporary file from disk if it still exists.

    Intended to run as a FastAPI BackgroundTask so the temp file used for
    a request is cleaned up after the response has been sent.

    Args:
        path (Path): Path to the temporary file to remove.

    Returns:
        None
    """
    if path.exists():
        os.remove(path)


@router.post("/upload")
def upload_document(
    background_tasks: BackgroundTasks,
    case_id: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Upload a report and add it to the case-reports vector database.

    Saves the uploaded file to a temp location, embeds and stores it under
    the given case_id (with the original filename preserved as metadata),
    then deletes the temp file in the background once the response has
    been sent.

    Args:
        background_tasks (BackgroundTasks): Injected by FastAPI; used to
            schedule temp-file cleanup after the response is returned.
        case_id (str): The case ID this report belongs to.
        file (UploadFile): The report file being uploaded.

    Returns:
        dict: {"document_id": str, "case_id": str, "filename": str}

    Raises:
        HTTPException: 500 if adding the document to the vector DB fails.
    """
    temp_path, filename = _save_upload_to_temp(file)

    try:
        doc_id = add_document_to_vdb(temp_path, case_id=case_id, report_name=filename)
    except Exception as e:
        _cleanup_temp_file(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to add document: {e}")

    background_tasks.add_task(_cleanup_temp_file, temp_path)

    return {"document_id": doc_id, "case_id": case_id, "filename": filename}


@router.post("/similar")
def find_similar_documents(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    Find the most similar existing reports to an uploaded report.

    Saves the uploaded file to a temp location, runs a similarity search
    against the case-reports vector database, then deletes the temp file
    in the background once the response has been sent.

    Args:
        background_tasks (BackgroundTasks): Injected by FastAPI; used to
            schedule temp-file cleanup after the response is returned.
        file (UploadFile): The report file to search with.

    Returns:
        dict: {"results": list[dict]} - see get_similar_case_report() for
            the shape of each result.

    Raises:
        HTTPException: 500 if the similarity search fails.
    """
    temp_path, _ = _save_upload_to_temp(file)

    try:
        results = get_similar_case_report(temp_path)
    except Exception as e:
        _cleanup_temp_file(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to run similarity search: {e}")

    background_tasks.add_task(_cleanup_temp_file, temp_path)

    return {"results": results}