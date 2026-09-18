from pathlib import Path
from uuid import uuid4

from pymongo import ASCENDING

from apps.backend.app.db.mongodb import master_db
from apps.backend.app.services.etl_service import process_existing_unstructured


BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "data" / "unstructured"


def _ensure_entities_index():
    """
    Create a unique compound index on the entities collection
    so reruns cannot insert duplicate rows.
    """
    collection = master_db["entities"]
    collection.create_index(
        [
            ("case_id", ASCENDING),
            ("source_file", ASCENDING),
            ("entity_type", ASCENDING),
            ("value", ASCENDING),
        ],
        unique=True,
        name="uq_case_file_type_value",
    )


def save_extracted_entities(
    processed_data: dict,
    case_id: str,
    document_id: str,
    file_path: Path,
):
    """
    Save entities extracted from an unstructured document
    into MongoDB-1.

    Uses upsert to avoid duplicates on reruns.
    """

    extracted_entities = processed_data.get("extracted_entities", [])

    if not isinstance(extracted_entities, list):
        raise ValueError(
            f"Invalid extracted_entities format for {file_path.name}"
        )

    if not extracted_entities:
        print("   ⚠️ No entities extracted.")
        return

    collection = master_db["entities"]

    upserted = 0
    updated = 0

    for entity in extracted_entities:
        if not isinstance(entity, dict):
            continue

        entity_type = entity.get("entity_type")
        value = entity.get("value")

        if not entity_type or not value:
            continue

        filter_key = {
            "case_id": case_id,
            "source_file": file_path.name,
            "entity_type": entity_type,
            "value": value,
        }

        update_doc = {
            "$set": {
                "document_id": document_id,
                "description": entity.get("description"),
            },
            "$setOnInsert": filter_key,
        }

        result = collection.update_one(
            filter_key,
            update_doc,
            upsert=True,
        )

        if result.upserted_id:
            upserted += 1
        elif result.modified_count:
            updated += 1

    print(
        f"   └── entities: "
        f"{upserted} new, {updated} updated"
    )


async def process_single_file(file_path: Path, case_id: str):
    """
    Process one unstructured document and store its
    extracted entities in MongoDB-1.
    """

    document_id = str(uuid4())

    print(f"\n📄 Processing: {file_path.name}")
    print(f"   Case ID: {case_id}")
    print(f"   Document ID: {document_id}")

    processed_data = await process_existing_unstructured(
        file_path=file_path,
        case_id=case_id,
        document_id=document_id,
    )

    if not isinstance(processed_data, dict):
        raise ValueError("ETL output must be a dictionary.")

    if processed_data.get("status") != "SUCCESS":
        raise ValueError(
            f"ETL failed for {file_path.name}: {processed_data}"
        )

    print(
        f"   Extracted entities: "
        f"{processed_data.get('summary', {}).get('total_entities_extracted', 0)}"
    )

    save_extracted_entities(
        processed_data=processed_data,
        case_id=case_id,
        document_id=document_id,
        file_path=file_path,
    )

    print("✅ Stored in MongoDB-1")


async def process_case(case_dir: Path):
    """
    Process all unstructured documents belonging to one case.
    """

    case_id = case_dir.name

    print(f"\n{'=' * 60}")
    print(f"📁 Processing {case_id}")
    print(f"{'=' * 60}")

    files = [
        file_path
        for file_path in sorted(case_dir.iterdir())
        if file_path.is_file()
        and file_path.suffix.lower() == ".txt"
        and not file_path.name.startswith(".")
    ]

    if not files:
        print("⚠️ No files found in this case.")
        return

    for file_path in files:
        try:
            await process_single_file(
                file_path=file_path,
                case_id=case_id,
            )

        except Exception as exc:
            print(
                f"\n❌ FAILED: {case_id}/{file_path.name}"
            )
            print(f"Error: {exc}")
            print("Skipping this document and continuing...\n")


async def main():
    print("🚀 Loading existing unstructured data into MongoDB-1...")
    print(f"Database: {master_db.name}")
    print(f"Data directory: {DATA_DIR}")

    if not DATA_DIR.exists():
        print(f"❌ Directory not found: {DATA_DIR}")
        return

    # Ensure the dedup index exists before any inserts.
    _ensure_entities_index()

    case_directories = [
        directory
        for directory in sorted(DATA_DIR.iterdir())
        if directory.is_dir()
        and not directory.name.startswith(".")
    ]

    if not case_directories:
        print("⚠️ No case directories found.")
        return

    for case_dir in case_directories:
        await process_case(case_dir)

    # Final verification
    entity_count = master_db["entities"].count_documents({})
    print(f"\n{'=' * 60}")
    print(f"🔍 Total entities in MongoDB: {entity_count}")
    print(f"{'=' * 60}")

    print("\n🎉 Existing unstructured data loading completed!")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())