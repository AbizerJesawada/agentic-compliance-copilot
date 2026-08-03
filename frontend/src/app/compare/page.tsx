"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  FileText,
  GitCompare,
  LoaderCircle,
  RefreshCw,
  Scale,
} from "lucide-react";
import { compareDocuments } from "@/lib/api";
import { ToastContainer, useToasts } from "@/components/Toast";

const API_BASE_URL = "http://127.0.0.1:8000";

type Document = {
  id: string;
  original_filename: string;
  status: string;
};

export default function ComparePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentAId, setDocumentAId] = useState("");
  const [documentBId, setDocumentBId] = useState("");
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [comparisonMeta, setComparisonMeta] = useState<{
    document_a: string;
    document_b: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState("");
  const { toasts, pushToast, dismissToast } = useToasts();

  async function loadDocuments() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/documents`);
      if (!response.ok) throw new Error("Could not load documents.");
      const data: { documents: Document[] } = await response.json();
      const indexed = (data.documents ?? []).filter(
        (doc) => doc.status === "indexed"
      );
      setDocuments(indexed);
      if (indexed.length >= 2) {
        setDocumentAId((current) => current || indexed[0].id);
        setDocumentBId((current) => current || indexed[1].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load documents."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function handleCompare() {
    if (!documentAId || !documentBId) {
      pushToast("Select two documents to compare.", "error");
      return;
    }
    if (documentAId === documentBId) {
      pushToast("Select two different documents.", "error");
      return;
    }

    setIsComparing(true);
    setError("");
    try {
      const result = await compareDocuments(documentAId, documentBId);
      setConflicts(result.conflicts ?? []);
      setComparisonMeta({
        document_a: result.document_a,
        document_b: result.document_b,
      });
      if ((result.conflicts ?? []).length === 0) {
        pushToast("No conflicting requirements found.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Comparison failed."
      );
    } finally {
      setIsComparing(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Scale size={22} className="text-teal-300" /> Document Comparison
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Find conflicting requirements between two indexed documents.
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

      {!isLoading && documents.length < 2 && (
        <p className="mt-10 text-center text-sm text-zinc-500">
          Upload and index at least two documents to compare them.
        </p>
      )}

      {!isLoading && documents.length >= 2 && (
        <>
          <div className="mt-6 grid gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <FileText size={13} /> Document A
              </label>
              <select
                value={documentAId}
                onChange={(e) => setDocumentAId(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-teal-500"
              >
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.original_filename}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <FileText size={13} /> Document B
              </label>
              <select
                value={documentBId}
                onChange={(e) => setDocumentBId(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-teal-500"
              >
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.original_filename}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                disabled={isComparing}
                onClick={() => void handleCompare()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-400 text-sm font-semibold text-zinc-950 transition hover:bg-teal-300 disabled:opacity-60"
              >
                {isComparing ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" /> Comparing...
                  </>
                ) : (
                  <>
                    <GitCompare size={16} /> Compare documents
                  </>
                )}
              </button>
            </div>
          </div>

          {comparisonMeta && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-300">
                  Conflicts between{" "}
                  <span className="text-teal-300">
                    {comparisonMeta.document_a}
                  </span>{" "}
                  and{" "}
                  <span className="text-teal-300">
                    {comparisonMeta.document_b}
                  </span>
                </h2>
                <span className="rounded bg-rose-950 px-2 py-1 text-xs text-rose-300">
                  {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"}
                </span>
              </div>

              {conflicts.length === 0 && (
                <p className="mt-4 text-sm text-zinc-400">
                  No conflicting requirements were found between these documents.
                </p>
              )}

              <div className="mt-4 space-y-4">
                {conflicts.map((conflict, index) => (
                  <div
                    key={index}
                    className="rounded-md border border-zinc-800 bg-zinc-900 p-5"
                  >
                    <h3 className="text-sm font-medium text-zinc-200">
                      {conflict.topic}
                    </h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded bg-zinc-950 p-3">
                        <p className="text-xs font-medium text-teal-300">
                          {comparisonMeta.document_a}
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                          {conflict.document_a_excerpt}
                        </p>
                      </div>
                      <div className="rounded bg-zinc-950 p-3">
                        <p className="text-xs font-medium text-rose-300">
                          {comparisonMeta.document_b}
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                          {conflict.document_b_excerpt}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                      {conflict.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
