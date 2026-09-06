import os
import hashlib
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from neo4j import GraphDatabase

from apps.backend.app.db.mongodb import master_db


# ============================================================
# 1. LOAD ENVIRONMENT
# ============================================================

_this_dir = Path(__file__).resolve().parent

for _parent in [_this_dir, *_this_dir.parents]:
    _env_candidate = _parent / ".env"

    if _env_candidate.exists():
        load_dotenv(dotenv_path=_env_candidate, override=True)
        break


NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")


if not NEO4J_URI:
    raise RuntimeError("NEO4J_URI is not set in .env")

if not NEO4J_USERNAME:
    raise RuntimeError("NEO4J_USERNAME is not set in .env")

if not NEO4J_PASSWORD:
    raise RuntimeError("NEO4J_PASSWORD is not set in .env")


# ============================================================
# 2. NEO4J CONNECTION
# ============================================================

driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USERNAME, NEO4J_PASSWORD),
)


# ============================================================
# 3. CONNECTION TEST
# ============================================================

def verify_neo4j_connection() -> str:
    """
    Verify that the backend can connect to Neo4j Aura.
    """

    driver.verify_connectivity()

    with driver.session() as session:
        result = session.run(
            "RETURN 'NETRA Neo4j Connected' AS status"
        )

        record = result.single()

        return record["status"]


# ============================================================
# 4. HELPERS
# ============================================================

def _data(document: dict) -> dict:
    """
    Extract the 'data' object from MongoDB documents.
    """
    return document.get("data", {})


def _result(document: dict) -> dict:
    """
    Extract data.result from API-style MongoDB documents.
    """
    return _data(document).get("result", {})


def _make_id(prefix: str, value: str) -> str:
    """
    Generate a stable ID for records that do not already
    have an explicit project ID.
    """

    digest = hashlib.sha1(
        value.encode("utf-8")
    ).hexdigest()[:8]

    return f"{prefix}_{digest}"


# ============================================================
# 5. MASTER DATA → PERSON NODES
# ============================================================

def sync_persons() -> int:
    """
    Create/update Person nodes from MongoDB-1 persons collection.
    """

    persons = list(
        master_db["persons"]
        .find({})
        .sort("_id", 1)
    )

    rows = []

    for document in persons:

        data = _data(document)

        person_id = data.get("person_id")

        if not person_id:
            continue

        rows.append({
            "person_id": person_id,
            "name": data.get("name"),
            "gender": data.get("gender"),
            "dob": data.get("dob"),
            "address": data.get("address"),
            "social_handles": data.get("social_handles", []),
        })

    query = """
    UNWIND $rows AS row

    MERGE (p:Person {
        person_id: row.person_id
    })

    SET
        p.name = row.name,
        p.gender = row.gender,
        p.dob = row.dob,
        p.address = row.address,
        p.social_handles = row.social_handles
    """

    with driver.session() as session:
        session.run(query, rows=rows)

    return len(rows)


# ============================================================
# 6. MASTER DATA → PHONE NODES
# ============================================================

