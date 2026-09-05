from pathlib import Path

async def process_document( file_path: Path, document_id: str, case_id: str, document_metadata: dict) -> dict:
    """
    Process a newly uploaded PDF/image using the ETL pipeline.

    The actual ETL logic will live inside the etl/ folder.

    Returns:
        dict: Structured information extracted by the ETL.
    """

    # TODO:
    # Connect this function to your friend's actual ETL pipeline.

    raise NotImplementedError(
        "New-document ETL is not connected yet."
    )


async def process_existing_unstructured( file_path: Path,case_id: str,document_id: str,) -> dict:
    """
    Process an existing unstructured document using the ETL pipeline.

    Used for:
        data/unstructured/CASE-XXXX/*.txt

    Returns:
        dict: Structured information extracted by the ETL.
    """

    # TODO:
    # Connect this function to your friend's actual ETL pipeline.

    raise NotImplementedError(
        "Existing-unstructured-data ETL is not connected yet."
    )