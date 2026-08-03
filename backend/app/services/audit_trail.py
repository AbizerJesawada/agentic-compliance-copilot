import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


AUDIT_DIR = Path("audit_data")
AUDIT_FILE = AUDIT_DIR / "audit_log.json"


def load_audit_log() -> list[dict]:
    if not AUDIT_FILE.exists():
        return []

    return json.loads(AUDIT_FILE.read_text(encoding="utf-8"))


def save_audit_log(entries: list[dict]) -> None:
    AUDIT_DIR.mkdir(exist_ok=True)

    AUDIT_FILE.write_text(
        json.dumps(entries, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def log_action(
    action: str,
    username: str,
    details: dict | None = None,
) -> dict:
    entry = {
        "id": str(uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "username": username,
        "details": details or {},
    }

    entries = load_audit_log()
    entries.append(entry)
    save_audit_log(entries)

    return entry


def list_audit_entries(limit: int = 100) -> list[dict]:
    entries = load_audit_log()

    return list(reversed(entries))[:limit]