def sync_phones() -> int:
    """
    Create Phone nodes.

    The first 1000 phone records correspond to the phone IDs
    referenced by the 1000 Person records.

    Any additional phone records are still created using a
    stable ID generated from their phone number.
    """

    persons = list(
        master_db["persons"]
        .find({})
        .sort("_id", 1)
    )

    phones = list(
        master_db["phones"]
        .find({})
        .sort("_id", 1)
    )

    rows = []

    for index, phone_document in enumerate(phones):

        phone_result = _result(phone_document)

        phone_number = phone_result.get("mobile_no")

        if not phone_number:
            continue

        person_id = None
        phone_id = None

        # First 1000 phone records correspond to persons.
        if index < len(persons):

            person_data = _data(persons[index])

            person_id = person_data.get("person_id")

            phone_ids = person_data.get("phones", [])

            if phone_ids:
                phone_id = phone_ids[0]

        # Extra phone records don't have a Person reference.
        if not phone_id:
            phone_id = _make_id(
                "PHONE",
                phone_number
            )

        rows.append({
            "phone_id": phone_id,
            "phone_number": phone_number,
            "name": phone_result.get("name"),
            "pan_number": phone_result.get("pan_number"),
            "email": (
                phone_result
                .get("pan_details", {})
                .get("email")
            ),
            "person_id": person_id,
        })

    query = """
    UNWIND $rows AS row

    MERGE (ph:Phone {
        phone_id: row.phone_id
    })

    SET
        ph.phone_number = row.phone_number,
        ph.name = row.name,
        ph.pan_number = row.pan_number,
        ph.email = row.email

    WITH ph, row

    FOREACH (_ IN CASE
        WHEN row.person_id IS NOT NULL THEN [1]
        ELSE []
    END |
        MERGE (p:Person {
            person_id: row.person_id
        })

        MERGE (p)-[:USES]->(ph)
    )
    """

    with driver.session() as session:
        session.run(query, rows=rows)

    return len(rows)

# ============================================================
# 7. MASTER DATA → VEHICLE NODES
# ============================================================

def sync_vehicles() -> int:
    """
    Create Vehicle nodes and Person-OWNS-Vehicle relationships.
    """

    persons = list(
        master_db["persons"]
        .find({})
        .sort("_id", 1)
    )

    vehicles = list(
        master_db["vehicles"]
        .find({})
        .sort("_id", 1)
    )

    rows = []

    for person_document, vehicle_document in zip(persons, vehicles):

        person_data = _data(person_document)
        vehicle_result = _result(vehicle_document)

        vehicle_ids = person_data.get("vehicles", [])

        if not vehicle_ids:
            continue

        vehicle_id = vehicle_ids[0]

        rows.append({
            "vehicle_id": vehicle_id,
            "registration_number": vehicle_result.get("rc_number"),
            "model": vehicle_result.get("maker_model"),
            "maker": vehicle_result.get("maker_description"),
            "color": vehicle_result.get("color"),
            "fuel_type": vehicle_result.get("fuel_type"),
            "owner_person_id": person_data.get("person_id"),
        })

    query = """
    UNWIND $rows AS row

    MERGE (v:Vehicle {
        vehicle_id: row.vehicle_id
    })

    SET
        v.registration_number = row.registration_number,
        v.model = row.model,
        v.maker = row.maker,
        v.color = row.color,
        v.fuel_type = row.fuel_type

    WITH v, row

    MATCH (p:Person {
        person_id: row.owner_person_id
    })

    MERGE (p)-[:OWNS]->(v)
    """

    with driver.session() as session:
        session.run(query, rows=rows)

    return len(rows)


# ============================================================
# 8. MASTER DATA → ACCOUNT NODES
# ============================================================

def sync_accounts() -> int:
    """
    Create Account nodes and Person-OWNS-Account relationships.
    """

    persons = list(
        master_db["persons"]
        .find({})
        .sort("_id", 1)
    )

    accounts = list(
        master_db["accounts"]
        .find({})
        .sort("_id", 1)
    )

    rows = []

    for person_document, account_document in zip(persons, accounts):

        person_data = _data(person_document)
        account_result = _result(account_document)

        account_ids = person_data.get("accounts", [])

        if not account_ids:
            continue

        account_id = account_ids[0]

        rows.append({
            "account_id": account_id,
            "account_number": account_result.get("account_number"),
            "ifsc_code": account_result.get("ifsc_code"),
            "account_type": account_result.get("account_type"),
            "bank_name": account_result.get("bank_name"),
            "branch_name": account_result.get("branch_name"),
            "owner_person_id": person_data.get("person_id"),
        })

    query = """
    UNWIND $rows AS row

    MERGE (a:Account {
        account_id: row.account_id
    })

    SET
        a.account_number = row.account_number,
        a.ifsc_code = row.ifsc_code,
        a.account_type = row.account_type,
        a.bank_name = row.bank_name,
        a.branch_name = row.branch_name

    WITH a, row

    MATCH (p:Person {
        person_id: row.owner_person_id
    })

    MERGE (p)-[:OWNS]->(a)
    """

    with driver.session() as session:
        session.run(query, rows=rows)

    return len(rows)


