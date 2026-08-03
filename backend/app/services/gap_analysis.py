import json
import re

from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()


GAP_ANALYSIS_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are an enterprise compliance analyst performing contract gap analysis.

Compare a contract against a compliance checklist and find missing clauses.

Rules:
- A clause is only present if the contract text explicitly addresses it.
- Do not use outside knowledge.
- Quote the exact supporting sentence when a requirement is met.
- Return only a valid JSON array. Do not use Markdown.

Each item must have this format:
{{
  "requirement": "checklist requirement name",
  "status": "present" or "missing",
  "evidence": "exact sentence from the contract when present, otherwise empty string",
  "recommendation": "action to close the gap when missing, otherwise empty string"
}}
""",
        ),
        (
            "human",
            """
Contract:
{contract}

Compliance checklist:
{checklist}
""",
        ),
    ]
)


def clean_json_response(response: str) -> str:
    cleaned_response = response.strip()
    cleaned_response = re.sub(r"^```(?:json)?\s*", "", cleaned_response)
    cleaned_response = re.sub(r"\s*```$", "", cleaned_response)

    return cleaned_response.strip()


def analyze_contract_gaps(contract: str, checklist: str) -> dict:
    if not contract.strip() or not checklist.strip():
        return {
            "total_requirements": 0,
            "present_count": 0,
            "missing_count": 0,
            "results": [],
        }

    llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        temperature=0,
    )

    chain = GAP_ANALYSIS_PROMPT | llm | StrOutputParser()

    response = chain.invoke(
        {
            "contract": contract,
            "checklist": checklist,
        }
    )

    cleaned_response = clean_json_response(response)

    try:
        results = json.loads(cleaned_response)
    except json.JSONDecodeError as error:
        raise ValueError(
            "Gemini returned an invalid JSON gap-analysis response."
        ) from error

    if not isinstance(results, list):
        raise ValueError("Gemini gap-analysis response must be a JSON array.")

    present_count = sum(
        1
        for result in results
        if isinstance(result, dict) and result.get("status") == "present"
    )
    missing_count = sum(
        1
        for result in results
        if isinstance(result, dict) and result.get("status") == "missing"
    )

    return {
        "total_requirements": len(results),
        "present_count": present_count,
        "missing_count": missing_count,
        "results": [
            result
            for result in results
            if isinstance(result, dict)
        ],
    }
