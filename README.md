# Agentic Enterprise Compliance Copilot

An MCP-enabled agentic AI system for enterprise compliance analysis using RAG, LangChain, LangGraph, LlamaIndex, FastAPI, Next.js, PostgreSQL, and Chroma.

## Goal

This project helps companies analyze internal policies, contracts, SOPs, vendor agreements, and audit documents. Users can upload documents, ask compliance questions, detect risks, retrieve cited evidence, and generate audit-ready reports.

## Tech Stack

- Frontend: Next.js
- Backend: FastAPI
- Database: PostgreSQL
- Vector Database: Chroma
- RAG / Indexing: LlamaIndex
- LLM Tools and Prompts: LangChain
- Agent Workflow: LangGraph
- Tool Protocol: MCP

## Day 1 Status

- Project structure created
- FastAPI backend initialized
- Backend `/health` endpoint working
- Next.js frontend initialized
- Basic homepage created

## Day 2 Status

- Added document upload API: `POST /documents/upload`
- Added file validation for PDF, DOCX, TXT, and CSV files
- Added document text extraction for TXT, CSV, PDF, and DOCX
- Added extracted text saving in `backend/extracted_text/`
- Added original file saving in `backend/uploads/`
- Added clean error handling for failed text extraction

## Current Backend APIs

- `GET /health` - checks if the backend is running
- `POST /documents/upload` - uploads a document, validates file type, saves the original file, extracts text, and saves extracted text

## Day 3 Status

- Improved PDF extraction using PyMuPDF
- Added extraction quality warning for low-quality/scanned PDFs
- Added text chunking service with chunk size and overlap
- Added chunking API: `POST /documents/chunk`
- Added chunk JSON saving in `backend/chunks/`

## Current Backend APIs

- `GET /health` - checks if the backend is running
- `POST /documents/upload` - uploads a document, validates file type, saves the original file, extracts text, and saves extracted text
- `POST /documents/chunk` - chunks extracted text and saves chunk data as JSON

## Day 4 Status

- Added Chroma vector database integration
- Added local SentenceTransformer embeddings using `all-MiniLM-L6-v2`
- Added chunk indexing API: `POST /documents/index`
- Added semantic search API: `POST /documents/search`
- Verified retrieval for compliance question over indexed chunks

- `POST /documents/index` - indexes saved chunk JSON files into Chroma vector database
- `POST /documents/search` - searches indexed chunks using semantic similarity

## Day 5: Basic RAG Answer API

Today we added the first version of the RAG answer system.

Completed:
- Added `backend/app/services/rag_answer.py`
- Added `/documents/ask` endpoint
- Added extractive answer generation from retrieved chunks
- Added best sentence selection to avoid returning full chunks
- Added source citations
- Added `answer_type`, `confidence`, and `retrieved_chunk_count`
- Added duplicate retrieved chunk removal

Current `/documents/ask` flow:

```text
User question
    ↓
Semantic search in ChromaDB
    ↓
Remove duplicate chunks
    ↓
Select best sentence from top chunk
    ↓
Return answer with sources

Additional improvements:
- Added confidence scoring based on vector distance.
- Added low-confidence guardrail to avoid answering unrelated questions.
- If retrieval confidence is low, the system returns: "I could not find relevant information in the indexed documents."