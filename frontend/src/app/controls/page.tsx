"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  LoaderCircle,
  AlertCircle,
  RefreshCw,
  ArrowDownToLine,
  Search,
} from "lucide-react";
import { ToastContainer, useToasts } from "@/components/Toast";
import { exportControlsUrl } from "@/lib/api";

const API_BASE_URL = "http://127.0.0.1:8000";

type Control = {
  id: string;
  control_name: string;
  evidence: string;
  recommendation: string;
  status: string;
  discovered_from_query: string;
  created_at: string;
  reviewed_at: string | null;
  reviewer: string | null;
  review_note: string | null;
};

export default function ControlsPage() {
  const [controls, setControls] = useState<Control[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toasts, pushToast, dismissToast } = useToasts();

  async function loadControls() {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const query = params.toString();
      const url = `${API_BASE_URL}/documents/controls/review${
        query ? `?${query}` : ""
      }`;

      const response = await fetch(url);

      if (!response.ok) throw new Error("Could not load controls.");

      const data: { controls: Control[] } = await response.json();
      setControls(data.controls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load controls.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadControls();
  }, [filter, searchQuery]);

  async function reviewControl(controlId: string, decision: string) {
    setReviewingId(controlId);

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/controls/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            control_id: controlId,
            decision,
            reviewer: "frontend-user",
          }),
        }
      );

      if (!response.ok) throw new Error("Review failed.");

      pushToast(
        decision === "approved"
          ? "Control approved."
          : "Control rejected."
      );
      await loadControls();
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Review failed.",
        "error"
      );
    } finally {
      setReviewingId("");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Control Review</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Review AI-discovered compliance controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={exportControlsUrl(filter ?? undefined)}
            className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            <ArrowDownToLine size={15} /> Export CSV
          </a>
          <button
            type="button"
            onClick={() => void loadControls()}
            className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          {[null, "pending_review", "approved", "rejected"].map((status) => (
            <button
              key={status ?? "all"}
              type="button"
              onClick={() => setFilter(status)}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                filter === status
                  ? "bg-teal-400 text-zinc-950"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {status ? status.replace("_", " ") : "All"}
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search controls..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none transition focus:border-teal-500"
          />
        </div>
      </div>

      {isLoading && (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-zinc-400">
          <LoaderCircle className="animate-spin" size={18} />
          Loading controls...
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-md border border-rose-800 bg-rose-950/50 p-4 text-sm text-rose-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && controls.length === 0 && (
        <p className="mt-10 text-center text-sm text-zinc-500">
          No controls found.
        </p>
      )}

      {!isLoading && controls.length > 0 && (
        <div className="mt-6 space-y-4">
          {controls.map((control) => (
            <div
              key={control.id}
              className="rounded-md border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-medium">
                    {control.control_name.replaceAll("_", " ")}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    {control.recommendation}
                  </p>
                  <div className="mt-3 rounded bg-zinc-950 p-3 text-xs text-zinc-500">
                    <span className="text-zinc-400">Evidence:</span>{" "}
                    {control.evidence}
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">
                    From: {control.discovered_from_query}
                  </p>
                </div>

                <div className="shrink-0">
                  {control.status === "pending_review" ? (
                    <span className="rounded bg-amber-950 px-2 py-1 text-xs text-amber-300">
                      Pending
                    </span>
                  ) : control.status === "approved" ? (
                    <span className="flex items-center gap-1 rounded bg-teal-950 px-2 py-1 text-xs text-teal-300">
                      <CheckCircle2 size={12} /> Approved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded bg-rose-950 px-2 py-1 text-xs text-rose-300">
                      <XCircle size={12} /> Rejected
                    </span>
                  )}
                </div>
              </div>

              {control.status === "pending_review" && (
                <div className="mt-4 flex gap-2 border-t border-zinc-800 pt-4">
                  <button
                    type="button"
                    disabled={reviewingId === control.id}
                    onClick={() => void reviewControl(control.id, "approved")}
                    className="flex h-9 items-center gap-2 rounded-md bg-teal-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reviewingId === control.id ? (
                      <LoaderCircle className="animate-spin" size={15} />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={reviewingId === control.id}
                    onClick={() => void reviewControl(control.id, "rejected")}
                    className="flex h-9 items-center gap-2 rounded-md border border-rose-700 px-4 text-sm text-rose-300 transition hover:bg-rose-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle size={15} />
                    Reject
                  </button>
                </div>
              )}

              {control.status !== "pending_review" && control.reviewer && (
                <div className="mt-4 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                  <span className="text-zinc-400">
                    Reviewed by {control.reviewer}
                  </span>
                  {control.review_note && (
                    <p className="mt-1">Note: {control.review_note}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
