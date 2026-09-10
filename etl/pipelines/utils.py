import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from langchain_core.language_models.llms import LLM
from langchain_core.callbacks.manager import CallbackManagerForLLMRun

# Load environment variables from the .env file co-located with this file,
# so the API key is found regardless of the working directory.
_ENV_FILE = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_ENV_FILE, override=True)

logger = logging.getLogger(__name__)

# Base directory for local JSON dataset fallback
BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data" / "structured"
PROMPT_DIR = Path(__file__).parent / "prompt"

HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HUGGINGFACE_MODEL = "meta-llama/Llama-3.1-8B-Instruct"

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
class LangChainHuggingFaceLLM(LLM):
    """
    Custom LangChain LLM wrapper for Hugging Face Inference Client.
    """
    api_key: str = ""
    model_name: str = "meta-llama/Llama-3.1-8B-Instruct"
    temperature: float = 0.1
    max_tokens: int = 1024

    def __init__(self, **data: Any):
        super().__init__(**data)
        if not self.api_key:
            self.api_key = os.getenv("HUGGINGFACE_API_KEY", "").strip()
        if not self.model_name:
            self.model_name = HUGGINGFACE_MODEL.strip()
        logger.info(f"[LangChainHuggingFaceLLM] Initialized. API key present: {bool(self.api_key)}")

    @property
    def _llm_type(self) -> str:
        return "huggingface_inference_api"

    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        key = self.api_key.strip() or os.getenv("HUGGINGFACE_API_KEY", "").strip()
        model = self.model_name.strip() or os.getenv("HUGGINGFACE_MODEL", "meta-llama/Llama-3.2-3B-Instruct").strip()

        if not key:
            logger.warning("Hugging Face API key is missing. Set HUGGINGFACE_API_KEY environment variable.")
            return ""

        try:
            from huggingface_hub import InferenceClient
            client = InferenceClient(model=model, token=key)

            # First attempt: text_generation (works for most HF-hosted models)
            try:
                logger.info(f"[LLM] Attempting text_generation for model: {model}")
                response = client.text_generation(
                    prompt,
                    max_new_tokens=self.max_tokens,
                    temperature=self.temperature,
                    return_full_text=False,
                )
                return response or ""

            except Exception as text_gen_err:
                # Groq-backed models (e.g. Llama via Groq provider) only support
                # the 'conversational' task — fall back to chat_completion.
                if "not supported" in str(text_gen_err).lower() or "conversational" in str(text_gen_err).lower():
                    logger.info(f"[LLM] text_generation not supported ({text_gen_err}); retrying with chat_completion.")
                    messages = [{"role": "user", "content": prompt}]
                    chat_response = client.chat_completion(
                        messages=messages,
                        max_tokens=self.max_tokens,
                        temperature=self.temperature,
                    )
                    return chat_response.choices[0].message.content or ""
                raise  # Re-raise if it's a different error

        except Exception as e:
            logger.error(f"Hugging Face LLM execution failed: {e}")
            return ""


def get_langchain_llm() -> Optional[LangChainHuggingFaceLLM]:
    """
    Returns a LangChain LLM instance initialized with Hugging Face configuration.
    """
    # Re-read at call time so the value loaded by load_dotenv is used
    # even if the module-level HUGGINGFACE_API_KEY was captured as None.
    key = os.getenv("HUGGINGFACE_API_KEY", "").strip()
    model = "meta-llama/Llama-3.1-8B-Instruct"
    logger.info(f"[LLM Factory] API key present: {bool(key)}, model: {model}")
    return LangChainHuggingFaceLLM(api_key=key, model_name=model)


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
