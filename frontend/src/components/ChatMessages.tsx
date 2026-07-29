import { Bot, LoaderCircle, User } from "lucide-react";

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
  session_id: string | null;
  selected_workflow: string;
  routing_reason: string;
  result: AssistantResult;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AssistantResponse;
};

type ChatMessagesProps = {
  messages: ChatMessage[];
  isLoading: boolean;
};

function formatWorkflow(workflow: string) {
  return workflow.replaceAll("_", " ");
}

export default function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <div className="grid size-8 shrink-0 place-items-center rounded-md bg-teal-400 text-zinc-950">
                <Bot size={18} />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-md px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                  ? "bg-zinc-800 text-zinc-100"
                  : "border border-zinc-800 bg-zinc-900 text-zinc-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>

              {message.response && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
                  <span className="rounded-sm bg-zinc-800 px-2 py-1 text-xs capitalize text-teal-300">
                    {formatWorkflow(message.response.selected_workflow)}
                  </span>
                  {message.response.result.confidence && (
                    <span className="rounded-sm bg-zinc-800 px-2 py-1 text-xs capitalize text-zinc-400">
                      {message.response.result.confidence} confidence
                    </span>
                  )}
                </div>
              )}
            </div>

            {message.role === "user" && (
              <div className="grid size-8 shrink-0 place-items-center rounded-md bg-zinc-700 text-zinc-200">
                <User size={17} />
              </div>
            )}
          </article>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <LoaderCircle className="animate-spin text-teal-300" size={18} />
            Reviewing indexed documents...
          </div>
        )}
      </div>
    </div>
  );
}
