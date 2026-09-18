import json
import logging
import os
from pathlib import Path
from dotenv import load_dotenv

# Explicitly load .env from this directory so HUGGINGFACE_API_KEY is available
# regardless of where the script is invoked from.
_ENV_FILE = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_ENV_FILE, override=True)

from etl.pipelines.ingest import run_etl_pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")

def main():
    # Diagnostic: confirm the API key was loaded
    api_key = os.getenv("HUGGINGFACE_API_KEY", "")
    if api_key:
        print(f"[INFO] HUGGINGFACE_API_KEY loaded successfully (starts with: {api_key[:8]}...)")
    else:
        print("[WARNING] HUGGINGFACE_API_KEY is NOT set — pipeline will use fallback extraction.")

    sample_file = Path("data/unstructured/CASE-0007/FIR.txt").resolve()
    print(f"\n[INFO] Testing ETL Pipeline with: {sample_file}")

    result = run_etl_pipeline(
        file_path=sample_file,
        case_id="CASE-0007",
        document_id="DOC-0007-FIR"
    )

    print("\n=================== ETL PIPELINE RESULT ===================")
    print(f"Status : {result.get('status')}")
    print(f"File   : {result.get('file_name')}")
    print(f"\nSummary:\n{json.dumps(result.get('summary'), indent=2)}")
    print("\n--- Extracted Entities & Descriptions ---")
    print(json.dumps(result.get('extracted_entities'), indent=2))
    print("\n--- Generated Database Queries ---")
    print(json.dumps(result.get('generated_queries'), indent=2))
    print("\n--- Matching Database Intelligence Retrieved ---")
    print(json.dumps(result.get('database_intelligence'), indent=2))
    print("===========================================================")

if __name__ == "__main__":
    main()
