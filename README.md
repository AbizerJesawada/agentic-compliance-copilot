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
./setup_local.ps1
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --reload-dir app
```

If the virtual environment already exists, start from the activation command. The setup script requires Python 3.11 to be installed first.

## Run the Frontend

Open a second terminal inside the `frontend` folder.

```powershell
npm install
npm run dev
```

The frontend reads `NEXT_PUBLIC_API_BASE_URL` from `frontend/.env.local`. When it is not set, it uses `http://127.0.0.1:8000` for local development.

Open Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

## Document Processing Workflow

1. Upload a document with `POST /documents/upload`
2. The backend extracts text, selects a chunking strategy, creates chunks, and indexes them automatically.
3. Review the upload response for the text preview, selected strategy, extraction warning, and indexing result.
4. Search with `POST /documents/search-hybrid` or ask a grounded question with `POST /documents/assistant/query`.

The `POST /documents/chunk` and `POST /documents/index` endpoints remain available when you want to test a chunking method manually.

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
- Login and role information are intended for local demonstration; this is not a production authentication system.
- Conversation, review, audit, and evaluation data are stored locally as JSON files.
- The application has not been deployed.

## Future Improvements

- Persistent database storage such as PostgreSQL
- Automated backend and frontend test coverage
- CI checks for formatting, tests, and builds
- Production-grade authentication, authorization, and secret management
- Cloud deployment with managed object and vector storage

## LlamaIndex Retrieval

The project includes a second RAG retrieval pipeline using LlamaIndex.

LlamaIndex loads saved chunk JSON files as documents and preserves metadata:

- Source path
- Chunk index
- Character count
- Chunking method

Available endpoints:

- `POST /documents/llamaindex/index`
- `POST /documents/llamaindex/search`
- `POST /documents/retrieval-compare`

Example workflow:

1. Create chunks with `POST /documents/chunk`.
2. Index the chunk JSON with `POST /documents/llamaindex/index`.
3. Search using `POST /documents/llamaindex/search`.
4. Compare LlamaIndex retrieval with ChromaDB hybrid retrieval using `POST /documents/retrieval-compare`.

Current behavior: the LlamaIndex index is stored in backend memory. After a backend restart, index the chunk JSON again.

## MCP Server

The project includes an MCP server in `mcp-server/server.py`.

The MCP server exposes the existing FastAPI compliance backend as tools for MCP-compatible AI clients.

Available MCP tools:

- `search_compliance_documents`
- `ask_compliance_question`
- `analyze_compliance_risk`
- `discover_additional_compliance_controls`

Architecture:

AI Client -> MCP Server -> FastAPI Backend -> Retrieval, LangGraph, LangChain, Gemini -> Structured Result

The MCP server does not duplicate RAG logic. It calls existing FastAPI endpoints and returns their structured results.

### Run MCP Locally

1. Start the FastAPI backend:

`python -m uvicorn app.main:app --reload --reload-dir app`

2. Start the MCP Inspector:

`npx -y @modelcontextprotocol/inspector`

3. Select `STDIO` transport.

4. Use this command:

`C:/Users/Abizer/OneDrive/Desktop/agentic-compliance-copilot/backend/.venv/Scripts/python.exe`

5. Use this argument:

`C:/Users/Abizer/OneDrive/Desktop/agentic-compliance-copilot/mcp-server/server.py`

6. Connect and test the available MCP tools.

The MCP server was tested successfully with the MCP Inspector for hybrid document search, grounded answers, and compliance risk analysis.

## Day 15: Unified Assistant Router

Previously, users had to choose separate endpoints for document questions, risk analysis, and control discovery.

A unified endpoint now handles all three workflows:

```text
POST /documents/assistant/query
```

The router reads the user query and selects the correct workflow:

- Direct document question -> RAG question-answering workflow
- Compliance risk request -> risk-analysis workflow
- Missing or additional-controls request -> control-discovery workflow

Example request:

```json
{
  "query": "Which vendor has quarterly audits?",
  "top_k": 3
}
```