# ============================================================
# 9. MASTER DATA → LICENSE NODES
# ============================================================

def sync_licenses() -> int:
    """
    Create License nodes and Person-HAS_LICENSE-License
    relationships.
    """

    persons = list(
        master_db["persons"]
        .find({})
        .sort("_id", 1)
    )

    licenses = list(
        master_db["licenses"]
        .find({})
        .sort("_id", 1)
    )

    rows = []

    for person_document, license_document in zip(persons, licenses):

        person_data = _data(person_document)
        license_result = _result(license_document)

        license_ids = person_data.get("licenses", [])

        if not license_ids:
            continue

        license_id = license_ids[0]

        rows.append({
            "license_id": license_id,
            "license_number": license_result.get("license_number"),
            "state": license_result.get("state"),
            "name": license_result.get("name"),
            "dob": license_result.get("dob"),
            "gender": license_result.get("gender"),
            "owner_person_id": person_data.get("person_id"),
        })

    query = """
    UNWIND $rows AS row

    MERGE (l:License {
        license_id: row.license_id
    })

    SET
        l.license_number = row.license_number,
        l.state = row.state,
        l.name = row.name,
        l.dob = row.dob,
        l.gender = row.gender

    WITH l, row

    MATCH (p:Person {
        person_id: row.owner_person_id
    })

    MERGE (p)-[:HAS_LICENSE]->(l)
    """

    with driver.session() as session:
        session.run(query, rows=rows)

    return len(rows)


# ============================================================
# 10. MASTER DATA → CALL RECORDS
# ============================================================

def sync_call_records() -> int:
    """
    Create Phone-CALLED->Phone relationships from CDR data.

    CDRs are processed in batches so that large imports do not
    create a single long-running transaction.
    """

    call_records = list(
        master_db["call_records"].find({})
    )

    rows = []

    for call in call_records:

        caller = call.get("caller_no")
        receiver = call.get("receiver_no")

        if not caller or not receiver:
            continue

        rows.append({
            "caller": caller,
            "receiver": receiver,
            "cdr_id": call.get("cdr_id"),
            "timestamp": call.get("timestamp"),
            "duration_seconds": call.get("duration_seconds"),
            "call_type": call.get("call_type"),
            "cell_tower_location": call.get(
                "cell_tower_location"
            ),
            "imei": call.get("imei"),
        })

    query = """
    UNWIND $rows AS row

    MATCH (caller:Phone {
        phone_number: row.caller
    })

    MATCH (receiver:Phone {
        phone_number: row.receiver
    })

    MERGE (caller)-[c:CALLED {
        cdr_id: row.cdr_id
    }]->(receiver)

    SET
        c.timestamp = row.timestamp,
        c.duration_seconds = row.duration_seconds,
        c.call_type = row.call_type,
        c.cell_tower_location = row.cell_tower_location,
        c.imei = row.imei
    """

    batch_size = 200
    inserted = 0

    with driver.session() as session:

        for start in range(0, len(rows), batch_size):

            batch = rows[start:start + batch_size]

            session.run(
                query,
                rows=batch
            ).consume()

            inserted += len(batch)

            print(
                f"Processed CDRs: "
                f"{min(start + batch_size, len(rows))}"
                f"/{len(rows)}"
            )

    return inserted

# ============================================================
# 11. MASTER DATABASE → NEO4J
# ============================================================

