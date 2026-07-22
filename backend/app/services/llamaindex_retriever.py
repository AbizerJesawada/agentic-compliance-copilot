import json
from pathlib import Path

from llama_index.core import Document, VectorStoreIndex
from llama_index.embeddings.huggingface import HuggingFaceEmbedding


EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

embedding_model = HuggingFaceEmbedding(
    model_name=EMBEDDING_MODEL_NAME
)

llamaindex_index: VectorStoreIndex | None = None
indexed_chunks_path: str | None = None


def load_documents_from_chunks(chunks_path: Path) -> list[Document]:
    if not chunks_path.exists():
        raise FileNotFoundError(
            f"Chunks file not found: {chunks_path}"
        )

    chunk_records = json.loads(
        chunks_path.read_text(encoding="utf-8")
    )

    documents = []

    for chunk_record in chunk_records:
        document = Document(
            text=chunk_record["text"],
            metadata={
                "source_path": chunk_record["source_path"],
                "chunk_index": chunk_record["chunk_index"],
                "character_count": chunk_record["character_count"],
                "chunking_method": chunk_record.get(
                    "chunking_method",
                    "unknown",
                ),
            },
        )

        documents.append(document)

    return documents


def index_chunks_with_llamaindex(chunks_path: Path) -> dict:
    global llamaindex_index
    global indexed_chunks_path

    documents = load_documents_from_chunks(chunks_path)

    llamaindex_index = VectorStoreIndex.from_documents(
        documents,
        embed_model=embedding_model,
    )

    indexed_chunks_path = str(chunks_path)

    return {
        "message": "Chunks indexed with LlamaIndex successfully",
        "indexed_count": len(documents),
        "chunks_path": indexed_chunks_path,
        "embedding_model": EMBEDDING_MODEL_NAME,
    }


def search_with_llamaindex(
    query: str,
    top_k: int = 5,
) -> dict:
    if not query.strip():
        raise ValueError("Search query cannot be empty.")

    if llamaindex_index is None:
        raise ValueError(
            "No LlamaIndex index exists. Index a chunks file first."
        )

    retriever = llamaindex_index.as_retriever(
        similarity_top_k=top_k
    )
    retrieved_nodes = retriever.retrieve(query)

    matches = []

    for result in retrieved_nodes:
        node = result.node

        matches.append(
            {
                "text": node.get_content(),
                "metadata": node.metadata,
                "score": round(result.score, 4),
            }
        )

    return {
        "query": query,
        "retrieval_method": "llamaindex",
        "indexed_chunks_path": indexed_chunks_path,
        "embedding_model": EMBEDDING_MODEL_NAME,
        "matches": matches,
    }