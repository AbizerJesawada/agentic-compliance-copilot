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