import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


REVIEW_QUEUE_DIR = Path("review_queue")
REVIEW_QUEUE_FILE = REVIEW_QUEUE_DIR / "controls.json"
VALID_DECISIONS = {"approved", "rejected"}


def load_controls() -> list[dict]:
    if not REVIEW_QUEUE_FILE.exists():
        return []

    return json.loads(
        REVIEW_QUEUE_FILE.read_text(encoding="utf-8")
    )


def save_controls(controls: list[dict]) -> None:
    REVIEW_QUEUE_DIR.mkdir(exist_ok=True)

    REVIEW_QUEUE_FILE.write_text(
        json.dumps(controls, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def save_pending_controls(
    discovered_controls: list[dict],
    query: str,
) -> list[dict]:
    saved_controls = load_controls()
    added_controls = []

    existing_keys = {
        (
            control.get("control_name"),
            control.get("evidence"),
        )
        for control in saved_controls
    }

    for control in discovered_controls:
        control_key = (
            control.get("control_name"),
            control.get("evidence"),
        )

        if control_key in existing_keys:
            continue

        record = {
            "id": str(uuid4()),
            "control_name": control["control_name"],
            "evidence": control["evidence"],
            "recommendation": control["recommendation"],
            "status": "pending_review",
            "discovered_from_query": query,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_at": None,
            "reviewer": None,
            "review_note": None,
        }

        saved_controls.append(record)
        added_controls.append(record)
        existing_keys.add(control_key)

    save_controls(saved_controls)

    return added_controls


def list_controls(
    status: str | None = None,
    search: str | None = None,
) -> list[dict]:
    controls = load_controls()

    if status is not None:
        controls = [
            control
            for control in controls
            if control.get("status") == status
        ]

    if search:
        normalized_search = search.lower().strip()
        controls = [
            control
            for control in controls
            if normalized_search in (control.get("control_name") or "").lower()
            or normalized_search in (control.get("evidence") or "").lower()
            or normalized_search in (control.get("recommendation") or "").lower()
        ]

    return controls


def review_control(
    control_id: str,
    decision: str,
    reviewer: str,
    review_note: str | None = None,
) -> dict:
    if decision not in VALID_DECISIONS:
        raise ValueError(
            "Decision must be either 'approved' or 'rejected'."
        )

    controls = load_controls()

    for control in controls:
        if control.get("id") != control_id:
            continue

        if control.get("status") != "pending_review":
            raise ValueError(
                "Only controls with pending_review status can be reviewed."
            )

        control["status"] = decision
        control["reviewer"] = reviewer
        control["review_note"] = review_note
        control["reviewed_at"] = datetime.now(timezone.utc).isoformat()

        save_controls(controls)

        return control

    raise ValueError("Control review record not found.")