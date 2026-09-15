from ai.similarity.vector_database import create_vdb
from langchain_core.documents import Document
from pathlib import Path
import uuid

 # < --- Get chroma retriever ---->
chroma = create_vdb()
retriver = chroma.as_retriever(search_type="similarity_score_threshold",
                                search_kwargs={"k": 5, "score_threshold": 0.6})

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
   

    # Loading The File
    with open(ip_report, "r", encoding="utf-8") as file:
        ip_text = file.read()

    # Perform Similarity Search
    results = retriver.invoke(ip_text)

    final_reports = [{"content": result.page_content, "case_id": result.metadata["case_id"], "report": result.metadata["report"]} for result in results]

    return final_reports


# < ---- Adding A New Document ---- >
def add_document_to_vdb(ip_report: Path):
    """
    Add a new report document to the vector database.

    Reads the text content of the given file and stores it in the
    "case-reports" Chroma collection as a new Document. The report's
    parent folder name is used as its case_id and the filename is used
    as its report name, matching the metadata convention used when the
    database was first populated. A fresh UUID is assigned as the
    document's ID.

    Args:
        ip_report (Path): Path to the report text file to add.

    Returns:
        str: The UUID assigned to the newly added document.
    """
    with open(ip_report, "r", encoding="utf-8") as file:
        report_content = file.read()

    doc_id = str(uuid.uuid4())

    document = Document(
        page_content=report_content,
        metadata={"case_id": ip_report.parent.name, "report": ip_report.name},
        id=doc_id
    )

    chroma.add_documents([document])

    return doc_id