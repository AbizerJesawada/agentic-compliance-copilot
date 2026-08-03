"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  LoaderCircle,
  RefreshCw,
  GitBranch,
  User,
  Clock,
} from "lucide-react";
import { getAuditLog } from "@/lib/api";

type AuditEntry = {
  id: string;
  timestamp: string;
  action: string;
  username: string;
  details: Record<string, unknown>;
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEntries() {
    setIsLoading(true);
    setError("");
    try {
      const data = await getAuditLog(200);
      setEntries(data.entries);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load audit log."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadEntries();
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Chronological record of user actions across the workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadEntries()}
          className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {isLoading && (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-zinc-400">
          <LoaderCircle className="animate-spin" size={18} /> Loading audit log...
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-md border border-rose-800 bg-rose-950/50 p-4 text-sm text-rose-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && entries.length === 0 && (
        <p className="mt-10 text-center text-sm text-zinc-500">
          No audit entries recorded yet.
        </p>
      )}

      {!isLoading && entries.length > 0 && (
        <div className="mt-6 space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-md border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-zinc-800 text-zinc-400">
                <GitBranch size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="rounded bg-teal-950 px-2 py-0.5 text-xs text-teal-300">
                    {entry.action}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <User size={12} /> {entry.username}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock size={12} />
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                {entry.details && Object.keys(entry.details).length > 0 && (
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-zinc-950 p-2 font-mono text-xs text-zinc-500">
                    {JSON.stringify(entry.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
