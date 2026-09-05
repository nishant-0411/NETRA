from pathlib import Path
from uuid import uuid4
from app.db.mongodb import master_db
from app.services.etl_service import process_existing_unstructured

BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "data" / "unstructured"

def save_processed_data( processed_data: dict, case_id: str, document_id: str, file_path: Path):
    """
    Store ETL output into MongoDB-1 common collections.
    """

    for collection_name, records in processed_data.items():
        if not isinstance(records, list):
            continue

        if not records:
            continue

        documents = []

        for record in records:
            if not isinstance(record, dict):
                continue
            record["case_id"] = case_id
            record["document_id"] = document_id
            record["source_file"] = file_path.name
            documents.append(record)

        if documents:
            master_db[collection_name].insert_many(documents)
            print( f"   └── {collection_name}: " f"{len(documents)} records inserted")


async def process_case(case_dir: Path):
    """
    Process all unstructured documents belonging to one case.
    """

    case_id = case_dir.name
    print(f"\n📁 Processing {case_id}")

    files = [file_path for file_path in case_dir.iterdir() if file_path.is_file()]

    for file_path in files:
        document_id = str(uuid4())
        print(f"📄 {file_path.name}")
        processed_data = await process_existing_unstructured(
            file_path=file_path,
            case_id=case_id,
            document_id=document_id,
        )

        if not isinstance(processed_data, dict):
            raise ValueError(f"ETL output for {file_path.name} must be a dictionary.")

        save_processed_data(processed_data=processed_data,case_id=case_id,document_id=document_id,file_path=file_path)

        print(f"✅ {file_path.name} processed")


async def main():
    print("🚀 Loading existing unstructured data into MongoDB-1...")
    print(f"Database: {master_db.name}")
    print(f"Data directory: {DATA_DIR}")

    if not DATA_DIR.exists():
        print(f"❌ Directory not found: {DATA_DIR}")
        return

    case_directories = [
        directory
        for directory in DATA_DIR.iterdir()
        if directory.is_dir()
    ]

    if not case_directories:
        print("⚠️ No case directories found.")
        return

    for case_dir in sorted(case_directories):
        await process_case(case_dir)

    print("\n🎉 Existing unstructured data loading completed!")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())