import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

USERS_FILE = Path("users.json")
TOKEN_SECRET = "compliance-copilot-secret"
TOKEN_TTL_HOURS = 24

DEFAULT_USERS = [
    {
        "username": "admin",
        "password": "admin123",
        "role": "admin",
    },
    {
        "username": "reviewer",
        "password": "review123",
        "role": "reviewer",
    },
    {
        "username": "analyst",
        "password": "analyst123",
        "role": "analyst",
    },
]


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()

    return f"{salt}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    salt, digest = stored_hash.split("$")
    computed = hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()

    return hmac.compare_digest(computed, digest)


def load_users() -> list[dict]:
    if not USERS_FILE.exists():
        users = []
        for user in DEFAULT_USERS:
            users.append(
                {
                    "username": user["username"],
                    "password_hash": hash_password(user["password"]),
                    "role": user["role"],
                }
            )

        USERS_FILE.parent.mkdir(exist_ok=True)
        USERS_FILE.write_text(
            json.dumps(users, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        return users

    return json.loads(USERS_FILE.read_text(encoding="utf-8"))


def save_users(users: list[dict]) -> None:
    USERS_FILE.write_text(
        json.dumps(users, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def authenticate_user(username: str, password: str) -> dict | None:
    users = load_users()

    for user in users:
        if user["username"] == username and verify_password(
            password,
            user["password_hash"],
        ):
            return {
                "username": user["username"],
                "role": user["role"],
            }

    return None


def create_token(username: str, role: str) -> str:
    payload = {
        "username": username,
        "role": role,
        "expires_at": (
            datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS)
        ).isoformat(),
    }

    encoded_payload = json.dumps(payload, sort_keys=True)
    signature = hmac.new(
        TOKEN_SECRET.encode(),
        encoded_payload.encode(),
        hashlib.sha256,
    ).hexdigest()

    return f"{signature}.{encoded_payload}"


def verify_token(token: str) -> dict | None:
    try:
        signature, encoded_payload = token.split(".", 1)
    except (ValueError, AttributeError):
        return None

    expected_signature = hmac.new(
        TOKEN_SECRET.encode(),
        encoded_payload.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_signature):
        return None

    try:
        payload = json.loads(encoded_payload)
    except json.JSONDecodeError:
        return None

    expires_at = datetime.fromisoformat(payload["expires_at"])

    if datetime.now(timezone.utc) > expires_at:
        return None

    return payload
