import json
import logging
import os
import re
import base64
from pathlib import Path
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

try:
    from langchain_ollama import ChatOllama
except ImportError:
    from langchain_community.chat_models import ChatOllama
from langchain_core.messages import HumanMessage

_ENV_FILE = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_ENV_FILE, override=True)

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data" / "structured"
PROMPT_DIR = Path(__file__).parent / "prompt"

COLLECTION_FILE_MAP = {
    "persons": "persons_global.json",
    "phones": "phones_global.json",
    "vehicles": "vehicles_global.json",
    "accounts": "accounts_global.json",
    "licenses": "licenses_global.json",
    "call_records": "call_records_global.json",
    "social_media": "social_media_global.json",
    "weapons": "weapons_global.json",
    "transactions": "transactions_global.json",
    "edges": "edges_global.json",
}


# ==============================================================================
# 1. DOCUMENT READER UTILITIES
# ==============================================================================

def extract_text_from_file(file_path: Path | str) -> str:
    """
    Extract text content from a given file path.
    Supports .txt, .md, .json, .log, .csv, .pdf, images (.png, .jpg, .jpeg, .webp), and general text fallback.
    """
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    suffix = path.suffix.lower()

    try:
        if suffix in [".txt", ".md", ".log", ".csv"]:
            return path.read_text(encoding="utf-8", errors="replace")

        elif suffix == ".json":
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                data = json.load(f)
                return json.dumps(data, indent=2)

        elif suffix == ".pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(str(path))
                text_pages = [page.extract_text() or "" for page in reader.pages]
                return "\n".join(text_pages)
            except ImportError:
                try:
                    import fitz  # PyMuPDF
                    doc = fitz.open(str(path))
                    text_pages = [page.get_text() for page in doc]
                    return "\n".join(text_pages)
                except ImportError:
                    logger.warning("PDF libraries not installed; using raw text fallback.")
                    return path.read_text(encoding="utf-8", errors="ignore")

        elif suffix in [".png", ".jpg", ".jpeg", ".webp"]:
            return extract_text_from_image(path)

        else:
            return path.read_text(encoding="utf-8", errors="replace")

    except Exception as e:
        logger.error(f"Error reading file {path}: {e}")
        raise RuntimeError(f"Failed to extract text from {path}: {str(e)}")


# ==============================================================================
# 2. PROMPT LOADER UTILITY
# ==============================================================================

def load_prompt_template(filename: str) -> str:
    """
    Loads prompt template file from prompt directory.
    """
    filepath = PROMPT_DIR / filename
    if filepath.exists():
        return filepath.read_text(encoding="utf-8")
    raise FileNotFoundError(f"Prompt template not found at {filepath}")


# ==============================================================================
# 3. LLM FACTORY & VISION MODEL WRAPPER
# ==============================================================================

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
QWEN_TEXT_MODEL = os.getenv("QWEN_TEXT_MODEL", "qwen3-4b")
QWEN_VISION_MODEL = os.getenv("QWEN_VISION_MODEL", "qwen3-4b-VL")

def get_langchain_llm():
    """
    Returns a LangChain LLM instance initialized with a local Ollama endpoint for Qwen3.
    """
    logger.info(f"[LLM Factory] Initializing local text model: {QWEN_TEXT_MODEL} at {OLLAMA_BASE_URL}")
    return ChatOllama(
        base_url=OLLAMA_BASE_URL,
        model=QWEN_TEXT_MODEL,
        temperature=0.1,
    )

def extract_text_from_image(image_path: Path) -> str:
    """
    Extract text from an image using the local Qwen3-VL vision model.
    """
    logger.info(f"[Vision Model] Extracting text from image: {image_path}")
    try:
        with open(image_path, "rb") as image_file:
            image_data = base64.b64encode(image_file.read()).decode("utf-8")
        
        vision_llm = ChatOllama(
            base_url=OLLAMA_BASE_URL,
            model=QWEN_VISION_MODEL,
            temperature=0.1,
        )
        
        message = HumanMessage(
            content=[
                {"type": "text", "text": "Extract all readable text, entities, and information from this image. Return it as structured text."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}},
            ]
        )
        response = vision_llm.invoke([message])
        return response.content or ""
    except Exception as e:
        logger.error(f"[Vision Model] Error processing image {image_path}: {e}")
        return ""


# ==============================================================================
# 4. DATABASE SCHEMA PROVIDER
# ==============================================================================

