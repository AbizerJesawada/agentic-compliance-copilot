"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownToLine,
  FileText,
  FolderCheck,
  GitBranch,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { exportRiskReportUrl, getDashboardStats } from "@/lib/api";

type Stats = {
  document_count: number;
  indexed_document_count: number;
  total_character_count: number;
  control_count: number;
  pending_control_count: number;
  approved_control_count: number;
  rejected_control_count: number;
  audit_entry_count: number;
  evaluation_report_count: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStats() {
    setIsLoading(true);
    setError("");
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  const cards = [
    {
      label: "Documents",
      value: stats?.document_count ?? 0,
      icon: FileText,
      color: "text-teal-300",
      bg: "bg-teal-950/50",
      href: "/documents",
    },
    {
      label: "Indexed Docs",
      value: stats?.indexed_document_count ?? 0,
      icon: FolderCheck,
      color: "text-emerald-300",
      bg: "bg-emerald-950/50",
      href: "/documents",
    },
    {
      label: "Controls",
      value: stats?.control_count ?? 0,
      icon: ShieldCheck,
      color: "text-amber-300",
      bg: "bg-amber-950/50",
      href: "/controls",
    },
    {
      label: "Pending Reviews",
      value: stats?.pending_control_count ?? 0,
      icon: AlertCircle,
      color: "text-rose-300",
      bg: "bg-rose-950/50",
      href: "/controls",
    },
    {
      label: "Evaluation Runs",
      value: stats?.evaluation_report_count ?? 0,
      icon: TrendingUp,
      color: "text-blue-300",
      bg: "bg-blue-950/50",
      href: "/evaluation",
    },
    {
      label: "Audit Entries",
      value: stats?.audit_entry_count ?? 0,
      icon: GitBranch,
      color: "text-violet-300",
      bg: "bg-violet-950/50",
      href: "/audit",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Overview of your compliance workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={exportRiskReportUrl("csv")}
            className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            <ArrowDownToLine size={15} /> Risk Report CSV
          </a>
          <a
            href={exportRiskReportUrl("pdf")}
            className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            <ArrowDownToLine size={15} /> Risk Report PDF
          </a>
          <button
            type="button"
            onClick={() => void loadStats()}
            className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-zinc-400">
          <LoaderCircle className="animate-spin" size={18} /> Loading dashboard...
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-md border border-rose-800 bg-rose-950/50 p-4 text-sm text-rose-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!isLoading && stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-700"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">{card.label}</p>
                  <div
                    className={`grid size-9 place-items-center rounded-md ${card.bg} ${card.color}`}
                  >
                    <card.icon size={18} />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold">
                  {card.value.toLocaleString()}
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-zinc-300">
                Document Content
              </h2>
              <p className="mt-3 text-2xl font-bold text-teal-300">
                {(stats.total_character_count / 1000).toFixed(1)}
                <span className="ml-1 text-sm font-normal text-zinc-400">
                  K characters indexed
                </span>
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-zinc-300">
                Control Review Status
              </h2>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="bg-teal-400"
                  style={{
                    width: `${
                      stats.control_count
                        ? (stats.approved_control_count / stats.control_count) * 100
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="bg-rose-400"
                  style={{
                    width: `${
                      stats.control_count
                        ? (stats.rejected_control_count / stats.control_count) * 100
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="bg-zinc-500"
                  style={{
                    width: `${
                      stats.control_count
                        ? (stats.pending_control_count / stats.control_count) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-teal-400" />
                  {stats.approved_control_count} approved
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-rose-400" />
                  {stats.rejected_control_count} rejected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-zinc-500" />
                  {stats.pending_control_count} pending
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
