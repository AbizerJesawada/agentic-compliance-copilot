import json
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.services.control_discovery import discover_additional_controls
from app.services.control_review import (
    list_controls,
    review_control,
    save_pending_controls,
)
from app.services.document_parser import extract_text_from_file
from app.services.rag_answer import build_context_from_matches
from app.services.rag_graph import run_rag_graph
from app.services.risk_analyzer import analyze_compliance_risk
from app.services.risk_graph import run_risk_graph
from app.services.text_chunker import (
    chunk_text,
    chunk_text_by_paragraphs,
)
from app.services.vector_store import index_chunks_file, search_similar_chunks
from app.services.hybrid_retriever import hybrid_search

router = APIRouter(prefix="/documents", tags=["Documents"])

UPLOAD_DIR = Path("uploads")
EXTRACTED_TEXT_DIR = Path("extracted_text")
CHUNKS_DIR = Path("chunks")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".csv"}


class ChunkRequest(BaseModel):
    extracted_text_path: str
    chunk_size: int = 1000
    chunk_overlap: int = 200
    chunking_method: str = "fixed"


class IndexRequest(BaseModel):
    chunks_path: str


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


class AskRequest(BaseModel):
    question: str
    top_k: int = 5


class RiskAnalysisRequest(BaseModel):
    query: str
    top_k: int = 5


class ControlDiscoveryRequest(BaseModel):
    query: str
    top_k: int = 5


class ControlReviewRequest(BaseModel):
    control_id: str
    decision: str
    reviewer: str
    review_note: str | None = None


def get_extraction_warning(extracted_text: str) -> str | None:
    if len(extracted_text.strip()) < 100:
        return (
            "Extracted text is very short. The document may be scanned or "
            "image-based. OCR may be required."
        )

    suspicious_characters = ["�", "ł", "qSt", "Ma0", "Jesauonda"]

    for character in suspicious_characters:
        if character in extracted_text:
            return (
                "Extracted text may contain recognition errors. OCR may be "
                "required for better accuracy."
            )

    return None


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    file_extension = Path(file.filename).suffix.lower()

    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Allowed types: PDF, DOCX, TXT, CSV.",
        )

    UPLOAD_DIR.mkdir(exist_ok=True)
    EXTRACTED_TEXT_DIR.mkdir(exist_ok=True)

    safe_filename = f"{uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / safe_filename

    file_content = await file.read()
    file_path.write_bytes(file_content)

    try:
        extracted_text = extract_text_from_file(file_path)
    except Exception as error:
        raise HTTPException(
            status_code=422,
            detail=f"Document uploaded, but text extraction failed: {str(error)}",
        )

    extracted_text_filename = f"{file_path.stem}.txt"
    extracted_text_path = EXTRACTED_TEXT_DIR / extracted_text_filename
    extracted_text_path.write_text(extracted_text, encoding="utf-8")

    extraction_warning = get_extraction_warning(extracted_text)

    return {
        "message": "Document uploaded and parsed successfully",
        "original_filename": file.filename,
        "saved_filename": safe_filename,
        "content_type": file.content_type,
        "size_bytes": len(file_content),
        "path": str(file_path),
        "extracted_text_path": str(extracted_text_path),
        "character_count": len(extracted_text),
        "text_preview": extracted_text[:500],
        "extraction_warning": extraction_warning,
    }


@router.post("/chunk")
def chunk_document(request: ChunkRequest):
    extracted_text_path = Path(request.extracted_text_path)

    if not extracted_text_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Extracted text file not found.",
        )

    CHUNKS_DIR.mkdir(exist_ok=True)

    text = extracted_text_path.read_text(encoding="utf-8", errors="ignore")

    if request.chunking_method == "fixed":
        try:
            chunks = chunk_text(
                text=text,
                chunk_size=request.chunk_size,
                chunk_overlap=request.chunk_overlap,
            )
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error))

    elif request.chunking_method == "paragraph":
        chunks = chunk_text_by_paragraphs(
            text=text,
            chunk_size=request.chunk_size,
        )

    else:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported chunking method. "
                "Use 'fixed' or 'paragraph'."
            ),
        )

    chunk_records = []
    chunk_previews = []

    for index, chunk in enumerate(chunks):
        chunk_record = {
            "chunk_index": index,
            "character_count": len(chunk),
            "text": chunk,
            "source_path": str(extracted_text_path),
            "chunking_method": request.chunking_method,
        }

        chunk_records.append(chunk_record)

        chunk_previews.append(
            {
                "chunk_index": index,
                "character_count": len(chunk),
                "preview": chunk[:300],
            }
        )

    chunks_filename = (
        f"{extracted_text_path.stem}_{request.chunking_method}.json"
    )
    chunks_path = CHUNKS_DIR / chunks_filename

    chunks_path.write_text(
        json.dumps(chunk_records, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    return {
        "message": "Text chunked successfully",
        "source_path": str(extracted_text_path),
        "chunks_path": str(chunks_path),
        "chunking_method": request.chunking_method,
        "chunk_size": request.chunk_size,
        "chunk_overlap": request.chunk_overlap,
        "chunk_count": len(chunks),
        "chunks": chunk_previews,
    }


@router.post("/index")
def index_document_chunks(request: IndexRequest):
    chunks_path = Path(request.chunks_path)

    try:
        result = index_chunks_file(chunks_path)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))

    return result


@router.post("/search")
def search_documents(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty.",
        )

    return search_similar_chunks(
        query=request.query,
        top_k=request.top_k,
    )

@router.post("/search-hybrid")
def search_documents_hybrid(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty.",
        )

    try:
        return hybrid_search(
            query=request.query,
            top_k=request.top_k,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

@router.post("/ask")
def ask_document_question(request: AskRequest):
    if not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    return run_rag_graph(
        question=request.question,
        top_k=request.top_k,
    )


@router.post("/analyze-risk")
def analyze_document_risk(request: RiskAnalysisRequest):
    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Risk analysis query cannot be empty.",
        )

    return run_risk_graph(
        query=request.query,
        top_k=request.top_k,
    )


@router.post("/discover-controls")
def discover_document_controls(request: ControlDiscoveryRequest):
    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Discovery query cannot be empty.",
        )

    search_result = search_similar_chunks(
        query=request.query,
        top_k=request.top_k,
    )

    matches = search_result["matches"]

    known_analysis = analyze_compliance_risk(
        matches=matches,
    )

    context = build_context_from_matches(matches)

    try:
        additional_controls = discover_additional_controls(
            context=context,
            known_signals=known_analysis["signals_found"],
        )
        discovery_error = None
    except Exception as error:
        additional_controls = []
        discovery_error = str(error)

    saved_pending_controls = []

    if additional_controls:
        saved_pending_controls = save_pending_controls(
            discovered_controls=additional_controls,
            query=request.query,
        )

    return {
        "query": request.query,
        "retrieved_chunk_count": len(matches),
        "known_signals": known_analysis["signals_found"],
        "additional_controls": additional_controls,
        "saved_pending_controls": saved_pending_controls,
        "discovery_error": discovery_error,
    }


@router.get("/controls/review")
def get_controls_for_review(status: str | None = None):
    return {
        "controls": list_controls(status=status),
    }


@router.post("/controls/review")
def review_discovered_control(request: ControlReviewRequest):
    try:
        reviewed_control = review_control(
            control_id=request.control_id,
            decision=request.decision,
            reviewer=request.reviewer,
            review_note=request.review_note,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    return {
        "message": "Control reviewed successfully.",
        "control": reviewed_control,
    }