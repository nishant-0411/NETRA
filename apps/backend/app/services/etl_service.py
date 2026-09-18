from pathlib import Path
from etl.pipelines.pipeline import run_etl_pipeline

async def process_document(file_path: Path, document_id: str, case_id: str, document_metadata: dict) -> dict:
    """
    Process a newly uploaded PDF/image/text document using the ETL pipeline.

    Extracts entities, generates database search queries via LLM, and retrieves
    matching records from the global database.
    """
    return run_etl_pipeline(
        file_path=file_path,
        case_id=case_id,
        document_id=document_id,
        metadata=document_metadata
    )


async def process_existing_unstructured(file_path: Path, case_id: str, document_id: str) -> dict:
    """
    Process an existing unstructured document using the ETL pipeline.

    Used for:
        data/unstructured/CASE-XXXX/*.txt
    """
    return run_etl_pipeline(
        file_path=file_path,
        case_id=case_id,
        document_id=document_id
    )