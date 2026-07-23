RISK_KEYWORDS=[
    "risk",
    "risk level",
    "risk analysis",
    "assess risk",
    "compliance exposure",
    "high risk",
]

CONTROL_DISCOVERY_KEYWORDS = [
    "missing control",
    "missing controls",
    "additional control",
    "additional controls",
    "not covered",
    "not part of",
    "compliance gap",
    "control gap",
    "new requirement",
    "unknown requirement",
]
def classify_assistant_intent(query: str) -> dict:
    normalized_query = query.lower().strip()

    for keyword in CONTROL_DISCOVERY_KEYWORDS:
        if keyword in normalized_query:
            return {
                "intent": "control_discovery",
                "reason": (
                    f"The query contains '{keyword}', which indicates "
                    "a request to find additional compliance controls."
                ),
            }

    for keyword in RISK_KEYWORDS:
        if keyword in normalized_query:
            return {
                "intent": "risk_analysis",
                "reason": (
                    f"The query contains '{keyword}', which indicates "
                    "a compliance risk analysis request."
                ),
            }

    return {
        "intent": "question_answering",
        "reason": (
            "The query does not request risk analysis or control discovery, "
            "so it will use the document question-answering workflow."
        ),
    }