def sync_master_to_neo4j() -> dict[str, int]:
    """
    Synchronize MongoDB-1 master data into Neo4j.
    """

    master_db.command("ping")

    counts = {}

    counts["persons"] = sync_persons()
    counts["phones"] = sync_phones()
    counts["vehicles"] = sync_vehicles()
    counts["accounts"] = sync_accounts()
    counts["licenses"] = sync_licenses()
    counts["call_records"] = sync_call_records()

    return counts


# ============================================================
# 12. CLOSE CONNECTION
# ============================================================

def close_neo4j_connection() -> None:
    """
    Close the Neo4j driver when the application shuts down.
    """

    driver.close()

import hashlib


# ============================================================
# CURRENT CASE → NEO4J
# ============================================================

def _make_case_entity_id(case_id: str, document_id: str, entity_type: str, value: str) -> str:
    raw = f"{case_id}|{document_id}|{entity_type}|{value}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def _extract_master_identity(collection: str, record: dict):
    """
    Convert a MongoDB master record into the canonical Neo4j
    label + identifier.

    Returns:
        (neo4j_label, identifier_property, identifier_value)
    """

    data = record.get("data", {})
    result = data.get("result", {})

    if collection == "persons":
        person_id = data.get("person_id")

        if person_id:
            return "Person", "person_id", person_id

    elif collection == "phones":
        mobile_no = result.get("mobile_no")

        if mobile_no:
            return "Phone", "phone_number", mobile_no

    elif collection == "vehicles":
        rc_number = result.get("rc_number")

        if rc_number:
            return "Vehicle", "registration_number", rc_number

    elif collection == "accounts":
        account_number = result.get("account_number")

        if account_number:
            return "Account", "account_number", account_number

    elif collection == "licenses":
        license_number = result.get("license_number")

        if license_number:
            return "License", "license_number", license_number

    return None


def _create_case_and_document(session, document: dict):
    """
    Create/merge the Case and Document nodes.
    """

    query = """
    MERGE (c:Case {case_id: $case_id})
    
    MERGE (d:Document {document_id: $document_id})
    SET
        d.filename = $filename,
        d.document_type = $document_type,
        d.processing_status = $processing_status,
        d.processed_at = $processed_at
    
    MERGE (c)-[:HAS_DOCUMENT]->(d)
    """

    session.run(
        query,
        case_id=document["case_id"],
        document_id=document["document_id"],
        filename=document.get("filename"),
        document_type=document.get("document_type"),
        processing_status=document.get("processing_status"),
        processed_at=document.get("processed_at"),
    ).consume()


def _link_document_to_master_entity(
    session,
    document: dict,
    label: str,
    property_name: str,
    property_value,
    entity_type: str,
    entity_value: str,
    description: str | None,
):
    """
    Connect a current investigation document to an existing
    canonical master entity.
    """

    query = f"""
    MATCH (e:{label} {{{property_name}: $property_value}})
    MATCH (d:Document {{document_id: $document_id}})

    MERGE (d)-[r:MENTIONS]->(e)

    SET
        r.entity_type = $entity_type,
        r.entity_value = $entity_value,
        r.description = $description

    SET
        r.document_ids =
            CASE
                WHEN $document_id IN coalesce(r.document_ids, [])
                THEN r.document_ids
                ELSE coalesce(r.document_ids, []) + $document_id
            END

    SET
        r.case_ids =
            CASE
                WHEN $case_id IN coalesce(r.case_ids, [])
                THEN r.case_ids
                ELSE coalesce(r.case_ids, []) + $case_id
            END
    """

    session.run(
        query,
        property_value=property_value,
        document_id=document["document_id"],
        case_id=document["case_id"],
        entity_type=entity_type,
        entity_value=entity_value,
        description=description,
    ).consume()


