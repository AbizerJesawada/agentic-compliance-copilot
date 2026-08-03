import json
import re

from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()


COMPARE_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are an enterprise compliance analyst.

Compare two compliance documents and find conflicting, contradictory, or
misaligned requirements between them.

Rules:
- Use only the provided document text.
- Do not use outside knowledge.
- Only report differences where both documents address the same topic.
- For each conflict, quote the exact relevant sentence from each document.
- Return only a valid JSON array. Do not use Markdown.

Each item must have this format:
{{
  "topic": "short topic name",
  "document_a_excerpt": "exact sentence from document A",
  "document_b_excerpt": "exact sentence from document B",
  "explanation": "why these two requirements conflict or differ"
}}
""",
        ),
        (
            "human",
            """
Document A ({document_a_name}):
{document_a}

Document B ({document_b_name}):
{document_b}
""",
        ),
    ]
)


def clean_json_response(response: str) -> str:
    cleaned_response = response.strip()
    cleaned_response = re.sub(r"^```(?:json)?\s*", "", cleaned_response)
    cleaned_response = re.sub(r"\s*```$", "", cleaned_response)

    return cleaned_response.strip()


def compare_documents(
    document_a: str,
    document_b: str,
    document_a_name: str = "Document A",
    document_b_name: str = "Document B",
) -> list[dict]:
    if not document_a.strip() or not document_b.strip():
        return []

    llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        temperature=0,
    )

    chain = COMPARE_PROMPT | llm | StrOutputParser()

    response = chain.invoke(
        {
            "document_a": document_a,
            "document_b": document_b,
            "document_a_name": document_a_name,
            "document_b_name": document_b_name,
        }
    )

    cleaned_response = clean_json_response(response)

    try:
        conflicts = json.loads(cleaned_response)
    except json.JSONDecodeError as error:
        raise ValueError(
            "Gemini returned an invalid JSON comparison response."
        ) from error

    if not isinstance(conflicts, list):
        raise ValueError("Gemini comparison response must be a JSON array.")

    return [
        conflict
        for conflict in conflicts
        if isinstance(conflict, dict)
        and conflict.get("topic")
        and conflict.get("explanation")
    ]
