# Agentic Compliance Copilot

An enterprise-focused AI application that helps compliance teams upload policy documents, search requirements, answer grounded questions, analyze risks, discover missing controls, and review AI findings.

## Problem

Compliance documents are long, unstructured, and difficult to search. Important requirements can be hidden in PDFs, contracts, policy documents, or vendor CSV files.

This project uses RAG, LangChain, LangGraph, ChromaDB, Gemini, hybrid retrieval, and human review workflows to make compliance information easier to find and verify.

## Main Features

- Upload PDF, DOCX, TXT, and CSV documents
- Extract text and save it locally
- Fixed-size, paragraph-aware, and CSV row-aware chunking
- Automatic document strategy routing
- ChromaDB vector indexing and semantic search
- Hybrid search using semantic similarity and keyword matching
- LangChain and Gemini grounded answers with source citations
- LangGraph workflow for RAG and risk-analysis decisions
- Rule-based compliance risk analysis
- AI discovery of additional compliance controls
- Human approval or rejection of AI-discovered controls
- RAG evaluation suite with pass rate, keyword coverage, and response time
- Saved evaluation report history

## Architecture

```text
Document Upload
    ↓
Text Extraction
    ↓
Automatic Strategy Router
    ↓
Fixed / Paragraph / CSV Row Chunking
    ↓
ChromaDB Vector Index
    ↓
Hybrid Retrieval
    ↓
LangGraph Workflow
    ↓
LangChain + Gemini Answer or Risk Summary
    ↓
Sources, Confidence, Evaluation, and Human Review
```

## Tech Stack

- Backend: FastAPI
- Frontend: Next.js and Tailwind CSS
- LLM framework: LangChain
- Agent workflow: LangGraph
- LLM: Google Gemini
- Vector database: ChromaDB
- Embeddings: Sentence Transformers
- Document processing: PyMuPDF, python-docx, CSV parsing
- Version control: Git and GitHub

## Run the Backend

Open a terminal inside the `backend` folder.

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --reload-dir app
```

Open Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

## Document Processing Workflow

1. Upload a document with `POST /documents/upload`
2. Copy `extracted_text_path` from the response
3. Create chunks with `POST /documents/chunk`
4. Index chunks with `POST /documents/index`
5. Search with `POST /documents/search-hybrid`
6. Ask grounded questions with `POST /documents/ask`

For automatic chunking:

```json
{
  "extracted_text_path": "extracted_text/example.txt",
  "chunking_method": "auto"
}
```

Automatic strategy selection:

- Clean TXT, DOCX, and text-based PDF: `paragraph`
- Low-quality or scanned PDF text: `fixed` with OCR warning
- CSV files: `csv_rows`

## RAG Evaluation

Evaluation cases are stored in:

```text
sample-data/rag_evaluation_cases.json
```

Run the evaluation suite:

```text
POST /documents/evaluate-rag
```

Each run checks:

- Expected facts found in the answer
- Keyword coverage
- Retrieval confidence
- Retrieved chunk count
- Response time
- Pass or fail result

Evaluation reports are saved in:

```text
backend/evaluation_reports/
```

View previous reports:

```text
GET /documents/evaluation-reports
```

## Important API Endpoints

- `POST /documents/upload`
- `POST /documents/chunk`
- `POST /documents/index`
- `POST /documents/search`
- `POST /documents/search-hybrid`
- `POST /documents/ask`
- `POST /documents/analyze-risk`
- `POST /documents/discover-controls`
- `GET /documents/controls/review`
- `POST /documents/controls/review`
- `POST /documents/evaluate-rag`
- `GET /documents/evaluation-reports`

## Sample Data

- `sample-data/chunking_comparison_policy.txt`
- `sample-data/vendor_security_requirements.txt`
- `sample-data/vendor_compliance_register.csv`
- `sample-data/rag_evaluation_cases.json`

## Current Limitations

- Scanned PDFs need OCR for accurate text extraction.
- Local files and ChromaDB are used during development.
- Authentication, database persistence, and cloud deployment will be added later.

## Future Improvements

- LlamaIndex ingestion pipeline
- MCP server and MCP tools
- Document comparison and policy conflict detection
- Contract gap analysis
- User authentication and role-based access
- Frontend compliance dashboard
- PostgreSQL persistence, Docker, tests, and CI/CD

## Author

Abizer Jesawada