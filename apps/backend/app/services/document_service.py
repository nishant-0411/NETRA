import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from fastapi import UploadFile
from app.db.mongodb import active_db
from app.services.etl_service import process_document

ALLOWED_CONTENT_TYPES = { "application/pdf", "image/jpeg", "image/png", "image/webp"}

MAX_FILE_SIZE = 10 * 1024 * 1024 

async def upload_and_process_document(
    file: UploadFile, case_id: str, document_type: str | None = None,
    description: str | None = None, uploaded_by: str | None = None,
    tags: list[str] | None = None, source: str | None = None,):
    """
    Upload a document for a new investigation.

    Flow:
        1. Validate uploaded file
        2. Save file temporarily
        3. Send temporary file to ETL
        4. Receive processed information from ETL
        5. Store processed information in MongoDB-2
        6. Delete temporary file
    """

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(
            "Unsupported file type. "
            "Only PDF, JPEG, PNG and WEBP files are allowed."
        )

    if not file.filename:
        raise ValueError("Filename is required.")

    document_id = str(uuid4())
    uploaded_at = datetime.now(timezone.utc)

    file_content = await file.read()

    if not file_content:
        raise ValueError("Uploaded file is empty.")

    if len(file_content) > MAX_FILE_SIZE:
        raise ValueError("File size exceeds the 10 MB limit.")

    temp_file_path: Path | None = None

    try:
        suffix = Path(file.filename).suffix

        with tempfile.NamedTemporaryFile(delete=False,suffix=suffix,) as temp_file:
            temp_file.write(file_content)
            temp_file_path = Path(temp_file.name)

        document_metadata = {
            "document_id": document_id,
            "case_id": case_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "file_size": len(file_content),
            "document_type": document_type,
            "description": description,
            "uploaded_by": uploaded_by,
            "uploaded_at": uploaded_at,
            "tags": tags or [],
            "source": source,
            "processing_status": "processing",
        }

        active_db["documents"].insert_one(document_metadata)

        # -----------------------------------------------------
        # Send document to ETL
        # -----------------------------------------------------
        processed_data = await process_document(file_path=temp_file_path, document_id=document_id, 
                                           case_id=case_id, document_metadata=document_metadata)

        if not isinstance(processed_data, dict):
            raise ValueError("ETL must return processed information as a dictionary.")

        processed_document = {
            "document_id": document_id,
            "case_id": case_id,
            "filename": file.filename,
            "document_type": document_type,
            "processed_at": datetime.now(timezone.utc),
            "processing_status": "completed",
            "data": processed_data,
        }

        active_db["processed_documents"].insert_one(processed_document)

        active_db["documents"].update_one(
            {"document_id": document_id},
            {
                "$set": {
                    "processing_status": "completed",
                    "processed_at": datetime.now(timezone.utc),
                }
            },
        )

        return {
            "document_id": document_id,
            "case_id": case_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "file_size": len(file_content),
            "document_type": document_type,
            "description": description,
            "uploaded_by": uploaded_by,
            "uploaded_at": uploaded_at,
            "tags": tags or [],
            "source": source,
            "processing_status": "completed",
            "processed_data": processed_data,
            "message": "Document processed and stored successfully.",
        }

    except Exception as exc:

        active_db["documents"].update_one(
            {"document_id": document_id},
            {
                "$set": {
                    "processing_status": "failed",
                    "error": str(exc),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        raise

    finally:
        if temp_file_path and temp_file_path.exists():
            temp_file_path.unlink()

