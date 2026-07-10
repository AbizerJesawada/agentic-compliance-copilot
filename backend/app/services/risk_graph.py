import json
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.services.langchain_rag import generate_risk_summary
from app.services.risk_analyzer import analyze_compliance_risk
from app.services.vector_store import search_similar_chunks


class RiskGraphState(TypedDict):
    query: str
    top_k: int
    matches: list[dict]
    risk_level: str
    risk_score: int
    signals_found: list[str]
    evidence: list[dict]
    recommendations: list[str]
    risk_summary: str | None
    llm_error: str | None


def retrieve_context_node(state: RiskGraphState) -> RiskGraphState:
    search_result = search_similar_chunks(
        query=state["query"],
        top_k=state["top_k"],
    )

    return {
        **state,
        "matches": search_result["matches"],
    }


def analyze_risk_node(state: RiskGraphState) -> RiskGraphState:
    analysis_result = analyze_compliance_risk(
        matches=state["matches"],
    )

    return {
        **state,
        **analysis_result,
    }


def route_by_signals(state: RiskGraphState) -> str:
    if state["signals_found"]:
        return "generate_summary"

    return "no_summary"


def generate_summary_node(state: RiskGraphState) -> RiskGraphState:
    analysis_for_llm = {
        "risk_level": state["risk_level"],
        "risk_score": state["risk_score"],
        "signals_found": state["signals_found"],
        "evidence": state["evidence"],
        "recommendations": state["recommendations"],
    }

    try:
        summary = generate_risk_summary(
            analysis=json.dumps(analysis_for_llm, indent=2),
        )

        return {
            **state,
            "risk_summary": summary,
            "llm_error": None,
        }
    except Exception as error:
        return {
            **state,
            "risk_summary": None,
            "llm_error": str(error),
        }


def no_summary_node(state: RiskGraphState) -> RiskGraphState:
    return {
        **state,
        "risk_summary": None,
        "llm_error": None,
    }


def build_risk_graph():
    graph = StateGraph(RiskGraphState)

    graph.add_node("retrieve_context", retrieve_context_node)
    graph.add_node("analyze_risk", analyze_risk_node)
    graph.add_node("generate_summary", generate_summary_node)
    graph.add_node("no_summary", no_summary_node)

    graph.add_edge(START, "retrieve_context")
    graph.add_edge("retrieve_context", "analyze_risk")

    graph.add_conditional_edges(
        "analyze_risk",
        route_by_signals,
        {
            "generate_summary": "generate_summary",
            "no_summary": "no_summary",
        },
    )

    graph.add_edge("generate_summary", END)
    graph.add_edge("no_summary", END)

    return graph.compile()


risk_graph = build_risk_graph()


def run_risk_graph(query: str, top_k: int = 5) -> dict:
    initial_state = {
        "query": query,
        "top_k": top_k,
        "matches": [],
        "risk_level": "low",
        "risk_score": 0,
        "signals_found": [],
        "evidence": [],
        "recommendations": [],
        "risk_summary": None,
        "llm_error": None,
    }

    final_state = risk_graph.invoke(initial_state)

    return {
        "query": final_state["query"],
        "retrieved_chunk_count": len(final_state["matches"]),
        "risk_level": final_state["risk_level"],
        "risk_score": final_state["risk_score"],
        "signals_found": final_state["signals_found"],
        "evidence": final_state["evidence"],
        "recommendations": final_state["recommendations"],
        "risk_summary": final_state["risk_summary"],
        "llm_error": final_state["llm_error"],
    }