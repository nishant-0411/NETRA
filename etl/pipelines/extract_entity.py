import json
import logging
import re
from typing import Any, Dict, List
from etl.pipelines.utils import load_prompt_template, get_langchain_llm

logger = logging.getLogger(__name__)


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
        ("Phone", r"\b[6-9]\d{9}\b"),
        ("Vehicle", r"\b[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}\b"),
    ]

    for etype, pattern in patterns:
        for val in re.findall(pattern, text):
            if val not in seen:
                seen.add(val)
                entities.append({
                    "entity_type": etype,
                    "value": val,
                    "description": f"{etype} entity {val} found in text."
                })

    # Names pattern fallback
    name_pattern = r"\b(?:Mr\.|Ms\.|Mrs\.|Dr\.|Adv\.)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b"
    for name in re.findall(name_pattern, text):
        if name not in seen and len(name) > 3:
            if not any(w in name for w in ["Police", "Station", "Report", "Section", "State", "Court", "Sub Inspector"]):
                seen.add(name)
                entities.append({
                    "entity_type": "Person",
                    "value": name,
                    "description": f"Person {name} referenced in text."
                })

    return entities


def _generate_fallback_queries(entities: List[dict]) -> List[dict]:
    """Lightweight query generator fallback when LLM response is empty or unparseable."""
    queries = []
    mapping = {
        "Person": ("persons", "data.name"),
        "Phone": ("phones", "data.phone_number"),
        "Vehicle": ("vehicles", "data.registration_number"),
        "Account": ("accounts", "data.account_number"),
        "License": ("licenses", "data.license_number")
    }

    for item in entities:
        etype = item.get("entity_type", "")
        eval_str = item.get("value", "")

        if etype in mapping:
            coll, field = mapping[etype]
            queries.append({
                "collection": coll,
                "query": {field: {"$regex": eval_str, "$options": "i"}},
                "entity_value": eval_str,
                "entity_type": etype
            })
        else:
            queries.append({
                "collection": "persons",
                "query": {"$or": [{"data.name": {"$regex": eval_str, "$options": "i"}}, {"data.address": {"$regex": eval_str, "$options": "i"}}]},
                "entity_value": eval_str,
                "entity_type": etype
            })

    return queries


# ==============================================================================
# 1. LLM ENTITY EXTRACTION
# ==============================================================================
def extract_entities_and_descriptions(text: str) -> Dict[str, Any]:
    """
    Extracts entities and descriptions using Hugging Face LLM (with lightweight fallback).
    """
    if not text.strip():
        return {"entities": []}

    llm = get_langchain_llm()
    if llm and llm.api_key.strip():
        try:
            prompt_raw = load_prompt_template("entity_extraction_prompt.txt")
            from langchain_core.prompts import PromptTemplate
            prompt_template = PromptTemplate.from_template(prompt_raw)
            chain = prompt_template | llm
            llm_output = chain.invoke({"document_text": text})

            if llm_output:
                json_match = re.search(r"\{.*\}", llm_output, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group(0))
                    if "entities" in data and data["entities"]:
                        return data
        except Exception as e:
            logger.error(f"LLM entity extraction failed: {e}")

    # Fallback if API key missing or LLM call returned empty/unparseable result
    fallback_entities = _extract_fallback_entities(text)
    return {"entities": fallback_entities}


# ==============================================================================
# 2. LLM DATABASE QUERY GENERATION
# ==============================================================================
def generate_db_queries(entities_data: Any, schema: dict) -> List[dict]:
    """
    Generates database search queries for extracted entities using Hugging Face LLM (with lightweight fallback).
    """
    entities_list = entities_data.get("entities", []) if isinstance(entities_data, dict) else entities_data
    if not entities_list:
        return []

    llm = get_langchain_llm()
    if llm and llm.api_key.strip():
        try:
            prompt_raw = load_prompt_template("query_generation_prompt.txt")
            from langchain_core.prompts import PromptTemplate
            prompt_template = PromptTemplate.from_template(prompt_raw)
            chain = prompt_template | llm
            llm_output = chain.invoke({
                "db_schema": json.dumps(schema, indent=2),
                "extracted_entities": json.dumps(entities_list, indent=2)
            })

            if llm_output:
                json_match = re.search(r"\[.*\]", llm_output, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    if isinstance(parsed, list) and parsed:
                        return parsed
        except Exception as e:
            logger.error(f"LLM query generation failed: {e}")

    return _generate_fallback_queries(entities_list)
