"""
Backward-compatibility alias module for run_etl_pipeline and build_etl_graph.
Consolidated implementations reside in build_graph.py and ingest.py.
"""

from etl.pipelines.build_graph import build_etl_graph, etl_graph
from etl.pipelines.ingest import run_etl_pipeline, ingest_file, ingest_directory

__all__ = ["build_etl_graph", "etl_graph", "run_etl_pipeline", "ingest_file", "ingest_directory"]
