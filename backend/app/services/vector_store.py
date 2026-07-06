import json
from pathlib import Path

import chromadb
from chromadb.utils import embedding_functions

CHROMA_DIR = Path("chroma_db")
COLLECTION_NAME = "compliance_documents"

embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)


def get_collection():
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=embedding_function,
    )

    return collection


def index_chunks_file(chunks_path: Path) -> dict:
    if not chunks_path.exists():
        raise FileNotFoundError("Chunks file not found.")

    chunk_records = json.loads(chunks_path.read_text(encoding="utf-8"))

    if not chunk_records:
        return {
            "indexed_count": 0,
            "message": "No chunks found to index.",
        }

    collection = get_collection()

    ids = []
    documents = []
    metadatas = []

    for chunk in chunk_records:
        chunk_id = f"{chunks_path.stem}-{chunk['chunk_index']}"

        ids.append(chunk_id)
        documents.append(chunk["text"])
        metadatas.append(
            {
                "source_path": chunk["source_path"],
                "chunk_index": chunk["chunk_index"],
                "character_count": chunk["character_count"],
                "chunks_file": str(chunks_path),
            }
        )

    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
    )

    return {
        "message": "Chunks indexed successfully",
        "indexed_count": len(documents),
        "collection": COLLECTION_NAME,
    }


def search_similar_chunks(query: str, top_k: int = 5) -> dict:
    collection = get_collection()

    results = collection.query(
        query_texts=[query],
        n_results=top_k,
    )

    matches = []

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    ids = results.get("ids", [[]])[0]

    for index, document in enumerate(documents):
        matches.append(
            {
                "id": ids[index],
                "text": document,
                "metadata": metadatas[index],
                "distance": distances[index],
            }
        )

    return {
        "query": query,
        "top_k": top_k,
        "matches": matches,
    }