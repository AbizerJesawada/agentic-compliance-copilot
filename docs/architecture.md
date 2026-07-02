# Architecture

## Project

Agentic Enterprise Compliance Copilot

## Purpose

The system helps companies analyze policies, contracts, SOPs, audit reports, and vendor documents using RAG and agentic AI workflows.

## High-Level Flow

1. User uploads documents from the frontend.
2. FastAPI backend receives and stores the files.
3. Document parser extracts text from PDFs, DOCX files, TXT files, and CSV files.
4. LlamaIndex chunks documents, attaches metadata, and creates searchable indexes.
5. Embeddings are stored in Chroma.
6. User asks a compliance question.
7. LangGraph controls the multi-step agent workflow.
8. LangChain handles prompts, tools, and structured outputs.
9. MCP exposes reusable tools such as document search, risk checking, and report generation.
10. Final response includes citations, risk score, issues, and suggested actions.

## Framework Responsibilities

- RAG: Retrieves relevant documents before generating answers.
- LlamaIndex: Handles document ingestion, chunking, metadata, indexing, and retrieval.
- LangChain: Handles prompts, tool calling, chains, and structured output parsing.
- LangGraph: Orchestrates the agent workflow.
- MCP: Exposes tools that the agent can call.
- FastAPI: Provides backend APIs.
- Next.js: Provides frontend user interface.
- PostgreSQL: Stores users, documents, chat history, audit logs, and reports.
- Chroma: Stores document embeddings for semantic search.