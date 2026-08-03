"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  LoaderCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { ToastContainer, useToasts } from "@/components/Toast";

const API_BASE_URL = "http://127.0.0.1:8000";

type Document = {
  id: string;
  original_filename: string;
  saved_filename: string;
  size_bytes: number;
  character_count: number;
  status: string;
  version: number;
  created_at: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [previewContent, setPreviewContent] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const { toasts, pushToast, dismissToast } = useToasts();

  async function loadDocuments() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/documents`);
      if (!response.ok) throw new Error("Could not load documents.");
      const data: { documents: Document[] } = await response.json();
      setDocuments(data.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally { setIsLoading(false); }
  }

  useEffect(() => { void loadDocuments(); }, []);

  async function deleteDocument(docId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed.");
      pushToast("Document deleted.");
      void loadDocuments();
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Delete failed.",
        "error"
      );
    }
  }

  async function openPreview(doc: Document) {
    setPreviewDocument(doc);
    setPreviewContent("");
    setIsPreviewLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${doc.id}/content`
      );
      if (!response.ok) throw new Error("Could not load document content.");
      const data: { content: string } = await response.json();
      setPreviewContent(data.content);
    } catch (err) {
      setPreviewContent(
        err instanceof Error ? err.message : "Failed to load preview."
      );
    } finally {
      setIsPreviewLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Library</h1>
          <p className="mt-2 text-sm text-zinc-400">
            View and manage uploaded compliance documents. Re-uploading a file
            creates a new version.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDocuments()}
          className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {isLoading && (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-zinc-400">
          <LoaderCircle className="animate-spin" size={18} /> Loading documents...
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-md border border-rose-800 bg-rose-950/50 p-4 text-sm text-rose-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && documents.length === 0 && (
        <p className="mt-10 text-center text-sm text-zinc-500">No documents uploaded yet.</p>
      )}

      {!isLoading && documents.length > 0 && (
        <div className="mt-6 space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{doc.original_filename}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                  <span>{(doc.size_bytes / 1024).toFixed(1)} KB</span>
                  <span>{doc.character_count.toLocaleString()} chars</span>
                  {doc.version != null && (
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-400">
                      v{doc.version}
                    </span>
                  )}
                  <span className="rounded bg-teal-950 px-2 py-0.5 text-teal-300 capitalize">
                    {doc.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void openPreview(doc)}
                  className="rounded p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                  title="Preview document"
                >
                  <Eye size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => void deleteDocument(doc.id)}
                  className="rounded p-2 text-zinc-500 transition hover:bg-rose-950 hover:text-rose-300"
                  title="Delete document"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewDocument && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setPreviewDocument(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-zinc-700 bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {previewDocument.original_filename}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {previewDocument.character_count.toLocaleString()} characters
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="ml-4 rounded p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {isPreviewLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400">
                  <LoaderCircle className="animate-spin" size={18} />
                  Loading content...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-300">
                  {previewContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
