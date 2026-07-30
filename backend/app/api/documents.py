import json
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from time import perf_counter
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
    chunk_csv_rows,
    chunk_text,
    chunk_text_by_paragraphs,
)
from app.services.vector_store import index_chunks_file, search_similar_chunks
from app.services.hybrid_retriever import hybrid_search
from app.services.rag_evaluator import (
    evaluate_rag_answer,
    list_evaluation_reports,
    save_evaluation_report,
)
from app.services.document_registry import (
    delete_document,
    get_document,
    list_documents,
    register_document,
)
from app.services.document_strategy import recommend_chunking_strategy
from app.services.llamaindex_retriever import (
    index_chunks_with_llamaindex,
    search_with_llamaindex,
)
from app.services.assistant_router import classify_assistant_intent
from app.services.conversation_memory import (
    format_conversation_history,
    get_recent_conversation_messages,
    list_conversation_sessions,
    load_conversation,
    save_conversation_message,
)
from app.services.user_feedback import save_answer_feedback
from app.services.user_feedback import (
    list_answer_feedback,
    save_answer_feedback,
)

router = APIRouter(prefix="/documents", tags=["Documents"])

UPLOAD_DIR = Path("uploads")
EXTRACTED_TEXT_DIR = Path("extracted_text")
CHUNKS_DIR = Path("chunks")
EVALUATION_CASES_PATH = Path("../sample-data/rag_evaluation_cases.json")

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".csv"}

class ChunkRequest(BaseModel):
    extracted_text_path: str
    chunk_size: int = 1000
    chunk_overlap: int = 200
    chunking_method: str = "auto"


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

class AssistantQueryRequest(BaseModel):
    query: str
    top_k: int = 5

class AssistantQueryRequest(BaseModel):
    query: str
    top_k: int = 5
    session_id: str | None = None

class AnswerFeedbackRequest(BaseModel):
    session_id: str | None = None
    query: str
    helpful: bool
    comment: str | None = None

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

