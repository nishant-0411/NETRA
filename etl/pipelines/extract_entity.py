import json
import logging
import re
from typing import Any, Dict, List

from etl.pipelines.utils import load_prompt_template, get_langchain_llm

logger = logging.getLogger(__name__)

SUPPORTED_ENTITY_TYPES = {
    "Person", "Phone", "Vehicle", "Account", "License", "Location",
    "Organization", "SocialMedia", "Weapon", "Transaction",
}

# Title-cased headings otherwise resemble person names to the regex fallback.
NON_PERSON_LABELS = {
    "Accused Suspected Persons", "Brief Facts", "Brief Facts Of The Case",
    "Complainant Informant", "Date And Time Of Occurrence",
    "First Information Report", "Investigating Officer", "Place Of Occurrence",
    "Police Personnel", "Police Station", "Suspected Persons",
}


def _normalise_entities(data: Any) -> List[dict]:
    """Keep only valid, supported entities and remove document headings."""
    raw_entities = data.get("entities", []) if isinstance(data, dict) else data
    if not isinstance(raw_entities, list):
        return []

    entities: List[dict] = []
    seen = set()
    for item in raw_entities:
        if not isinstance(item, dict):
            continue
        entity_type = str(item.get("entity_type", "")).strip()
        value = str(item.get("value", "")).strip()
        if entity_type not in SUPPORTED_ENTITY_TYPES or not value:
            continue
        if entity_type == "Person" and value.title() in NON_PERSON_LABELS:
            continue
        key = (entity_type, value.casefold())
        if key in seen:
            continue
        seen.add(key)
        description = str(item.get("description", "")).strip()
        entities.append({
            "entity_type": entity_type,
            "value": value,
            "description": description or f"{entity_type} mentioned in the document.",
        })
    return entities


# ==============================================================================
# FALLBACK ENTITY EXTRACTION
# ==============================================================================

def _extract_fallback_entities(text: str) -> List[dict]:
    """Lightweight fallback entity extraction when LLM response is empty or unparseable."""
    entities = []
    seen = set()

    patterns = [
        ("Person", r"\bPERSON_[a-f0-9]{8}\b"),
        ("Phone", r"\bPHONE_[a-f0-9]{8}\b"),
        ("Vehicle", r"\bVEHICLE_[a-f0-9]{8}\b"),
        ("Account", r"\bACCOUNT_[a-f0-9]{8}\b"),
        ("License", r"\bDL_[a-f0-9]{8}\b"),
        ("SocialMedia", r"\bSOCIALMEDIA_[a-f0-9]{8}\b"),
        ("Weapon", r"\bWEAPON_[a-f0-9]{8}\b"),
        ("Transaction", r"\bTRANSACTION_[a-f0-9]{8}\b"),
        ("Phone", r"\b[6-9]\d{9}\b"),
        ("Vehicle", r"\b[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}\b"),
        ("Vehicle", r"(?i)registration details ending in\s+\*{0,2}(\d{4})\*{0,2}"),
        ("Phone", r"(?i)(?:mobile )?number ending in\s+\*{0,2}(\d{4})\*{0,2}"),
    ]

    for etype, pattern in patterns:
        for val in re.findall(pattern, text):
            val = val.strip()
            if val not in seen:
                seen.add(val)
                entities.append({
                    "entity_type": etype,
                    "value": val,
                    "description": f"{etype} entity {val} found in text."
                })

    # Person name fallback
    name_pattern = (
        r"\b(?:Mr\.|Ms\.|Mrs\.|Dr\.|Adv\.)?\s*"
        r"([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)+)\b"
    )

    for name in re.findall(name_pattern, text):
        if name not in seen and len(name) > 3:
            ignored_words = [
                "Police", "Station", "Report", "Section", "State", "Court", "Sub Inspector",
            ]
            if (
                not any(word in name for word in ignored_words)
                and name.title() not in NON_PERSON_LABELS
            ):
                seen.add(name)
                entities.append({
                    "entity_type": "Person",
                    "value": name,
                    "description": f"Person {name} referenced in text."
                })

    return entities


# ==============================================================================
# FALLBACK DATABASE QUERY GENERATION
# ==============================================================================

