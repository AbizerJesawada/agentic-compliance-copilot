import os

import httpx
from mcp.server.fastmcp import FastMCP


BACKEND_URL = os.getenv(
    "COMPLIANCE_BACKEND_URL",
    "http://127.0.0.1:8000",
)

mcp = FastMCP(
    "Agentic Compliance Copilot",
    instructions=(
        "Use these tools to search compliance documents and return "
        "grounded evidence with source metadata."
    ),
)


def call_backend(path: str, payload: dict) -> dict:
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{BACKEND_URL}{path}",
                json=payload,
            )

            response.raise_for_status()

            return response.json()

    except httpx.HTTPError as error:
        return {
            "error": "Backend request failed.",
            "details": str(error),
            "backend_url": BACKEND_URL,
        }


@mcp.tool()
def search_compliance_documents(
    query: str,
    top_k: int = 5,
) -> dict:
    """Search indexed compliance documents using hybrid retrieval."""

    if not query.strip():
        return {
            "error": "Search query cannot be empty."
        }

    return call_backend(
        path="/documents/search-hybrid",
        payload={
            "query": query,
            "top_k": top_k,
        },
    )
@mcp.tool()
def ask_compliance_question(
    question: str,
    top_k: int = 3,
) -> dict:
    """Answer a compliance question using grounded document evidence."""

    if not question.strip():
        return {
            "error": "Question cannot be empty."
        }

    return call_backend(
        path="/documents/ask",
        payload={
            "question": question,
            "top_k": top_k,
        },
    )


@mcp.tool()
def analyze_compliance_risk(
    query: str,
    top_k: int = 5,
) -> dict:
    """Analyze compliance risks and return evidence and recommendations."""

    if not query.strip():
        return {
            "error": "Risk analysis query cannot be empty."
        }

    return call_backend(
        path="/documents/analyze-risk",
        payload={
            "query": query,
            "top_k": top_k,
        },
    )


@mcp.tool()
def discover_additional_compliance_controls(
    query: str,
    top_k: int = 5,
) -> dict:
    """Find potential compliance controls not covered by existing rules."""

    if not query.strip():
        return {
            "error": "Control discovery query cannot be empty."
        }

    return call_backend(
        path="/documents/discover-controls",
        payload={
            "query": query,
            "top_k": top_k,
        },
)

if __name__ == "__main__":
    mcp.run()