"""
Backward-compatibility alias module for extract_entity.py.
"""

from etl.pipelines.extract_entity import (
    extract_entities_and_descriptions,
    heuristic_fallback_extraction,
    generate_db_queries,
    fallback_query_generation
)

__all__ = [
    "extract_entities_and_descriptions",
    "heuristic_fallback_extraction",
    "generate_db_queries",
    "fallback_query_generation"
]