def get_original_file_extension(
    extracted_text_path: Path,
) -> str:
    uploaded_files = list(
        UPLOAD_DIR.glob(f"{extracted_text_path.stem}.*")
    )

    if not uploaded_files:
        return ".txt"

    return uploaded_files[0].suffix.lower()


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
    CHUNKS_DIR.mkdir(exist_ok=True)

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
    extracted_text_path.write_text(
        extracted_text,
        encoding="utf-8",
    )

    extraction_warning = get_extraction_warning(extracted_text)

    strategy = recommend_chunking_strategy(
        file_extension=file_extension,
        extracted_text=extracted_text,
    )

    chunking_method = strategy["chunking_method"]

    try:
        if chunking_method == "fixed":
            chunks = chunk_text(text=extracted_text)
        elif chunking_method == "paragraph":
            chunks = chunk_text_by_paragraphs(text=extracted_text)
        elif chunking_method == "csv_rows":
            chunks = chunk_csv_rows(text=extracted_text)
        else:
            chunks = chunk_text(text=extracted_text)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    chunk_records = []

    for index, chunk in enumerate(chunks):
        chunk_records.append(
            {
                "chunk_index": index,
                "character_count": len(chunk),
                "text": chunk,
                "source_path": str(extracted_text_path),
                "chunking_method": chunking_method,
            }
        )

    chunks_filename = f"{extracted_text_path.stem}_{chunking_method}.json"
    chunks_path = CHUNKS_DIR / chunks_filename

    chunks_path.write_text(
        json.dumps(
            chunk_records,
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    try:
        index_result = index_chunks_file(chunks_path)
        index_error = None

    except Exception as error:
        index_result = None
        index_error = str(error)

    document_record = register_document(
        original_filename=file.filename,
        saved_filename=safe_filename,
        file_path=file_path,
        extracted_text_path=extracted_text_path,
        chunks_path=chunks_path if index_result else None,
        size_bytes=len(file_content),
        character_count=len(extracted_text),
    )

    return {
        "message": "Document uploaded, chunked, and indexed successfully",
        "original_filename": file.filename,
        "saved_filename": safe_filename,
        "content_type": file.content_type,
        "size_bytes": len(file_content),
        "path": str(file_path),
        "extracted_text_path": str(extracted_text_path),
        "character_count": len(extracted_text),
        "text_preview": extracted_text[:500],
        "extraction_warning": extraction_warning,
        "recommended_strategy": strategy,
        "chunking_method": chunking_method,
        "chunk_count": len(chunks),
        "chunks_path": str(chunks_path),
        "index_result": index_result,
        "index_error": index_error,
        "document_id": document_record["id"],
    }


@router.get("")
def get_all_documents():
    documents = list_documents()

    return {
        "document_count": len(documents),
        "documents": documents,
    }


@router.delete("/{document_id}")
def delete_uploaded_document(document_id: str):
    document = get_document(document_id)

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    file_path = Path(document["file_path"])

    if file_path.exists():
        file_path.unlink()

    extracted_text_path = Path(document["extracted_text_path"])

    if extracted_text_path.exists():
        extracted_text_path.unlink()

    chunks_path = document.get("chunks_path")

    if chunks_path:
        chunks_file = Path(chunks_path)

        if chunks_file.exists():
            chunks_file.unlink()

    deleted = delete_document(document_id)

    if not deleted:
        raise HTTPException(
            status_code=500,
            detail="Could not delete document record.",
        )

    return {
        "message": "Document deleted successfully.",
        "document_id": document_id,
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

    text = extracted_text_path.read_text(
        encoding="utf-8",
        errors="ignore",
    )

    selected_chunking_method = request.chunking_method
    strategy = None

    if selected_chunking_method == "auto":
        original_file_extension = get_original_file_extension(
            extracted_text_path
        )

        strategy = recommend_chunking_strategy(
            file_extension=original_file_extension,
            extracted_text=text,
        )

        selected_chunking_method = strategy["chunking_method"]

    try:
        if selected_chunking_method == "fixed":
            chunks = chunk_text(
                text=text,
                chunk_size=request.chunk_size,
                chunk_overlap=request.chunk_overlap,
            )

        elif selected_chunking_method == "paragraph":
            chunks = chunk_text_by_paragraphs(
                text=text,
                chunk_size=request.chunk_size,
            )

        elif selected_chunking_method == "csv_rows":
            chunks = chunk_csv_rows(text=text)

        else:
            raise ValueError(
                "Unsupported chunking method. "
                "Use 'auto', 'fixed', 'paragraph', or 'csv_rows'."
            )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    chunk_records = []
    chunk_previews = []

    for index, chunk in enumerate(chunks):
        chunk_record = {
            "chunk_index": index,
            "character_count": len(chunk),
            "text": chunk,
            "source_path": str(extracted_text_path),
            "chunking_method": selected_chunking_method,
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
        f"{extracted_text_path.stem}_{selected_chunking_method}.json"
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
        "requested_chunking_method": request.chunking_method,
        "chunking_method": selected_chunking_method,
        "strategy": strategy,
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

@router.post("/llamaindex/index")
def index_chunks_with_llamaindex_endpoint(request: IndexRequest):
    chunks_path = Path(request.chunks_path)

    try:
        return index_chunks_with_llamaindex(chunks_path)
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        )


@router.post("/llamaindex/search")
def search_documents_with_llamaindex(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty.",
        )

    try:
        return search_with_llamaindex(
            query=request.query,
            top_k=request.top_k,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

@router.post("/retrieval-compare")
def compare_retrieval_methods(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty.",
        )

    try:
        hybrid_result = hybrid_search(
            query=request.query,
            top_k=request.top_k,
        )

        llamaindex_result = search_with_llamaindex(
            query=request.query,
            top_k=request.top_k,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    return {
        "query": request.query,
        "hybrid_retrieval": {
            "matches": hybrid_result["matches"],
        },
        "llamaindex_retrieval": {
            "matches": llamaindex_result["matches"],
        },
}

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

@router.post("/assistant/query")
def assistant_query(request: AssistantQueryRequest):
    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Assistant query cannot be empty.",
        )

    previous_messages = []

    if request.session_id:
        try:
            previous_messages = get_recent_conversation_messages(
                session_id=request.session_id,
                limit=4,
            )

            save_conversation_message(
                session_id=request.session_id,
                role="user",
                content=request.query,
            )
        except ValueError as error:
            raise HTTPException(
                status_code=400,
                detail=str(error),
            )

    workflow_query = request.query

    if previous_messages:
        conversation_history = format_conversation_history(
            previous_messages
        )

        workflow_query = (
            f"Previous conversation:\n{conversation_history}\n\n"
            f"Current user question: {request.query}"
        )

    routing = classify_assistant_intent(request.query)
    intent = routing["intent"]

    if intent == "question_answering":
        result = run_rag_graph(
            question=workflow_query,
            top_k=request.top_k,
        )
        result["question"] = request.query
        assistant_message = result["answer"]

    elif intent == "risk_analysis":
        result = run_risk_graph(
            query=workflow_query,
            top_k=request.top_k,
        )
        result["query"] = request.query
        assistant_message = result.get(
            "risk_summary",
            "Compliance risk analysis completed.",
        )

    else:
        search_result = search_similar_chunks(
            query=workflow_query,
            top_k=request.top_k,
        )
        matches = search_result["matches"]

        known_analysis = analyze_compliance_risk(matches=matches)
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

        result = {
            "retrieved_chunk_count": len(matches),
            "known_signals": known_analysis["signals_found"],
            "additional_controls": additional_controls,
            "saved_pending_controls": saved_pending_controls,
            "discovery_error": discovery_error,
        }

        control_names = [
            control["control_name"]
            for control in additional_controls
        ]

        assistant_message = (
            "Additional controls discovered: "
            + ", ".join(control_names)
            if control_names
            else "No additional controls were discovered."
        )

    if request.session_id:
        save_conversation_message(
            session_id=request.session_id,
            role="assistant",
            content=assistant_message,
        )

    return {
        "query": request.query,
        "session_id": request.session_id,
        "previous_message_count": len(previous_messages),
        "history_used": bool(previous_messages),
        "selected_workflow": intent,
        "routing_reason": routing["reason"],
        "result": result,
}

@router.post("/assistant/feedback")
def submit_answer_feedback(request: AnswerFeedbackRequest):
    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Feedback query cannot be empty.",
        )

    saved_feedback = save_answer_feedback(
        session_id=request.session_id,
        query=request.query,
        helpful=request.helpful,
        comment=request.comment,
    )

    return {
        "message": "Answer feedback saved successfully.",
        "feedback": saved_feedback,
}

@router.get("/assistant/feedback")
def get_answer_feedback(helpful: bool | None = None):
    feedback_entries = list_answer_feedback(helpful=helpful)

    return {
        "feedback_count": len(feedback_entries),
        "feedback": feedback_entries,
    }

@router.get("/assistant/sessions")
def get_conversation_sessions():
    sessions = list_conversation_sessions()

    return {
        "session_count": len(sessions),
        "sessions": sessions,
}

@router.get("/assistant/sessions/{session_id}")
def get_conversation_session(session_id: str):
    try:
        messages = load_conversation(session_id)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    if not messages:
        raise HTTPException(
            status_code=404,
            detail="Conversation session was not found.",
        )

    return {
        "session_id": session_id,
        "message_count": len(messages),
        "messages": messages,
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

@router.post("/evaluate-rag")
def evaluate_rag_system():
    if not EVALUATION_CASES_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="RAG evaluation cases file was not found.",
        )

    try:
        evaluation_cases = json.loads(
            EVALUATION_CASES_PATH.read_text(encoding="utf-8")
        )
    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=400,
            detail=f"Evaluation cases file has invalid JSON: {str(error)}",
        )

    results = []

    for case in evaluation_cases:
        start_time = perf_counter()

        rag_result = run_rag_graph(
            question=case["question"],
            top_k=3,
        )

        response_time_ms = round(
            (perf_counter() - start_time) * 1000,
            2,
        )

        evaluation = evaluate_rag_answer(
            question=case["question"],
            answer=rag_result["answer"],
            expected_keywords=case["expected_keywords"],
            confidence=rag_result["confidence"],
            retrieved_chunk_count=rag_result["retrieved_chunk_count"],
        )

        results.append(
            {
                "case_id": case["id"],
                "response_time_ms": response_time_ms,
                **evaluation,
            }
        )

    passed_count = sum(
        1 for result in results if result["passed"]
    )

    total_cases = len(results)
    pass_rate = (
        round(passed_count / total_cases, 2)
        if total_cases
        else 0.0
    )

    report = {
    "total_cases": total_cases,
    "passed_cases": passed_count,
    "failed_cases": total_cases - passed_count,
    "pass_rate": pass_rate,
    "results": results,
}

    report_path = save_evaluation_report(report)

    return {
    **report,
    "report_path": report_path,
}

@router.get("/evaluation-reports")
def get_evaluation_reports(limit: int = 10):
    if limit < 1:
        raise HTTPException(
            status_code=400,
            detail="Limit must be at least 1.",
        )

    return {
        "reports": list_evaluation_reports(limit=limit),
    }