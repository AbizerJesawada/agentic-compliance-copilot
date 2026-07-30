import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


REGISTRY_DIR = Path("document_registry")
REGISTRY_FILE = REGISTRY_DIR / "documents.json"


def load_registry() -> list[dict]:
    if not REGISTRY_FILE.exists():
        return []

    return json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))


def save_registry(documents: list[dict]) -> None:
    REGISTRY_DIR.mkdir(exist_ok=True)

    REGISTRY_FILE.write_text(
        json.dumps(documents, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def register_document(
    original_filename: str,
    saved_filename: str,
    file_path: Path,
    extracted_text_path: Path,
    chunks_path: Path | None,
    size_bytes: int,
    character_count: int,
) -> dict:
    documents = load_registry()

    document = {
        "id": str(uuid4()),
        "original_filename": original_filename,
        "saved_filename": saved_filename,
        "file_path": str(file_path),
        "extracted_text_path": str(extracted_text_path),
        "chunks_path": str(chunks_path) if chunks_path else None,
        "size_bytes": size_bytes,
        "character_count": character_count,
        "status": "indexed" if chunks_path else "uploaded",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    documents.append(document)
    save_registry(documents)

    return document


def list_documents() -> list[dict]:
    return load_registry()


def get_document(document_id: str) -> dict | None:
    documents = load_registry()

    for document in documents:
        if document["id"] == document_id:
            return document

    return None


def delete_document(document_id: str) -> bool:
    documents = load_registry()
    updated_documents = [
        document
        for document in documents
        if document["id"] != document_id
    ]

    if len(updated_documents) == len(documents):
        return False

    save_registry(updated_documents)

    return True
