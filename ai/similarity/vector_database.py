from pathlib import Path
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from functools import lru_cache
import os
import uuid

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data" / "unstructured"

CASES_FILES = os.listdir(DATA_DIR)


# <---- Initializing Chroma DB ---- >
@lru_cache(maxsize=1)
def creating_embedding():
    """
    Create and return a HuggingFace sentence-transformer embedding function.

    Uses the "all-mpnet-base-v2" model and enables embedding normalization
    (so cosine similarity behaves correctly for retrieval).

    Returns:
        HuggingFaceEmbeddings: An embeddings object usable by Chroma.
    """
    hf_emb = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-mpnet-base-v2",
        encode_kwargs={"normalize_embeddings": True}
    )

    return hf_emb

@lru_cache(maxsize=1)
def create_vdb():
    """
    Initialize (or connect to) the persistent Chroma vector database.

    Creates a Chroma collection named "case-reports" backed by the
    "all-mpnet-base-v2" embedding function, persisted to disk under
    "./vdb/sih_vdb".

    Returns:
        Chroma: A Chroma vector store instance ready for adding/querying documents.
    """
    chroma = Chroma(
        collection_name="case-reports",
        embedding_function=creating_embedding(),
        persist_directory="./vdb/sih_vdb"
    )

    return chroma


# <---- Loading The Data into VDB ---->
def load_into_vdb():
    """
    Load all case reports from DATA_DIR into the Chroma vector database.

    Walks each case-ID subfolder inside DATA_DIR, reads every report file
    within it as plain text, wraps each report in a LangChain Document
    (tagging it with case_id/report metadata and a unique UUID), and
    upserts all of a case's documents into the vector store in one batch.

    Non-directory entries at either level are skipped so stray files
    don't crash the loader.

    Returns:
        None
    """
    # Initializing vector Database
    chroma = create_vdb()

    # Saving the cases in vector database
    for case in CASES_FILES:
        case_dir = os.path.join(DATA_DIR, case)

        if not os.path.isdir(case_dir):
            continue

        case_content = []

        for report in os.listdir(case_dir):
            report_dir = os.path.join(case_dir, report)

            if not os.path.isfile(report_dir):
                continue

            with open(report_dir, "r", encoding="utf-8") as file:
                report_content = file.read()

            document = Document(
                page_content=report_content,
                metadata={"case_id": case, "report": report},
                id=str(uuid.uuid4())
            )

            case_content.append(document)

        if case_content:
            chroma.add_documents(case_content)
            print(f"Loaded the reports of CASE ID: {case} into vector database")

    print("Loaded all files into vector database")


if __name__ == "__main__":
    load_into_vdb()