def _generate_fallback_queries(entities: List[dict]) -> List[dict]:
    """Fallback query generator for all supported entity types."""
    queries = []
    mapping = {
        "Person": ("persons", "data.name"),
        "Phone": ("phones", "data.result.mobile_no"),
        "Vehicle": ("vehicles", "data.result.rc_number"),
        "Account": ("accounts", "data.result.account_number"),
        "License": ("licenses", "data.result.license_number"),
        "SocialMedia": ("social_media", "from_handle"),
        "Weapon": ("weapons", "description"),
        "Transaction": ("transactions", "tx_id"),
    }

    for item in entities:
        etype = item.get("entity_type", "")
        eval_str = item.get("value", "")

        if etype == "SocialMedia":
            queries.append({
                "collection": "social_media",
                "query": {"$or": [
                    {"from_handle": {"$regex": re.escape(eval_str), "$options": "i"}},
                    {"to_handle": {"$regex": re.escape(eval_str), "$options": "i"}},
                ]},
                "entity_value": eval_str,
                "entity_type": etype,
            })
        elif etype == "Weapon":
            queries.append({
                "collection": "weapons",
                "query": {"$or": [
                    {"weapon_id": {"$regex": re.escape(eval_str), "$options": "i"}},
                    {"type": {"$regex": re.escape(eval_str), "$options": "i"}},
                    {"description": {"$regex": re.escape(eval_str), "$options": "i"}},
                ]},
                "entity_value": eval_str,
                "entity_type": etype,
            })
        elif etype == "Transaction":
            queries.append({
                "collection": "transactions",
                "query": {"$or": [
                    {"tx_id": {"$regex": re.escape(eval_str), "$options": "i"}},
                    {"from_account_number": {"$regex": re.escape(eval_str), "$options": "i"}},
                    {"to_account_number": {"$regex": re.escape(eval_str), "$options": "i"}},
                ]},
                "entity_value": eval_str,
                "entity_type": etype,
            })
        elif etype in mapping:
            collection, field = mapping[etype]
            queries.append({
                "collection": collection,
                "query": {
                    field: {
                        "$regex": re.escape(eval_str),
                        "$options": "i"
                    }
                },
                "entity_value": eval_str,
                "entity_type": etype
            })

    return queries


# ==============================================================================
# 1. LLM ENTITY EXTRACTION
# ==============================================================================

def extract_entities_and_descriptions(text: str) -> Dict[str, Any]:
    """
    Extracts entities and descriptions using local Qwen3 LLM (with fallback).
    """
    if not text.strip():
        return {"entities": []}

    llm = get_langchain_llm()
    if llm:
        try:
            prompt_raw = load_prompt_template("entity_extraction_prompt.txt")
            from langchain_core.prompts import PromptTemplate
            prompt_template = PromptTemplate.from_template(prompt_raw)
            chain = prompt_template | llm
            llm_output = chain.invoke({"document_text": text})

            output_text = llm_output.content if hasattr(llm_output, 'content') else str(llm_output)

            if output_text:
                cleaned = output_text.strip()
                cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
                cleaned = re.sub(r"^```\s*", "", cleaned)
                cleaned = re.sub(r"\s*```$", "", cleaned)

                json_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group(0))
                    if isinstance(data, dict) and "entities" in data:
                        entities = _normalise_entities(data)
                        if entities:
                            return {"entities": entities}
        except Exception as e:
            logger.error(f"LLM entity extraction failed: {e}")

    fallback_entities = _extract_fallback_entities(text)
    return {"entities": fallback_entities}


# ==============================================================================
# 2. LLM DATABASE QUERY GENERATION
# ==============================================================================

def generate_db_queries(entities_data: Any, schema: dict) -> List[dict]:
    """
    Generates database search queries for extracted entities using local Qwen3 LLM.
    """
    entities_list = (
        entities_data.get("entities", [])
        if isinstance(entities_data, dict)
        else entities_data
    )
    if not entities_list:
        return []

    llm = get_langchain_llm()
    if llm:
        try:
            prompt_raw = load_prompt_template("query_generation_prompt.txt")
            from langchain_core.prompts import PromptTemplate
            prompt_template = PromptTemplate.from_template(prompt_raw)
            chain = prompt_template | llm
            llm_output = chain.invoke({
                "db_schema": json.dumps(schema, indent=2),
                "extracted_entities": json.dumps(entities_list, indent=2)
            })

            output_text = llm_output.content if hasattr(llm_output, 'content') else str(llm_output)

            if output_text:
                cleaned = output_text.strip()
                cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
                cleaned = re.sub(r"^```\s*", "", cleaned)
                cleaned = re.sub(r"\s*```$", "", cleaned)

                json_match = re.search(r"\[.*\]", cleaned, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    if isinstance(parsed, list) and parsed:
                        return parsed
        except Exception as e:
            logger.error(f"LLM query generation failed: {e}")

    return _generate_fallback_queries(entities_list)

