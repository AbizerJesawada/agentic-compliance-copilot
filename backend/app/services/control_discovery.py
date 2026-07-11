import json
import re

from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()


CONTROL_DISCOVERY_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are an enterprise compliance analyst.

Find additional compliance controls explicitly stated in the document context.

Rules:
- Use only the provided document context.
- Do not use outside knowledge.
- Do not repeat any control that is already listed as a known signal.
- Do not create a control if the evidence is not clearly present.
- Evidence must be an exact sentence from the context.
- Return only a valid JSON array. Do not use Markdown.

Each item must have this format:
{{
  "control_name": "short descriptive name",
  "evidence": "exact sentence from the context",
  "recommendation": "clear action for a compliance reviewer"
}}
""",
        ),
        (
            "human",
            """
Known signals already detected:
{known_signals}

Document context:
{context}
""",
        ),
    ]
)


def clean_json_response(response: str) -> str:
    cleaned_response = response.strip()
    cleaned_response = re.sub(
        r"^```(?:json)?\s*",
        "",
        cleaned_response,
    )
    cleaned_response = re.sub(
        r"\s*```$",
        "",
        cleaned_response,
    )

    return cleaned_response.strip()


def discover_additional_controls(
    context: str,
    known_signals: list[str],
) -> list[dict]:
    if not context.strip():
        return []

    llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        temperature=0,
    )

    chain = CONTROL_DISCOVERY_PROMPT | llm | StrOutputParser()

    response = chain.invoke(
        {
            "context": context,
            "known_signals": ", ".join(known_signals) or "None",
        }
    )

    cleaned_response = clean_json_response(response)

    try:
        discovered_controls = json.loads(cleaned_response)
    except json.JSONDecodeError as error:
        raise ValueError(
            "Gemini returned an invalid JSON control-discovery response."
        ) from error

    if not isinstance(discovered_controls, list):
        raise ValueError(
            "Gemini control-discovery response must be a JSON array."
        )

    reviewed_controls = []

    for control in discovered_controls:
        if not isinstance(control, dict):
            continue

        control_name = control.get("control_name", "").strip()
        evidence = control.get("evidence", "").strip()
        recommendation = control.get("recommendation", "").strip()

        if not control_name or not evidence or not recommendation:
            continue

        reviewed_controls.append(
            {
                "control_name": control_name,
                "evidence": evidence,
                "recommendation": recommendation,
                "status": "pending_review",
            }
        )

    return reviewed_controls