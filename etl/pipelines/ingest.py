import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from etl.pipelines.build_graph import etl_graph, ETLPipelineState

logger = logging.getLogger(__name__)


# ==============================================================================
# 1. RUN ETL PIPELINE
# ==============================================================================
def run_etl_pipeline(
    file_path: Path | str,
    case_id: Optional[str] = None,
    document_id: Optional[str] = None,
    metadata: Optional[dict] = None
) -> Dict[str, Any]:
    """
    Executes the NETRA ETL pipeline using the compiled LangGraph StateGraph.

    Args:
        file_path: Path to document file.
        case_id: Optional case identifier string.
        document_id: Optional document identifier string.
        metadata: Optional metadata dictionary.

    Returns:
        dict: Complete structured entity and database intelligence result state.
    """
    path = Path(file_path)
    logger.info(f"Starting LangGraph ETL Pipeline for file: {path}")

    initial_state: ETLPipelineState = {
        "file_path": str(path.resolve()),
        "case_id": case_id,
        "document_id": document_id,
        "metadata": metadata or {},
        "document_text": "",
        "extracted_entities": [],
        "db_schema": {},
        "generated_queries": [],
        "database_intelligence": [],
        "status": "PROCESSING",
        "errors": []
    }

    final_state = etl_graph.invoke(initial_state)
    return dict(final_state)


# ==============================================================================
# 2. FILE & DIRECTORY INGESTION WRAPPERS
# ==============================================================================
def ingest_file(
    file_path: Path | str,
    case_id: Optional[str] = None,
    document_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Ingests a single file through the ETL pipeline.
    """
    return run_etl_pipeline(file_path=file_path, case_id=case_id, document_id=document_id)


def ingest_directory(
    directory_path: Path | str,
    case_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Batch ingests all files in a directory through the ETL pipeline.
    """
    dir_path = Path(directory_path)
    if not dir_path.exists() or not dir_path.is_dir():
        raise FileNotFoundError(f"Directory not found: {dir_path}")

    results = []
    for file_path in dir_path.glob("*"):
        if file_path.is_file():
            res = run_etl_pipeline(file_path=file_path, case_id=case_id or dir_path.name)
            results.append(res)
    return results


# ==============================================================================
# 3. CLI MAIN ENTRY POINT
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(description="NETRA Document ETL Ingestion Pipeline")
    parser.add_argument("file_path", type=str, help="Path to document file or directory to process")
    parser.add_argument("--case_id", type=str, default=None, help="Optional case ID string")
    parser.add_argument("--document_id", type=str, default=None, help="Optional document ID string")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    path = Path(args.file_path).resolve()
    if path.is_dir():
        print(f"Processing directory: {path}")
        results = ingest_directory(path, case_id=args.case_id)
        print(f"Processed {len(results)} files.")
    else:
        print(f"Processing file: {path}")
        result = run_etl_pipeline(path, case_id=args.case_id, document_id=args.document_id)
        print("\n=================== ETL INGESTION RESULT ===================")
        print(f"Status: {result.get('status')}")
        print(f"Summary: {json.dumps(result.get('summary'), indent=2)}")
        print("\n--- Extracted Entities ---")
        print(json.dumps(result.get("extracted_entities"), indent=2))
        print("\n--- Matching Database Intelligence ---")
        print(json.dumps(result.get("database_intelligence"), indent=2))
        print("===========================================================")


if __name__ == "__main__":
    main()
