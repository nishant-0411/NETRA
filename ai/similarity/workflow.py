from ai.similarity.vector_database import create_vdb
from langchain_core.documents import Document
from pathlib import Path
import uuid

# Initialized once when this module is first imported
_chroma = create_vdb()
_retriver = _chroma.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={"k": 5, "score_threshold": 0.7}
)


# < ---- Calculating Similarity ---- >
def get_similar_case_report(ip_report: Path):
    """
    Find the most similar past case reports to a given input report.

    Reads the text of the input report file, embeds it, and performs a
    similarity search against the "case-reports" Chroma vector database,
    returning up to 5 matches with a similarity score of at least 0.7.

    Args:
        ip_report (Path): Path to the input report text file to compare
            against the vector database.

    Returns:
        list[dict]: A list of matching reports, each as a dict with:
            - "content" (str): The matched report's full text.
            - "case_id" (str): The case ID the matched report belongs to.
            - "report" (str): The filename of the matched report.
        Returns an empty list if no reports meet the score threshold.
    """
    with open(ip_report, "r", encoding="utf-8") as file:
        ip_text = file.read()

    results = _retriver.invoke(ip_text)

    return [
        {"content": r.page_content, "case_id": r.metadata["case_id"], "report": r.metadata["report"]}
        for r in results
    ]


# < ---- Adding A New Document ---- >
def add_document_to_vdb(ip_report: Path, case_id = None, report_name = None):
    """
    Add a new report document to the vector database.

    Reads the text content of the given file and stores it in the
    "case-reports" Chroma collection as a new Document. A fresh UUID is
    assigned as the document's ID.

    Args:
        ip_report (Path): Path to the report text file to add.
        case_id (str, optional): Case ID to tag this report with. If not
            given, falls back to ip_report.parent.name (useful for local
            files already organized in case-ID folders, but NOT reliable
            for files saved to a temp directory, e.g. from an API upload -
            pass this explicitly in that situation).
        report_name (str, optional): Report filename to store as metadata.
            If not given, falls back to ip_report.name (which may be a
            randomized temp filename if the file was saved via an upload -
            pass the original filename explicitly in that situation).

    Returns:
        str: The UUID assigned to the newly added document.
    """
    with open(ip_report, "r", encoding="utf-8") as file:
        report_content = file.read()

    doc_id = str(uuid.uuid4())

    document = Document(
        page_content=report_content,
        metadata={
            "case_id": case_id or ip_report.parent.name,
            "report": report_name or ip_report.name
        },
        id=doc_id
    )

    _chroma.add_documents([document])

    return doc_id


# < ---- Removing A Document ---- >
def delete_document_from_vdb(ip_report: Path, case_id = None, report_name = None):
    """
    Delete a report document from the vector database by case_id/report.

    Removes any matching document(s) from the "case-reports" Chroma
    collection. Use this after add_document_to_vdb() to undo an upload.

    Args:
        ip_report (Path): Path to the report file whose corresponding
            vector-database entry should be deleted. The file itself is
            not read or touched - only used to derive case_id/report
            metadata if those aren't passed explicitly.
        case_id (str, optional): Case ID to match against. Falls back to
            ip_report.parent.name if not given (see add_document_to_vdb
            for why this matters for uploaded/temp files).
        report_name (str, optional): Report filename to match against.
            Falls back to ip_report.name if not given.

    Returns:
        None
    """
    _chroma.delete(where={
        "$and": [
            {"case_id": case_id or ip_report.parent.name},
            {"report": report_name or ip_report.name}
        ]
    })


def delete_document_by_id(doc_id: str):
    """
    Delete a specific report document from the vector database by its ID.

    Use this when you already have the UUID returned by
    add_document_to_vdb() and want precise, unambiguous deletion instead
    of matching by case_id/report metadata.

    Args:
        doc_id (str): The UUID of the document to delete.

    Returns:
        None
    """
    _chroma.delete(ids=[doc_id])