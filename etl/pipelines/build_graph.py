import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict
from langgraph.graph import StateGraph, START, END

from etl.pipelines.utils import (
    extract_text_from_file,
    get_database_schema,
    execute_entity_queries,
)
from etl.pipelines.extract_entity import (
    extract_entities_and_descriptions,
    generate_db_queries,
)

logger = logging.getLogger(__name__)


# ==============================================================================
# 1. ETL PIPELINE STATE DEFINITION
# ==============================================================================
class ETLPipelineState(TypedDict, total=False):
    """
    LangGraph State definition for the NETRA ETL pipeline.
    """
    file_path: str
    case_id: Optional[str]
    document_id: Optional[str]
    metadata: Dict[str, Any]

    document_text: str
    extracted_entities: List[Dict[str, Any]]
    db_schema: Dict[str, Any]
    generated_queries: List[Dict[str, Any]]
    database_intelligence: List[Dict[str, Any]]

    status: str
    summary: Dict[str, Any]
    errors: List[str]


# ==============================================================================
# 2. LANGGRAPH WORKFLOW NODES
# ==============================================================================
def read_document_node(state: ETLPipelineState) -> Dict[str, Any]:
    """
    LangGraph Node: Reads file path and loads extracted text into state.
    """
    file_path = state.get("file_path")
    logger.info(f"[LangGraph Node: read_document] Reading file: {file_path}")
    text = extract_text_from_file(file_path)
    return {"document_text": text}


def extract_entities_node(state: ETLPipelineState) -> Dict[str, Any]:
    """
    LangGraph Node: Extracts entities and descriptions from document text.
    """
    text = state.get("document_text", "")
    logger.info("[LangGraph Node: extract_entities] Running entity extraction.")
    entities_data = extract_entities_and_descriptions(text)
    entities_list = entities_data.get("entities", []) if isinstance(entities_data, dict) else entities_data
    return {"extracted_entities": entities_list}


def fetch_schema_node(state: ETLPipelineState) -> Dict[str, Any]:
    """
    LangGraph Node: Injects master database schema into state.
    """
    logger.info("[LangGraph Node: fetch_schema] Fetching database schema.")
    schema = get_database_schema()
    return {"db_schema": schema}


def generate_queries_node(state: ETLPipelineState) -> Dict[str, Any]:
    """
    LangGraph Node: Generates database search queries based on extracted entities and schema.
    """
    entities = state.get("extracted_entities", [])
    schema = state.get("db_schema", {})
    logger.info("[LangGraph Node: generate_queries] Running query generation.")

    if not entities:
        return {"generated_queries": []}

    queries = generate_db_queries(entities, schema)
    return {"generated_queries": queries}


def execute_queries_node(state: ETLPipelineState) -> Dict[str, Any]:
    """
    LangGraph Node: Executes generated queries against master database or local JSON dataset.
    """
    queries = state.get("generated_queries", [])
    logger.info(f"[LangGraph Node: execute_queries] Executing {len(queries)} queries.")
    db_results = execute_entity_queries(queries)
    return {"database_intelligence": db_results}


def format_output_node(state: ETLPipelineState) -> Dict[str, Any]:
    """
    LangGraph Node: Finalizes summary statistics and output status.
    """
    file_path = Path(state.get("file_path", ""))
    entities = state.get("extracted_entities", [])
    queries = state.get("generated_queries", [])
    db_intel = state.get("database_intelligence", [])

    return {
        "status": "SUCCESS",
        "file_name": file_path.name,
        "summary": {
            "total_entities_extracted": len(entities),
            "total_queries_generated": len(queries),
            "entities_matched_in_database": len(db_intel)
        }
    }


# ==============================================================================
# 3. BUILD LANGGRAPH WORKFLOW
# ==============================================================================
def build_etl_graph():
    """
    Builds and compiles the stateful LangGraph workflow graph for the NETRA ETL pipeline.
    """
    builder = StateGraph(ETLPipelineState)

    # Add Nodes
    builder.add_node("read_document", read_document_node)
    builder.add_node("extract_entities", extract_entities_node)
    builder.add_node("fetch_schema", fetch_schema_node)
    builder.add_node("generate_queries", generate_queries_node)
    builder.add_node("execute_queries", execute_queries_node)
    builder.add_node("format_output", format_output_node)

    # Define Graph Edges
    builder.add_edge(START, "read_document")
    builder.add_edge("read_document", "extract_entities")
    builder.add_edge("extract_entities", "fetch_schema")
    builder.add_edge("fetch_schema", "generate_queries")
    builder.add_edge("generate_queries", "execute_queries")
    builder.add_edge("execute_queries", "format_output")
    builder.add_edge("format_output", END)

    return builder.compile()


# Compiled Graph Instance
etl_graph = build_etl_graph()