Example routing response fields:

```json
{
  "selected_workflow": "question_answering",
  "routing_reason": "The query does not request risk analysis or control discovery."
}
```

The MCP server also exposes this unified workflow through:

```text
run_compliance_assistant
```

This allows an MCP-compatible AI client to use one tool while the backend selects the appropriate internal workflow.

## Day 16: Conversation Memory and Answer Feedback

### Conversation Memory

The unified assistant supports optional session-based conversation memory.

```json
{
  "query": "Which vendor has quarterly audits?",
  "session_id": "vendor-review-001"
}
```

Use the same `session_id` for every message in one conversation.

Example follow-up request:

```json
{
  "query": "Does it require encryption?",
  "session_id": "vendor-review-001"
}
```

The assistant loads recent messages from the same session, allowing it to understand that "it" refers to Beta Ltd.

Conversation history is stored locally during development:

```text
backend/conversation_data/
```

### Answer Feedback

Users can submit feedback about assistant answers:

```text
POST /documents/assistant/feedback
```

Example request:

```json
{
  "session_id": "vendor-review-001",
  "query": "Does it require encryption?",
  "helpful": true,
  "comment": "It correctly identified that Beta Ltd requires encryption."
}
```

Saved feedback can be reviewed with:

```text
GET /documents/assistant/feedback
```

Optional filters:

```text
/documents/assistant/feedback?helpful=true
/documents/assistant/feedback?helpful=false
```

Feedback is stored locally during development:

```text
backend/feedback_data/
```

The local conversation and feedback folders are ignored by Git. In production, these features should use a database, user authentication, and access control.


## Day 17: Frontend Compliance Assistant

Built a Next.js frontend for the Agentic Compliance Copilot.

### Features Added

- Chat workspace for asking compliance questions.
- Integration with `POST /documents/assistant/query`.
- Automatic workflow routing:
  - Question answering uses RAG.
  - Risk requests use risk analysis.
  - Missing-control requests use control discovery.
- Session IDs are created for new conversations.
- Follow-up questions use the same session ID, allowing the backend to use recent conversation context.
- Answer details panel displays:
  - Selected workflow
  - Routing reason
  - Source document chunks
  - Risk information when available
  - Helpful / not helpful feedback controls
- Frontend feedback is saved through:
  - `POST /documents/assistant/feedback`
- CORS was configured in FastAPI so the frontend at `http://localhost:3000` can call the backend at `http://127.0.0.1:8000`.

### Verification

The frontend was tested with vendor compliance questions. It correctly identified Beta Ltd as the vendor with quarterly audits and used session context to answer follow-up questions about encryption.

---

## Day 18: Conversation History and Reopening Chats

Added persistent conversation history to the backend and frontend.

### Backend Features Added

Conversation messages are stored in separate JSON files:

```text
backend/conversation_data/<session_id>.json
```

Each stored message includes:

- `role`: `user` or `assistant`
- `content`
- `created_at`

New API endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /documents/assistant/sessions` | Returns summaries of all saved conversations. |
| `GET /documents/assistant/sessions/{session_id}` | Returns complete messages for one selected conversation. |

A session summary includes:

- `session_id`
- `title`: first user question
- `message_count`
- `last_message`
- `updated_at`

### Frontend Features Added

- Previous conversations appear in the left sidebar.
- Chats are ordered by most recently updated.
- Each chat uses its first user question as the title.
- Clicking a saved conversation loads its complete messages.
- The selected conversation is highlighted.
- A reopened conversation keeps the same session ID, so users can continue asking context-aware follow-up questions.
- Conversation messages are lazy loaded: summaries load first, while full messages load only after a user selects a chat.

### Verification

The feature was tested successfully:

1. Created a new conversation.
2. Asked about data deletion requirements.
3. Confirmed the new chat appeared first in the history sidebar.
4. Reopened an earlier Beta Ltd conversation.
5. Asked, `What is its audit frequency?`
6. The assistant used the restored context and correctly answered: `quarterly`.
