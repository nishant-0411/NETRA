import json
from pathlib import Path
from apps.backend.app.db.mongodb import master_db

BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "data" / "structured"

FILES_TO_COLLECTIONS = {
    "persons_global.json": "persons",
    "phones_global.json": "phones",
    "vehicles_global.json": "vehicles",
    "accounts_global.json": "accounts",
    "call_records_global.json": "call_records",
    "licenses_global.json": "licenses",
    "social_media_global.json": "social_media",
    "transactions_global.json": "transactions",
}

def load_json_file(file_path: Path):
    with open(file_path, "r", encoding = "utf-8") as file:
        return json.load(file)

def load_collection(file_name: str, collection_name: str):
    file_path = DATA_DIR / file_name

    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        return
    
    data = load_json_file(file_path)

    if not isinstance(data, list):
        print(f"❌ Expected a list in {file_name}")
        return

    collection = master_db[collection_name]
    collection.delete_many({})

    if data:
        result = collection.insert_many(data)
        print(
            f"✅ {file_name} → {collection_name}: "
            f"{len(result.inserted_ids)} documents inserted"
        )
    else:
        print(f"⚠️ {file_name} is empty")


def main():
    print("🚀 Loading existing structured data into MongoDB-1...")
    print(f"Database: {master_db.name}")
    print(f"Data directory: {DATA_DIR}")
    print()

    for file_name, collection_name in FILES_TO_COLLECTIONS.items():
        load_collection(file_name, collection_name)

    print()
    print("🎉 Master data loading completed!")


if __name__ == "__main__":
    main()