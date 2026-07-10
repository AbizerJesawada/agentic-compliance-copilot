import re


RISK_RULES = [
    {
        "signal": "breach_reporting",
        "keywords": ["data breach", "report", "hours"],
        "score": 2,
        "recommendation": (
            "Verify that vendors have a documented process to report data "
            "breaches within the required time."
        ),
    },
    {
        "signal": "confidentiality",
        "keywords": ["confidentiality"],
        "score": 1,
        "recommendation": (
            "Verify that every vendor contract includes a confidentiality clause."
        ),
    },
    {
        "signal": "encryption",
        "keywords": ["encrypt", "sensitive data"],
        "score": 2,
        "recommendation": (
            "Verify that vendors encrypt sensitive data when storing or "
            "transmitting it."
        ),
    },
    {
        "signal": "contract_termination",
        "keywords": ["terminate", "compliance requirements"],
        "score": 2,
        "recommendation": (
            "Define a review process for vendors that do not meet compliance "
            "requirements."
        ),
    },
]


def split_into_sentences(text: str) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [sentence.strip() for sentence in sentences if sentence.strip()]


def get_risk_level(risk_score: int) -> str:
    if risk_score >= 5:
        return "high"

    if risk_score >= 2:
        return "medium"

    return "low"


def analyze_compliance_risk(matches: list[dict]) -> dict:
    signals_found = []
    evidence = []
    recommendations = []
    risk_score = 0

    for match in matches:
        text = match.get("text", "")
        metadata = match.get("metadata", {})
        sentences = split_into_sentences(text)
        text_lower = text.lower()

        for rule in RISK_RULES:
            signal = rule["signal"]

            if signal in signals_found:
                continue

            if not all(keyword in text_lower for keyword in rule["keywords"]):
                continue

            matching_sentence = next(
                (
                    sentence
                    for sentence in sentences
                    if all(keyword in sentence.lower() for keyword in rule["keywords"])
                ),
                text,
            )

            signals_found.append(signal)
            risk_score += rule["score"]
            recommendations.append(rule["recommendation"])

            evidence.append(
                {
                    "signal": signal,
                    "evidence": matching_sentence,
                    "source_path": metadata.get("source_path"),
                    "chunk_index": metadata.get("chunk_index"),
                }
            )

    return {
        "risk_level": get_risk_level(risk_score),
        "risk_score": risk_score,
        "signals_found": signals_found,
        "evidence": evidence,
        "recommendations": recommendations,
    }