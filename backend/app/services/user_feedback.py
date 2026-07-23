import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


FEEDBACK_DATA_DIR = Path("feedback_data")
FEEDBACK_FILE_PATH = FEEDBACK_DATA_DIR / "answer_feedback.json"


def load_feedback() -> list[dict]:
    if not FEEDBACK_FILE_PATH.exists():
        return []

    return json.loads(
        FEEDBACK_FILE_PATH.read_text(encoding="utf-8")
    )


def save_answer_feedback(
    session_id: str | None,
    query: str,
    helpful: bool,
    comment: str | None = None,
) -> dict:
    FEEDBACK_DATA_DIR.mkdir(exist_ok=True)

    feedback_entries = load_feedback()

    feedback_entry = {
        "id": str(uuid4()),
        "session_id": session_id,
        "query": query,
        "helpful": helpful,
        "comment": comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    feedback_entries.append(feedback_entry)

    FEEDBACK_FILE_PATH.write_text(
        json.dumps(feedback_entries, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    return feedback_entry
def list_answer_feedback(
    helpful: bool | None = None,
) -> list[dict]:
    feedback_entries = load_feedback()

    if helpful is None:
        return feedback_entries

    return [
        entry
        for entry in feedback_entries
        if entry["helpful"] == helpful
]