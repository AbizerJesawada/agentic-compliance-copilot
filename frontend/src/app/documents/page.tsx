"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, AlertCircle, RefreshCw, Trash2 } from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";

type Document = {
  id: string;
  original_filename: string;
  saved_filename: string;
  size_bytes: number;
  character_count: number;
  status: string;
  created_at: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
      void loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Library</h1>
          <p className="mt-2 text-sm text-zinc-400">
            View and manage uploaded compliance documents.
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
                  <span className="rounded bg-teal-950 px-2 py-0.5 text-teal-300 capitalize">
                    {doc.status}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void deleteDocument(doc.id)}
                className="ml-4 rounded p-2 text-zinc-500 transition hover:bg-rose-950 hover:text-rose-300"
                title="Delete document"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
