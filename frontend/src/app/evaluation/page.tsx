"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  PlayCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { ToastContainer, useToasts } from "@/components/Toast";

const API_BASE_URL = "http://127.0.0.1:8000";

type EvaluationReport = {
  report_id: string;
  created_at: string;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  pass_rate: number;
  report_path: string;
};

export default function EvaluationPage() {
  const [reports, setReports] = useState<EvaluationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const { toasts, pushToast, dismissToast } = useToasts();

  async function loadReports() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/evaluation-reports`
      );

      if (!response.ok) {
        throw new Error("Could not load evaluation reports.");
      }

      const data: {
        reports: EvaluationReport[];
      } = await response.json();

      setReports(data.reports);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load reports."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  async function runEvaluation() {
    setIsRunning(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/evaluate-rag`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error("Evaluation run failed.");
      }

      const data = await response.json();
      pushToast(
        `Evaluation complete: ${data.passed_cases}/${data.total_cases} passed (${Math.round(
          data.pass_rate * 100
        )}%).`
      );
      await loadReports();
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Evaluation run failed.",
        "error"
      );
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            RAG Evaluation Reports
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            View pass rates, keyword coverage, and response times.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => void runEvaluation()}
            className="flex h-9 items-center gap-2 rounded-md bg-teal-400 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-teal-300 disabled:opacity-60"
          >
            {isRunning ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <PlayCircle size={15} />
            )}
            Run evaluation
          </button>

          <button
            type="button"
            onClick={() => void loadReports()}
            className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-zinc-400">
          <LoaderCircle className="animate-spin" size={18} />
          Loading reports...
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-md border border-rose-800 bg-rose-950/50 p-4 text-sm text-rose-300">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && reports.length === 0 && (
        <p className="mt-10 text-center text-sm text-zinc-500">
          No evaluation reports found.
        </p>
      )}

      {!isLoading && reports.length > 0 && (
        <div className="mt-6 space-y-4">
          {reports.map((report) => (
            <div
              key={report.report_id}
              className="rounded-md border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">
                    {new Date(
                      report.created_at
                    ).toLocaleString()}
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {report.pass_rate * 100}%
                  </p>

                  <p className="text-xs text-zinc-400">
                    Pass rate
                  </p>
                </div>

                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-zinc-200">
                      {report.total_cases}
                    </p>

                    <p className="text-xs text-zinc-500">
                      Total
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-1 text-lg font-semibold text-teal-300">
                      <CheckCircle2 size={14} />
                      {report.passed_cases}
                    </p>

                    <p className="text-xs text-zinc-500">
                      Passed
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-1 text-lg font-semibold text-rose-300">
                      <XCircle size={14} />
                      {report.failed_cases}
                    </p>

                    <p className="text-xs text-zinc-500">
                      Failed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}