def _create_unmatched_investigation_entity(
    session,
    document: dict,
    entity_type: str,
    value: str,
    description: str | None,
):
    """
    Preserve an AI-extracted entity when it could not be matched
    with a canonical master entity.
    """

    entity_id = _make_case_entity_id(
        document["case_id"],
        document["document_id"],
        entity_type,
        value,
    )

    query = """
    MATCH (d:Document {document_id: $document_id})

    MERGE (e:InvestigationEntity {
        entity_id: $entity_id
    })

    SET
        e.case_id = $case_id,
        e.document_id = $document_id,
        e.entity_type = $entity_type,
        e.value = $value,
        e.description = $description

    MERGE (d)-[:MENTIONS]->(e)
    """

    session.run(
        query,
        entity_id=entity_id,
        case_id=document["case_id"],
        document_id=document["document_id"],
        entity_type=entity_type,
        value=value,
        description=description,
    ).consume()


def sync_processed_document(document: dict):
    """
    Sync one processed current-case document from MongoDB
    (netra_active.processed_documents) into Neo4j.

    Master entities are NOT duplicated.

    Existing canonical entities are linked:
        Document -[:MENTIONS]-> Person
        Document -[:MENTIONS]-> Phone
        Document -[:MENTIONS]-> Vehicle
        Document -[:MENTIONS]-> Account
        Document -[:MENTIONS]-> License

    Entities that cannot be matched to master data are stored as:
        Document -[:MENTIONS]-> InvestigationEntity
    """

    if not document:
        raise ValueError("Processed document is empty.")

    case_id = document.get("case_id")
    document_id = document.get("document_id")

    if not case_id:
        raise ValueError("Processed document is missing case_id.")

    if not document_id:
        raise ValueError("Processed document is missing document_id.")

    data = document.get("data", {})

    extracted_entities = data.get("extracted_entities", [])
    database_intelligence = data.get("database_intelligence", [])

    if not isinstance(extracted_entities, list):
        extracted_entities = []

    if not isinstance(database_intelligence, list):
        database_intelligence = []

    matched_entity_keys = set()

    with driver.session() as session:

        # ----------------------------------------------------
        # 1. Create Case + Document
        # ----------------------------------------------------
        _create_case_and_document(session, document)

        # ----------------------------------------------------
        # 2. Connect AI entities to canonical master entities
        # ----------------------------------------------------
        for intelligence in database_intelligence:

            collection = intelligence.get("collection")
            entity_type = intelligence.get("entity_type")
            entity_value = intelligence.get("entity_value")
            matched_records = intelligence.get("matched_records", [])

            if not collection:
                continue

            if not isinstance(matched_records, list):
                continue

            for record in matched_records:

                identity = _extract_master_identity(
                    collection,
                    record,
                )

                if not identity:
                    continue

                label, property_name, property_value = identity

                description = None

                for extracted in extracted_entities:
                    if (
                        extracted.get("entity_type") == entity_type
                        and str(extracted.get("value", "")).strip().lower()
                        == str(entity_value or "").strip().lower()
                    ):
                        description = extracted.get("description")

                        matched_entity_keys.add(
                            (
                                str(entity_type).strip().lower(),
                                str(entity_value).strip().lower(),
                            )
                        )

                        break

                _link_document_to_master_entity(
                    session=session,
                    document=document,
                    label=label,
                    property_name=property_name,
                    property_value=property_value,
                    entity_type=entity_type,
                    entity_value=entity_value,
                    description=description,
                )

        # ----------------------------------------------------
        # 3. Preserve unmatched AI entities
        # ----------------------------------------------------
        for entity in extracted_entities:

            entity_type = entity.get("entity_type")
            value = entity.get("value")
            description = entity.get("description")

            if not entity_type or value is None:
                continue

            entity_key = (
                str(entity_type).strip().lower(),
                str(value).strip().lower(),
            )

            if entity_key in matched_entity_keys:
                continue

            _create_unmatched_investigation_entity(
                session=session,
                document=document,
                entity_type=entity_type,
                value=str(value),
                description=description,
            )

    return {
        "case_id": case_id,
        "document_id": document_id,
        "extracted_entities": len(extracted_entities),
        "database_intelligence_records": len(database_intelligence),
        "status": "completed",
    }