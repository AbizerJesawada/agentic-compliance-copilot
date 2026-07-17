import json
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


EVALUATION_REPORTS_DIR = Path("evaluation_reports")


def normalize_text(text: str) -> str:
    cleaned_text = text.lower()
    cleaned_text = re.sub(r"[^a-z0-9\s]", " ", cleaned_text)
    return re.sub(r"\s+", " ", cleaned_text).strip()


def calculate_keyword_coverage(
    answer: str,
    expected_keywords: list[str],
) -> tuple[float, list[str]]:
    normalized_answer = normalize_text(answer)

    found_keywords = [
        keyword
        for keyword in expected_keywords
        if normalize_text(keyword) in normalized_answer
    ]

    if not expected_keywords:
        return 0.0, found_keywords

    coverage = len(found_keywords) / len(expected_keywords)

    return round(coverage, 2), found_keywords


def evaluate_rag_answer(
    question: str,
    answer: str,
    expected_keywords: list[str],
    confidence: str,
    retrieved_chunk_count: int,
) -> dict:
    keyword_coverage, found_keywords = calculate_keyword_coverage(
        answer=answer,
        expected_keywords=expected_keywords,
    )

    missing_keywords = [
        keyword
        for keyword in expected_keywords
        if keyword not in found_keywords
    ]

    passed = (
        keyword_coverage >= 0.8
        and confidence != "low"
        and retrieved_chunk_count > 0
    )

    return {
        "question": question,
        "answer": answer,
        "expected_keywords": expected_keywords,
        "found_keywords": found_keywords,
        "missing_keywords": missing_keywords,
        "keyword_coverage": keyword_coverage,
        "confidence": confidence,
        "retrieved_chunk_count": retrieved_chunk_count,
        "passed": passed,
    }


def save_evaluation_report(report: dict) -> str:
    EVALUATION_REPORTS_DIR.mkdir(exist_ok=True)

    created_at = datetime.now(timezone.utc)
    report_id = str(uuid4())

    report_with_metadata = {
        "report_id": report_id,
        "created_at": created_at.isoformat(),
        **report,
    }

    filename = (
        f"rag_evaluation_{created_at.strftime('%Y%m%d_%H%M%S')}"
        f"_{report_id[:8]}.json"
    )
    report_path = EVALUATION_REPORTS_DIR / filename

    report_path.write_text(
        json.dumps(report_with_metadata, indent=2),
        encoding="utf-8",
    )

    return str(report_path)

def list_evaluation_reports(limit: int = 10) -> list[dict]:
    if not EVALUATION_REPORTS_DIR.exists():
        return []

    report_paths = sorted(
        EVALUATION_REPORTS_DIR.glob("*.json"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )

    reports = []

    for report_path in report_paths[:limit]:
        report = json.loads(
            report_path.read_text(encoding="utf-8")
        )

        reports.append(
            {
                "report_id": report["report_id"],
                "created_at": report["created_at"],
                "total_cases": report["total_cases"],
                "passed_cases": report["passed_cases"],
                "failed_cases": report["failed_cases"],
                "pass_rate": report["pass_rate"],
                "report_path": str(report_path),
            }
        )

    return reports