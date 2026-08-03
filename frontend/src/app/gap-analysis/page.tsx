"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  SearchCheck,
  XCircle,
} from "lucide-react";
import { runGapAnalysis } from "@/lib/api";
import { ToastContainer, useToasts } from "@/components/Toast";

type GapResult = {
  requirement: string;
  status: string;
  evidence: string;
  recommendation: string;
};

type GapAnalysisResponse = {
  total_requirements: number;
  present_count: number;
  missing_count: number;
  results: GapResult[];
};

export default function GapAnalysisPage() {
  const [contractText, setContractText] = useState("");
  const [checklist, setChecklist] = useState("");
  const [result, setResult] = useState<GapAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const { toasts, pushToast, dismissToast } = useToasts();

  async function handleAnalyze() {
    if (!contractText.trim() || !checklist.trim()) {
      pushToast("Provide both contract text and a checklist.", "error");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    try {
      const data = await runGapAnalysis(contractText, checklist);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gap analysis failed."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ClipboardList size={22} className="text-teal-300" /> Contract Gap Analysis
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Compare a contract against a compliance checklist to find missing clauses.
        </p>
      </div>

      <div className="mt-6 space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Contract text
          </label>
          <textarea
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            rows={8}
            placeholder="Paste the contract text here..."
            className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-100 outline-none transition focus:border-teal-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Compliance checklist (one requirement per line)
          </label>
          <textarea
            value={checklist}
            onChange={(e) => setChecklist(e.target.value)}
            rows={6}
            placeholder={"Data retention policy\nIncident response plan\nThird-party vendor due diligence"}
            className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-100 outline-none transition focus:border-teal-500"
          />
        </div>

        <button
          type="button"
          disabled={isAnalyzing}
          onClick={() => void handleAnalyze()}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-400 text-sm font-semibold text-zinc-950 transition hover:bg-teal-300 disabled:opacity-60"
        >
          {isAnalyzing ? (
            <>
              <LoaderCircle size={16} className="animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <SearchCheck size={16} /> Run gap analysis
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-md border border-rose-800 bg-rose-950/50 p-4 text-sm text-rose-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
              {result.total_requirements} requirements
            </span>
            <span className="flex items-center gap-1 rounded bg-teal-950 px-2 py-1 text-xs text-teal-300">
              <CheckCircle2 size={12} /> {result.present_count} present
            </span>
            <span className="flex items-center gap-1 rounded bg-rose-950 px-2 py-1 text-xs text-rose-300">
              <XCircle size={12} /> {result.missing_count} missing
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {result.results.map((item, index) => (
              <div
                key={index}
                className="rounded-md border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-medium text-zinc-200">
                    {item.requirement}
                  </h3>
                  {item.status === "present" ? (
                    <span className="flex shrink-0 items-center gap-1 rounded bg-teal-950 px-2 py-0.5 text-xs text-teal-300">
                      <CheckCircle2 size={12} /> Present
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 rounded bg-rose-950 px-2 py-0.5 text-xs text-rose-300">
                      <XCircle size={12} /> Missing
                    </span>
                  )}
                </div>

                {item.evidence && (
                  <p className="mt-2 rounded bg-zinc-950 p-2 text-xs leading-relaxed text-zinc-500">
                    Evidence: {item.evidence}
                  </p>
                )}

                {item.recommendation && (
                  <p className="mt-2 text-xs leading-relaxed text-amber-300">
                    Recommendation: {item.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
