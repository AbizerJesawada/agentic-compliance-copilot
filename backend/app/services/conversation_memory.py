import json
import re
from datetime import datetime, timezone
from pathlib import Path


CONVERSATION_DATA_DIR = Path("conversation_data")
VALID_SESSION_ID = re.compile(r"^[a-zA-Z0-9_-]+$")


def get_session_file_path(session_id: str) -> Path:
    if not VALID_SESSION_ID.fullmatch(session_id):
        raise ValueError(
            "Session ID can contain only letters, numbers, hyphens, and underscores."
        )

    CONVERSATION_DATA_DIR.mkdir(exist_ok=True)

    return CONVERSATION_DATA_DIR / f"{session_id}.json"


def load_conversation(session_id: str) -> list[dict]:
    session_file_path = get_session_file_path(session_id)

    if not session_file_path.exists():
        return []

    return json.loads(session_file_path.read_text(encoding="utf-8"))


def save_conversation_message(
    session_id: str,
    role: str,
    content: str,
) -> dict:
    if role not in {"user", "assistant"}:
        raise ValueError("Message role must be 'user' or 'assistant'.")

    messages = load_conversation(session_id)

    message = {
        "role": role,
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    messages.append(message)

    session_file_path = get_session_file_path(session_id)
    session_file_path.write_text(
        json.dumps(messages, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    return message


def get_recent_conversation_messages(
    session_id: str,
    limit: int = 4,
) -> list[dict]:
    if limit < 1:
        raise ValueError("Conversation message limit must be at least 1.")

    messages = load_conversation(session_id)

    return messages[-limit:]

def format_conversation_history(messages: list[dict]) -> str:
    if not messages:
        return ""

    formatted_messages = []

    for message in messages:
        role = message["role"].title()
        content = message["content"]

        formatted_messages.append(f"{role}: {content}")

    return "\n".join(formatted_messages)

def list_conversation_sessions() -> list[dict]:
    if not CONVERSATION_DATA_DIR.exists():
        return []

    sessions = []

    for session_file in CONVERSATION_DATA_DIR.glob("*.json"):
        messages = json.loads(session_file.read_text(encoding="utf-8"))

        if not messages:
            continue

        title = next(
            (
                message["content"]
                for message in messages
                if message["role"] == "user"
            ),
            "Untitled conversation",
        )

        sessions.append(
            {
                "session_id": session_file.stem,
                "title": title,
                "message_count": len(messages),
                "last_message": messages[-1]["content"],
                "updated_at": messages[-1]["created_at"],
            }
        )

    return sorted(
        sessions,
        key=lambda session: session["updated_at"],
        reverse=True,
    )