def get_database_schema() -> dict:
    """
    Returns the schema description of all Global Master Database collections.
    """
    return {
        "collections": {
            "persons": {
                "description": "Information about individual persons/suspects/entities.",
                "fields": {
                    "data.person_id": "Unique person ID string (e.g., PERSON_f9d8f1ef)",
                    "data.name": "Full name of person (e.g. Advik Maharaj)",
                    "data.gender": "Gender string (M/F)",
                    "data.dob": "Date of birth string (YYYY-MM-DD)",
                    "data.address": "Residential / office address string",
                    "data.phones": "Array of phone IDs (e.g. ['PHONE_36c5dc5d'])",
                    "data.vehicles": "Array of vehicle IDs (e.g. ['VEHICLE_a7345df8'])",
                    "data.accounts": "Array of bank account IDs (e.g. ['ACCOUNT_460d71b9'])",
                    "data.licenses": "Array of license IDs (e.g. ['DL_92dd77e3'])",
                    "data.social_handles": "Array of social media handle strings"
                }
            },
            "phones": {
                "description": "Phone numbers and device details.",
                "fields": {
                    "data.result.mobile_no": "Phone number",
                    "data.result.name": "Registered owner name",
                    "data.result.pan_number": "Registered PAN number"
                }
            },
            "vehicles": {
                "description": "Vehicle registration details.",
                "fields": {
                    "data.result.rc_number": "Vehicle registration number",
                    "data.result.owner_name": "Registered owner name",
                    "data.result.maker_model": "Vehicle model and make",
                    "data.result.color": "Vehicle color",
                    "data.result.vehicle_chasi_number": "Vehicle chassis number"
                }
            },
            "accounts": {
                "description": "Bank and financial account information.",
                "fields": {
                    "data.result.account_number": "Bank account number",
                    "data.result.account_holder": "Account holder name",
                    "data.result.bank_name": "Financial institution",
                    "data.result.ifsc_code": "IFSC code"
                }
            },
            "licenses": {
                "description": "Driving licenses and identity documents.",
                "fields": {
                    "data.result.license_number": "License or ID number",
                    "data.result.name": "License holder name",
                    "data.result.ola_name": "Issuing authority",
                    "data.result.permanent_address": "Holder address"
                }
            },
            "call_records": {
                "description": "Call detail records between phones.",
                "fields": {
                    "cdr_id": "Unique call record ID",
                    "caller_no": "Caller phone number",
                    "receiver_no": "Receiver phone number",
                    "timestamp": "Call timestamp",
                    "duration_seconds": "Call duration",
                    "call_type": "INCOMING / OUTGOING / MISSED",
                    "cell_tower_location": "Cell tower location identifier",
                    "imei": "Device IMEI number"
                }
            },
            "social_media": {
                "description": "Social media accounts and handles.",
                "fields": {
                    "sm_id": "Unique social media interaction ID",
                    "platform": "Social media platform",
                    "from_handle": "Originating username or handle",
                    "to_handle": "Receiving username or handle",
                    "from_person_id": "Originating person ID",
                    "to_person_id": "Receiving person ID"
                }
            },
            "weapons": {
                "description": "Weapons and seized items.",
                "fields": {
                    "weapon_id": "Unique weapon ID",
                    "type": "Weapon or seized item type",
                    "description": "Description of weapon or seized item",
                    "seized_from_person_id": "Person from whom it was seized"
                }
            },
            "transactions": {
                "description": "Financial transactions.",
                "fields": {
                    "tx_id": "Unique transaction ID",
                    "amount": "Transaction amount",
                    "from_account_number": "Sender account number",
                    "to_account_number": "Receiver account number",
                    "from_holder": "Sender account holder",
                    "to_holder": "Receiver account holder",
                    "date": "Transaction date"
                }
            },
            "edges": {
                "description": "Relationships between entities in the criminal network.",
                "fields": {
                    "source": "Source entity ID",
                    "target": "Target entity ID",
                    "relation": "Relationship type"
                }
            }
        }
    }


# ==============================================================================
# 5. DATABASE QUERY EXECUTOR & DATASET FALLBACK
# ==============================================================================

