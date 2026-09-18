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
    "licenses_global.json": "licenses",
    "call_records_global.json": "call_records",
    "social_media_global.json": "social_media",
    "weapons_global.json": "weapons",
    "transactions_global.json": "transactions",
    "edges_global.json": "edges",
}


def load_json_file(file_path: Path):
    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def clear_master_database():
    """
    Completely clear the existing netra_master database.

    This removes all old collections/data before loading
    the new structured dataset.
    """

    existing_collections = master_db.list_collection_names()

    if not existing_collections:
        print("ℹ️ MongoDB master database is already empty.")
        return

    print("🗑️ Removing old MongoDB master data...")

    for collection_name in existing_collections:
        master_db.drop_collection(collection_name)
        print(f"   ❌ Dropped collection: {collection_name}")

    print("✅ Old MongoDB master data removed.")
    print()


def load_collection(file_name: str, collection_name: str):
    """
    Load one JSON file into one MongoDB collection.
    """

    file_path = DATA_DIR / file_name

    if not file_path.exists():
        raise FileNotFoundError(
            f"Required data file not found: {file_path}"
        )

    data = load_json_file(file_path)

    if not isinstance(data, list):
        raise ValueError(
            f"Expected a JSON list in {file_name}, "
            f"got {type(data).__name__}"
        )

    collection = master_db[collection_name]

    if data:
        result = collection.insert_many(data)

        print(
            f"✅ {file_name:<30} → "
            f"{collection_name:<15} "
            f"{len(result.inserted_ids)} documents"
        )
    else:
        print(
            f"⚠️ {file_name:<30} → "
            f"{collection_name:<15} EMPTY"
        )


def main():

    print("=" * 70)
    print("🚀 NETRA MASTER DATA RESET + LOAD")
    print("=" * 70)

    print(f"Database     : {master_db.name}")
    print(f"Data folder  : {DATA_DIR}")
    print()

    clear_master_database()

    print("📥 Loading new structured dataset...")
    print()

    for file_name, collection_name in FILES_TO_COLLECTIONS.items():
        load_collection(
            file_name,
            collection_name
        )

    print()
    print("=" * 70)
    print("🔍 MONGODB VERIFICATION")
    print("=" * 70)

    collections = master_db.list_collection_names()

    for collection_name in sorted(collections):
        count = master_db[collection_name].count_documents({})
        print(f"{collection_name:<20} {count:>6}")

    print()
    print("=" * 70)
    print("🎉 MongoDB master data reset + load completed!")
    print("=" * 70)


if __name__ == "__main__":
    main()