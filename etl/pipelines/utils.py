import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables from the .env file co-located with this file,
# so the API key is found regardless of the working directory.
_ENV_FILE = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_ENV_FILE, override=True)

logger = logging.getLogger(__name__)

# Base directory for local JSON dataset fallback
BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data" / "structured"
PROMPT_DIR = Path(__file__).parent / "prompt"

COLLECTION_FILE_MAP = {
    "persons": "persons_global.json",
    "phones": "phones_global.json",
    "vehicles": "vehicles_global.json",
    "accounts": "accounts_global.json",
    "call_records": "call_records_global.json",
    "licenses": "licenses_global.json",
}


# ==============================================================================
# 1. DOCUMENT READER UTILITIES
# ==============================================================================
def extract_text_from_file(file_path: Path | str) -> str:
    """
    Extract text content from a given file path.
    Supports .txt, .md, .json, .log, .csv, .pdf, and general text fallback.
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
# 3. LLM FACTORY & WRAPPER
# ==============================================================================
import base64
try:
    from langchain_ollama import ChatOllama
except ImportError:
    from langchain_community.chat_models import ChatOllama
from langchain_core.messages import HumanMessage

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
    Returns the schema description of the Global Master Database collections.
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
                    "data.phone_id": "Unique phone ID string (e.g. PHONE_36c5dc5d)",
                    "data.phone_number": "10-digit mobile number string or identifier",
                    "data.service_provider": "Telecom operator name",
                    "data.imei": "IMEI number string",
                    "data.owner_person_id": "Owner person ID string"
                }
            },
            "vehicles": {
                "description": "Vehicle registration details.",
                "fields": {
                    "data.vehicle_id": "Unique vehicle ID string (e.g. VEHICLE_a7345df8)",
                    "data.registration_number": "Vehicle license plate / reg number string",
                    "data.model": "Vehicle model & make string",
                    "data.color": "Vehicle color",
                    "data.owner_person_id": "Owner person ID string"
                }
            },
            "accounts": {
                "description": "Financial and bank account information.",
                "fields": {
                    "data.account_id": "Unique account ID string (e.g. ACCOUNT_460d71b9)",
                    "data.account_number": "Bank account number or UPI ID string",
                    "data.bank_name": "Name of the financial institution",
                    "data.owner_person_id": "Owner person ID string"
                }
            },
            "call_records": {
                "description": "Call detail records (CDR) between phone numbers.",
                "fields": {
                    "data.cdr_id": "Unique call record ID",
                    "data.caller_phone": "Caller phone number / phone ID",
                    "data.receiver_phone": "Receiver phone number / phone ID",
                    "data.timestamp": "Date and time of call",
                    "data.duration_seconds": "Call duration in seconds"
                }
            },
            "licenses": {
                "description": "Driving licenses and identity verification documents.",
                "fields": {
                    "data.license_id": "Unique license ID string (e.g. DL_92dd77e3)",
                    "data.license_number": "Driving license / ID number",
                    "data.issuing_authority": "Authority location / state",
                    "data.holder_person_id": "Holder person ID string"
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
                "MongoDB SSL handshake failed. This is almost always caused by your current IP "
                "not being whitelisted in MongoDB Atlas. Go to: "
                "Atlas Dashboard → Network Access → IP Access List → Add your IP (or 0.0.0.0/0 for dev). "
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
                match_found = False
                for field_path, condition in mongo_query.items():
                    if isinstance(condition, dict) and "$regex" in condition:
                        regex_val = condition["$regex"]
                        if match_dict(record, field_path, regex_val, is_regex=True):
                            match_found = True
                            break
                    elif isinstance(condition, str):
                        if match_dict(record, field_path, condition):
                            match_found = True
                            break
                if match_found:
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
    itself is unavailable.
    """
    if not queries:
        return []

    mongo_results = query_mongodb(queries)

    return mongo_results
