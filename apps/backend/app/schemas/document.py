from datetime import datetime
from pydantic import BaseModel, Field

class DocumentUploadResponse(BaseModel):
    document_id: str
    case_id: str
    filename: str
    content_type: str
    file_size: int

    document_type: str | None = None
    description: str | None = None
    uploaded_by: str | None = None

    uploaded_at: datetime

    tags: list[str] = Field(default_factory=list)
    source: str | None = None

    processing_status: str
    message: str


class ProcessedDocumentResponse(BaseModel):
    document_id: str
    case_id: str
    processing_status: str
    processed_data: dict
    message: str

class BatchDocumentUploadResponse(BaseModel):
    case_id: str
    total_files: int
    successful: int
    failed: int
    documents: list[DocumentUploadResponse]
    errors: list[dict]