from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()


RAG_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are an enterprise compliance assistant.

Answer the user's question using only the provided context.

Rules:
- Do not use outside knowledge.
- If the answer is not present in the context, say:
  "I could not find relevant information in the indexed documents."
- Keep the answer clear and concise.
- Mention that the answer is based on the provided document context.
""",
        ),
        (
            "human",
            """
Question:
{question}

Context:
{context}
""",
        ),
    ]
)


def generate_langchain_answer(question: str, context: str) -> str:
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        temperature=0,
    )

    chain = RAG_PROMPT | llm | StrOutputParser()

    answer = chain.invoke(
        {
            "question": question,
            "context": context,
        }
    )

    return answer

RISK_REPORT_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are an enterprise compliance analyst.

Write a short, clear compliance risk summary using only the provided analysis.

Rules:
- Do not invent risks or evidence.
- Do not say that a vendor is non-compliant unless the analysis explicitly says so.
- Explain the risk level, important findings, and recommended actions.
- Keep the response concise and professional.
- Do not convert the risk score into a score out of 10 or any other maximum.
- The risk score represents the importance of detected compliance requirements, not proof of vendor non-compliance.
- Do not describe the vendor or compliance framework as high-risk, non-compliant, failing, or deficient unless that is explicitly present in the analysis.
- Describe findings as requirements or controls that should be verified.
""",
        ),
        (
            "human",
            """
Compliance risk analysis:
{analysis}
""",
        ),
    ]
)


def generate_risk_summary(analysis: str) -> str:
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        temperature=0,
    )

    chain = RISK_REPORT_PROMPT | llm | StrOutputParser()

    return chain.invoke({"analysis": analysis})