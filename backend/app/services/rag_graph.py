from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.services.langchain_rag import generate_langchain_answer
from app.services.rag_answer import generate_grounded_answer
from app.services.hybrid_retriever import hybrid_search


class RAGGraphState(TypedDict):
    question: str
    top_k: int
    matches: list[dict]
    answer: str
    answer_type: str
    confidence: str
    retrieved_chunk_count: int
    sources: list[dict]
    context_used: str
    llm_error: str | None


def retrieve_context_node(state: RAGGraphState) -> RAGGraphState:
    search_result = hybrid_search(
        query=state["question"],
        top_k=state["top_k"],
    )

    return {
        **state,
        "matches": search_result["matches"],
    }


def prepare_answer_node(state: RAGGraphState) -> RAGGraphState:
    answer_result = generate_grounded_answer(
        question=state["question"],
        matches=state["matches"],
    )

    return {
        **state,
        "answer": answer_result["answer"],
        "answer_type": "extractive",
        "confidence": answer_result["confidence"],
        "retrieved_chunk_count": len(answer_result["sources"]),
        "sources": answer_result["sources"],
        "context_used": answer_result["context_used"],
        "llm_error": None,
    }


def route_by_confidence(state: RAGGraphState) -> str:
    if state["confidence"] == "low":
        return "safe_refusal"

    return "generate_answer"


def safe_refusal_node(state: RAGGraphState) -> RAGGraphState:
    return {
        **state,
        "answer": "I could not find relevant information in the indexed documents.",
        "answer_type": "extractive",
        "retrieved_chunk_count": 0,
        "sources": [],
        "context_used": "",
        "llm_error": None,
    }


def generate_answer_node(state: RAGGraphState) -> RAGGraphState:
    llm_answer = None
    llm_error = None

    try:
        llm_answer = generate_langchain_answer(
            question=state["question"],
            context=state["context_used"],
        )
    except Exception as error:
        llm_error = str(error)

    return {
        **state,
        "answer": llm_answer if llm_answer else state["answer"],
        "answer_type": "generative" if llm_answer else "extractive",
        "llm_error": llm_error,
    }


def build_rag_graph():
    graph = StateGraph(RAGGraphState)

    graph.add_node("retrieve_context", retrieve_context_node)
    graph.add_node("prepare_answer", prepare_answer_node)
    graph.add_node("safe_refusal", safe_refusal_node)
    graph.add_node("generate_answer", generate_answer_node)

    graph.add_edge(START, "retrieve_context")
    graph.add_edge("retrieve_context", "prepare_answer")

    graph.add_conditional_edges(
        "prepare_answer",
        route_by_confidence,
        {
            "safe_refusal": "safe_refusal",
            "generate_answer": "generate_answer",
        },
    )

    graph.add_edge("safe_refusal", END)
    graph.add_edge("generate_answer", END)

    return graph.compile()


rag_graph = build_rag_graph()


def run_rag_graph(question: str, top_k: int = 5) -> dict:
    initial_state = {
        "question": question,
        "top_k": top_k,
        "matches": [],
        "answer": "",
        "answer_type": "",
        "confidence": "",
        "retrieved_chunk_count": 0,
        "sources": [],
        "context_used": "",
        "llm_error": None,
    }

    final_state = rag_graph.invoke(initial_state)

    return {
        "question": final_state["question"],
        "answer": final_state["answer"],
        "answer_type": final_state["answer_type"],
        "confidence": final_state["confidence"],
        "retrieved_chunk_count": final_state["retrieved_chunk_count"],
        "sources": final_state["sources"],
        "context_used": final_state["context_used"],
        "llm_error": final_state["llm_error"],
    }