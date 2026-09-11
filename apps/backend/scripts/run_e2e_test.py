"""
NETRA End-to-End Test Script
============================

Runs the full pipeline against the real dataset:
  1. Load structured JSON → MongoDB netra_master (10 collections)
  2. Load unstructured TXT → MongoDB netra_master.entities (7 cases)
  3. Verify no duplicates on a second unstructured run
  4. Sync all master data → Neo4j
  5. Print verification summary
"""

import asyncio
import json
import sys
from pathlib import Path

# Ensure the project root is on sys.path so relative imports work
# regardless of where the script is invoked from.
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from apps.backend.app.db.mongodb import master_db


# ============================================================
# 1. LOAD STRUCTURED MASTER DATA
# ============================================================

def step_load_master_data():
    """
    Drop + reload all 10 structured JSON files into MongoDB.
    """

    from apps.backend.scripts.load_master_data import (
        clear_master_database,
        load_collection,
        FILES_TO_COLLECTIONS,
    )

    print("\n" + "=" * 70)
    print("STEP 1: Load Structured Master Data → MongoDB")
    print("=" * 70)

    clear_master_database()

    print("📥 Loading structured dataset...\n")

    for file_name, collection_name in FILES_TO_COLLECTIONS.items():
        load_collection(file_name, collection_name)

    print()

    collections = master_db.list_collection_names()

    for name in sorted(collections):
        count = master_db[name].count_documents({})
        print(f"  {name:<20} {count:>6} docs")

    print("\n✅ Master data loaded.")


# ============================================================
# 2. LOAD UNSTRUCTURED ENTITIES
# ============================================================

async def step_load_unstructured():
    """
    Process all 7 CASE folders and store extracted entities.
    """
    from apps.backend.scripts.load_existing_unstructured import (
        main as load_unstructured_main,
    )

    print("\n" + "=" * 70)
    print("STEP 2: Load Unstructured Data → MongoDB entities")
    print("=" * 70)

    await load_unstructured_main()

    return master_db["entities"].count_documents({})


# ============================================================
# 3. VERIFY DEDUP ON RERUN
# ============================================================

async def step_verify_dedup(count_before: int):
    """
    Run the unstructured loader again and verify entity count
    stays the same.
    """
    from apps.backend.scripts.load_existing_unstructured import (
        main as load_unstructured_main,
    )

    print("\n" + "=" * 70)
    print("STEP 3: Re-run Unstructured Loader (dedup check)")
    print("=" * 70)

    await load_unstructured_main()

    count_after = master_db["entities"].count_documents({})

    if count_after == count_before:
        print(f"\n✅ DEDUP VERIFIED: {count_before} → {count_after} (no change)")
    else:
        print(
            f"\n❌ DEDUP FAILED: {count_before} → {count_after} "
            f"({count_after - count_before} extra)"
        )

    return count_after


# ============================================================
# 4. SYNC MASTER DATA → NEO4J
# ============================================================

def step_sync_neo4j():
    """
    Sync all 10 master collections from MongoDB to Neo4j.
    """
    from apps.backend.app.services.graph_service import (
        sync_master_to_neo4j,
        verify_neo4j_connection,
    )

    print("\n" + "=" * 70)
    print("STEP 4: Sync Master Data → Neo4j")
    print("=" * 70)

    status = verify_neo4j_connection()
    print(f"  Neo4j connection: {status}")

    counts = sync_master_to_neo4j()

    print("\n  Neo4j sync results:")
    for name, count in counts.items():
        print(f"    {name:<20} {count:>6} synced")

    print("\n✅ Neo4j sync completed.")

    return counts


# ============================================================
# 5. FINAL VERIFICATION
# ============================================================

def step_final_verification():
    """
    Print final summary of all MongoDB collections.
    """

    print("\n" + "=" * 70)
    print("FINAL VERIFICATION: MongoDB Collection Counts")
    print("=" * 70)

    collections = master_db.list_collection_names()

    total = 0
    for name in sorted(collections):
        count = master_db[name].count_documents({})
        total += count
        print(f"  {name:<20} {count:>6} docs")

    print(f"  {'TOTAL':<20} {total:>6} docs")
    print()


# ============================================================
# MAIN
# ============================================================

async def main():
    print("=" * 70)
    print("🚀 NETRA END-TO-END TEST")
    print("=" * 70)

    # Step 1: Load structured master data
    step_load_master_data()

    # Step 2: Load unstructured entities
    entity_count = await step_load_unstructured()

    # Step 3: Verify dedup
    await step_verify_dedup(entity_count)

    # Step 4: Sync to Neo4j
    try:
        step_sync_neo4j()
    except Exception as exc:
        print(f"\n⚠️ Neo4j sync failed: {exc}")
        print("  (This is expected if Neo4j Aura is unreachable)")

    # Step 5: Final verification
    step_final_verification()

    print("=" * 70)
    print("🎉 END-TO-END TEST COMPLETED")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
