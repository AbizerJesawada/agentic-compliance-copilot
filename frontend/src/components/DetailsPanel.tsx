"use client";

import { FileText, ThumbsDown, ThumbsUp, CheckCircle2 } from "lucide-react";

type Source = {
  chunk_id: string;
  source_path: string;
  chunk_index: number;
  distance: number;
};

type AssistantResult = {
  answer?: string;
  confidence?: string;
  sources?: Source[];
  risk_level?: string;
  risk_score?: number;
  risk_summary?: string;
  additional_controls?: Array<{
    control_name: string;
    recommendation: string;
  }>;
};

type AssistantResponse = {
  query: string;
  selected_workflow: string;
  routing_reason: string;
  result: AssistantResult;
};

type DetailsPanelProps = {
  response: AssistantResponse | undefined;
  feedbackStatus: string;
  onFeedback: (helpful: boolean) => void;
};

function formatWorkflow(workflow: string) {
  return workflow.replaceAll("_", " ");
}

export default function DetailsPanel({ response, feedbackStatus, onFeedback }: DetailsPanelProps) {
  const sources = response?.result.sources ?? [];

  return (
    <aside className="border-t border-zinc-800 bg-zinc-900 lg:border-t-0 lg:border-l">
      <div className="p-5">
        <h2 className="text-sm font-semibold">Answer details</h2>

        {!response ? (
          <p className="mt-4 text-sm leading-6 text-zinc-500">
            Send a question to view workflow decisions, sources, and feedback controls.
          </p>
        ) : (
          <div className="mt-5 space-y-6">
            <section>
              <p className="text-xs font-medium text-zinc-500">SELECTED WORKFLOW</p>
              <p className="mt-2 text-sm font-medium capitalize text-teal-300">
                {formatWorkflow(response.selected_workflow)}
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                {response.routing_reason}
              </p>
            </section>

            {response.result.risk_level && (
              <section>
                <p className="text-xs font-medium text-zinc-500">RISK RESULT</p>
                <p className="mt-2 text-sm font-medium capitalize text-amber-300">
                  {response.result.risk_level} risk
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Score: {response.result.risk_score ?? "N/A"}
                </p>
              </section>
            )}

            <section>
              <p className="text-xs font-medium text-zinc-500">SOURCES</p>
              {sources.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">No document sources returned.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {sources.slice(0, 3).map((source) => (
                    <div key={source.chunk_id} className="flex gap-2 text-xs text-zinc-400">
                      <FileText className="mt-0.5 shrink-0 text-teal-300" size={15} />
                      <div className="min-w-0">
                        <p className="truncate text-zinc-300">
                          {source.source_path.split("\\").at(-1)}
                        </p>
                        <p className="mt-1">Chunk {source.chunk_index + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="border-t border-zinc-800 pt-5">
              <p className="text-xs font-medium text-zinc-500">WAS THIS ANSWER HELPFUL?</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => onFeedback(true)}
                  className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 transition hover:border-teal-400 hover:text-teal-300"
                >
                  <ThumbsUp size={15} /> Yes
                </button>
                <button
                  type="button"
                  onClick={() => onFeedback(false)}
                  className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 transition hover:border-rose-400 hover:text-rose-300"
                >
                  <ThumbsDown size={15} /> No
                </button>
              </div>
              {feedbackStatus && (
                <p className="mt-3 flex items-center gap-2 text-xs text-teal-300">
                  <CheckCircle2 size={14} /> {feedbackStatus}
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}