def query_mongodb(queries: List[dict]) -> List[dict]:
    """
    Attempts to query MongoDB master_db.
    """
    try:
        from apps.backend.app.db.mongodb import master_db
        master_db.command("ping")

        results = []
        for q_item in queries:
            coll_name = q_item.get("collection")
            mongo_query = q_item.get("query", {})
            entity_val = q_item.get("entity_value", "")
            entity_type = q_item.get("entity_type", "")

            if coll_name in master_db.list_collection_names():
                coll = master_db[coll_name]
                docs = list(coll.find(mongo_query, {"_id": 0}).limit(10))
                if docs:
                    results.append({
                        "entity_value": entity_val,
                        "entity_type": entity_type,
                        "collection": coll_name,
                        "query_used": mongo_query,
                        "matched_records": docs
                    })
        return results
    except Exception as e:
        err_str = str(e)
        if "TLSV1_ALERT_INTERNAL_ERROR" in err_str or "SSL handshake failed" in err_str:
            logger.warning(
                "MongoDB SSL handshake failed. IP not whitelisted in MongoDB Atlas. "
                "Falling back to local JSON dataset."
            )
        else:
            logger.info(f"MongoDB master_db query not active ({err_str[:200]}); falling back to structured JSON dataset.")
        return []


def match_dict(item: dict, field_path: str, search_val: str, is_regex: bool = False) -> bool:
    """
    Helper to match nested dictionary field against search_val.
    """
    parts = field_path.split(".")
    curr = item
    path_found = True
    for p in parts:
        if isinstance(curr, dict) and p in curr:
            curr = curr[p]
        else:
            path_found = False
            break

    if path_found and curr is not None:
        if isinstance(curr, list):
            for sub_item in curr:
                if is_regex and re.search(search_val, str(sub_item), re.IGNORECASE):
                    return True
                elif str(search_val).lower() in str(sub_item).lower():
                    return True
            return False

        if is_regex:
            return bool(re.search(search_val, str(curr), re.IGNORECASE))
        return str(search_val).lower() in str(curr).lower()

    item_str = json.dumps(item)
    if is_regex:
        return bool(re.search(search_val, item_str, re.IGNORECASE))
    return str(search_val).lower() in item_str.lower()


def _matches_mongo_filter(record: dict, mongo_query: dict) -> bool:
    """Evaluate the limited MongoDB filter syntax emitted by ETL locally."""
    if "$or" in mongo_query:
        alternatives = mongo_query["$or"]
        return isinstance(alternatives, list) and any(
            _matches_mongo_filter(record, alternative)
            for alternative in alternatives
            if isinstance(alternative, dict)
        )
    if "$and" in mongo_query:
        conditions = mongo_query["$and"]
        return isinstance(conditions, list) and all(
            _matches_mongo_filter(record, condition)
            for condition in conditions
            if isinstance(condition, dict)
        )

    for field_path, condition in mongo_query.items():
        if not isinstance(field_path, str) or field_path.startswith("$"):
            return False
        if isinstance(condition, dict) and "$regex" in condition:
            if not match_dict(record, field_path, str(condition["$regex"]), is_regex=True):
                return False
        elif isinstance(condition, (str, int, float)):
            if not match_dict(record, field_path, str(condition)):
                return False
        else:
            return False
    return True


def query_local_json_dataset(queries: List[dict]) -> List[dict]:
    """
    Queries local JSON structured datasets when MongoDB is offline.
    """
    results = []
    cached_data = {}
    for coll, filename in COLLECTION_FILE_MAP.items():
        fpath = DATA_DIR / filename
        if fpath.exists():
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    cached_data[coll] = json.load(f)
            except Exception as e:
                logger.error(f"Error loading {fpath}: {e}")

    for q_item in queries:
        coll_name = q_item.get("collection", "")
        mongo_query = q_item.get("query", {})
        entity_val = q_item.get("entity_value", "")
        entity_type = q_item.get("entity_type", "")

        dataset = cached_data.get(coll_name, [])
        matched_records = []

        if mongo_query and dataset:
            for record in dataset:
                if _matches_mongo_filter(record, mongo_query):
                    record_copy = dict(record)
                    record_copy.pop("_id", None)
                    matched_records.append(record_copy)
                    if len(matched_records) >= 5:
                        break

        if matched_records:
            results.append({
                "entity_value": entity_val,
                "entity_type": entity_type,
                "collection": coll_name,
                "query_used": mongo_query,
                "matched_records": matched_records
            })

    return results


def execute_entity_queries(queries: List[dict]) -> List[dict]:
    """
    Executes entity queries against MongoDB.
    Falls back to local JSON dataset only when MongoDB
    itself is unavailable or returned incomplete records.
    """
    if not queries:
        return []

    mongo_results = query_mongodb(queries)
    matched_keys = {
        (item.get("entity_type"), item.get("entity_value"), item.get("collection"))
        for item in mongo_results
    }
    unmatched_queries = [
        query for query in queries
        if (
            query.get("entity_type"),
            query.get("entity_value"),
            query.get("collection"),
        ) not in matched_keys
    ]

    return mongo_results + query_local_json_dataset(unmatched_queries)

