import os
import sys
import uuid
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Search upward for .env
_this_dir = Path(__file__).resolve().parent
for _parent in [_this_dir, *_this_dir.parents]:
    _env_candidate = _parent / ".env"
    if _env_candidate.exists():
        load_dotenv(dotenv_path=_env_candidate, override=True)
        break

# Project root
ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from etl.pipelines.ingest import run_etl_pipeline
from apps.backend.app.services.graph_service import (
    sync_master_to_neo4j,
    sync_processed_document,
)

CASE_ID = "CASE-0001"
CASE_DIR = ROOT / "data" / "unstructured" / CASE_ID


def main():
    print("=" * 70)
    print(f"🚀 EXTRACTING ENTITIES & BUILDING NEO4J GRAPH FOR {CASE_ID}")
    print("=" * 70)

    # 1. Sync Master Canonical Data to Neo4j
    print("\n1️⃣ Syncing Canonical Master Data to Neo4j...")
    try:
        master_sync_result = sync_master_to_neo4j()
        print("   ✅ Master Graph Synced:")
        for label, count in master_sync_result.items():
            print(f"      • {label:<20}: {count}")
    except Exception as exc:
        print(f"   ⚠️ Master Graph sync warning/error: {exc}")

    # 2. Process CASE-0001 Unstructured Documents
    files = sorted(CASE_DIR.glob("*.txt"))

    if not files:
        print(f"\n❌ No .txt files found in {CASE_DIR}")
        return

    print(f"\n2️⃣ Found {len(files)} unstructured files in {CASE_DIR}:")
    for f in files:
        print(f"   • {f.name}")

    print("\n3️⃣ Running ETL Entity Extraction & Syncing to Neo4j...")
    
    total_entities = 0
    total_db_intel = 0

    for file_path in files:
        document_id = f"doc_{file_path.stem}_{uuid.uuid4().hex[:8]}"
        print(f"\n📄 Processing Document: {file_path.name}")

        text = file_path.read_text(encoding="utf-8", errors="ignore").strip()
        if not text:
            print("   ⚠️ Skipped (empty file)")
            continue

        # Run LangGraph ETL pipeline (Extract Entities + Fetch DB Intelligence)
        etl_result = run_etl_pipeline(
            file_path=file_path,
            case_id=CASE_ID,
            document_id=document_id,
        )

        extracted_entities = etl_result.get("extracted_entities", [])
        database_intelligence = etl_result.get("database_intelligence", [])

        print(f"   └── Entities Extracted : {len(extracted_entities)}")
        print(f"   └── DB Intelligence    : {len(database_intelligence)}")

        total_entities += len(extracted_entities)
        total_db_intel += len(database_intelligence)

        document_payload = {
            "document_id": document_id,
            "case_id": CASE_ID,
            "filename": file_path.name,
            "document_type": "Case Investigation File",
            "data": {
                "extracted_entities": extracted_entities,
                "database_intelligence": database_intelligence,
                "result": etl_result,
            }
        }

        # Sync document, MENTIONS relationships, and InvestigationEntity nodes into Neo4j
        try:
            sync_res = sync_processed_document(document_payload)
            print(f"   ✅ Synced into Neo4j: {file_path.name} ({sync_res.get('status', 'completed')})")
        except Exception as exc:
            print(f"   ❌ Error syncing {file_path.name} to Neo4j: {exc}")

    print("\n" + "=" * 70)
    print(f"🎉 COMPLETED: {CASE_ID} Graph Extraction & Loading")
    print(f"   Total Files Processed   : {len(files)}")
    print(f"   Total Entities Extracted: {total_entities}")
    print(f"   Total DB Matches Linked : {total_db_intel}")
    print("=" * 70)


if __name__ == "__main__":
    main()