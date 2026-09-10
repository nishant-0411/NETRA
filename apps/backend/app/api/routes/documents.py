from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import json

from app.services.document_service import upload_and_process_document
from app.schemas.document import DocumentUploadResponse, BatchDocumentUploadResponse

router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    case_id: str = Form(...),
    document_type: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    uploaded_by: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
):
    try:
        parsed_tags = []

        if tags:
            try:
                parsed_tags = json.loads(tags)

                if not isinstance(parsed_tags, list):
                    raise ValueError

            except (json.JSONDecodeError, ValueError):
                parsed_tags = [
                    tag.strip()
                    for tag in tags.split(",")
                    if tag.strip()
                ]

        result = await upload_and_process_document(
            file=file,
            case_id=case_id,
            document_type=document_type,
            description=description,
            uploaded_by=uploaded_by,
            tags=parsed_tags,
            source=source,
        )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

@router.post("/upload-multiple", response_model=BatchDocumentUploadResponse)
async def upload_multiple_documents(
    files: list[UploadFile] = File(...),
    case_id: str = Form(...),
    document_type: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    uploaded_by: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
):
    parsed_tags = []

    if tags:
        try:
            parsed_tags = json.loads(tags)
            if not isinstance(parsed_tags, list):
                raise ValueError
        except (json.JSONDecodeError, ValueError):
            parsed_tags = [
                tag.strip()
                for tag in tags.split(",")
                if tag.strip()
            ]

    documents = []
    errors = []

    for file in files:
        try:
            result = await upload_and_process_document(
                file=file,
                case_id=case_id,
                document_type=document_type,
                description=description,
                uploaded_by=uploaded_by,
                tags=parsed_tags,
                source=source,
            )

            documents.append(result)

        except Exception as exc:
            errors.append({
                "filename": file.filename,
                "error": str(exc),
            })

    return {
        "case_id": case_id,
        "total_files": len(files),
        "successful": len(documents),
        "failed": len(errors),
        "documents": documents,
        "errors": errors,
    }