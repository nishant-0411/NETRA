"""
Manual test script for the case-report similarity workflow.

Tests two things end-to-end against the real Chroma vector database:
    1. add_document_to_vdb  - adding a new report into the vector DB
    2. get_similar_case_report - retrieving similar reports for a query file

Usage:
    Edit INPUT_FILE below to point at a report .txt file on your machine,
    then run:

        python test_workflow.py

    To only test retrieval without inserting anything new, run with:

        python test_workflow.py --skip-add
"""

import argparse
from pathlib import Path

from ai.similarity.workflow import add_document_to_vdb, get_similar_case_report

# <---- Edit this before running ---- >
INPUT_FILE = Path("D:\\Coding\\XYZ\\NETRA\\ai\\similarity\\test.txt")


def test_add_document(file_path: Path):
    """
    Test adding a document to the vector database.

    Calls add_document_to_vdb() with the given file path and prints the
    UUID that was assigned to the newly stored document.

    Args:
        file_path (Path): Path to the report file to add.

    Returns:
        str: The UUID of the newly added document.
    """
    print(f"\n[ADD] Adding document: {file_path}")
    doc_id = add_document_to_vdb(file_path)
    print(f"[ADD] Success. Document stored with id: {doc_id}")
    return doc_id


def test_similarity_search(file_path: Path):
    """
    Test running a similarity search against the vector database.

    Calls get_similar_case_report() with the given file path and prints
    each returned match's case_id, report filename, and a short preview
    of its content.

    Args:
        file_path (Path): Path to the report file to use as the query.

    Returns:
        list[dict]: The raw results returned by get_similar_case_report().
    """
    print(f"\n[SEARCH] Finding similar reports for: {file_path}")
    results = get_similar_case_report(file_path)

    if not results:
        print("[SEARCH] No matches found above the similarity threshold.")
        return results

    print(f"[SEARCH] Found {len(results)} match(es):\n")
    for i, match in enumerate(results, start=1):
        preview = match["content"][:150].replace("\n", " ")
        print(f"  {i}. case_id={match['case_id']}  report={match['report']}")
        print(f"     preview: {preview}...\n")

    return results


def main():
    """
    Run the workflow test: validate the input file, optionally add it to
    the vector database, then run a similarity search using the same file.
    """
    parser = argparse.ArgumentParser(description="Test the case-report similarity workflow.")
    parser.add_argument("--skip-add", action="store_true", help="Skip adding the document; only test similarity search.")
    args = parser.parse_args()

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"INPUT_FILE not found: {INPUT_FILE}\n"
            f"Edit INPUT_FILE at the top of this script to point at a real report .txt file."
        )



    test_similarity_search(INPUT_FILE)
    print("Similarity Tested")

    test_add_document(INPUT_FILE)
    print("Adding Document Tested")

    print("\nWorkflow test complete.")


if __name__ == "__main__":
    main()