"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  FileText,
  LoaderCircle,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";

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

type ConversationSession = {
  session_id: string;
  title:string;
  message_count: number;
  last_message: string;
  updated_at: string;
};

type StoredConversationMessage = {
  role: "user" | "assistant";
  content: string;
  created_at: string;
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

function createSessionId() {
  return globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`;
}

function getAssistantContent(response: AssistantResponse) {
  const { result } = response;

  if (result.answer) {
    return result.answer;
  }

  if (result.risk_summary) {
    return result.risk_summary;
  }

  if (result.additional_controls) {
    if (result.additional_controls.length === 0) {
      return "No additional compliance controls were discovered.";
    }

    return result.additional_controls
      .map(
        (control) =>
          `${control.control_name.replaceAll("_", " ")}: ${
            control.recommendation
          }`,
      )
      .join("\n\n");
  }

  return "The assistant completed the requested workflow.";
}

function formatWorkflow(workflow: string) {
  return workflow.replaceAll("_", " ");
}

export default function Home() {
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState("");

  const [conversationSessions, setConversationSessions] = useState<
    ConversationSession[]
  >([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [openingSessionId, setOpeningSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask a compliance question, request a risk analysis, or identify missing controls.",
    },
  ]);

  useEffect(() => {
    setSessionId(createSessionId());
  }, []);

  async function loadConversationSessions() {
    setIsHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/assistant/sessions`,
      );

      if (!response.ok) {
        throw new Error("Could not load conversation history.");
      }

      const data: { sessions: ConversationSession[] } =
        await response.json();

      setConversationSessions(data.sessions);
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Could not load conversation history.",
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }

  useEffect(() => {
    void loadConversationSessions();
  }, []);

  const activeResponse = useMemo(() => {
    const assistantMessages = messages.filter(
      (message) => message.role === "assistant" && message.response,
    );

    return assistantMessages.at(-1)?.response;
  }, [messages]);

  async function openConversation(sessionToOpen: ConversationSession) {
    setOpeningSessionId(sessionToOpen.session_id);
    setHistoryError("");
    setFeedbackStatus("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/assistant/sessions/${sessionToOpen.session_id}`,
      );

      if (!response.ok) {
        throw new Error("Could not open this conversation.");
      }

      const data: {
        session_id: string;
        messages: StoredConversationMessage[];
      } = await response.json();

      setSessionId(data.session_id);

      setMessages(
        data.messages.map((message) => ({
          id: `${data.session_id}-${message.created_at}`,
          role: message.role,
          content: message.content,
        })),
      );
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Could not open this conversation.",
      );
    } finally {
      setOpeningSessionId("");
    }
  }

  function startNewChat() {
    setSessionId(createSessionId());
    setInput("");
    setFeedbackStatus("");
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "New conversation started. What would you like to review?",
      },
    ]);
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = input.trim();

    if (!query || isLoading || !sessionId) {
      return;
    }

    setFeedbackStatus("");
    setInput("");
    setIsLoading(true);

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createSessionId(),
        role: "user",
        content: query,
      },
    ]);

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/assistant/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            top_k: 3,
            session_id: sessionId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("The backend could not complete this request.");
      }

      const data: AssistantResponse = await response.json();

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createSessionId(),
          role: "assistant",
          content: getAssistantContent(data),
          response: data,
        },
      ]);

      void loadConversationSessions();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while contacting the backend.";

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createSessionId(),
          role: "assistant",
          content: message,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function submitFeedback(helpful: boolean) {
    if (!activeResponse) {
      return;
    }

    setFeedbackStatus("Saving feedback...");

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/assistant/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
            query: activeResponse.query,
            helpful,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Feedback could not be saved.");
      }

      setFeedbackStatus(
        helpful
          ? "Marked as helpful."
          : "Marked for review.",
      );
    } catch {
      setFeedbackStatus("Feedback could not be saved.");
    }
  }

  const sources = activeResponse?.result.sources ?? [];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="grid min-h-screen lg:grid-cols-[250px_minmax(0,1fr)_300px]">
        <aside className="border-b border-zinc-800 bg-zinc-900 lg:border-r lg:border-b-0">
          <div className="flex h-full flex-col p-4">
            <div className="flex items-center gap-3 px-2 py-3">
              <div className="grid size-9 place-items-center rounded-md bg-teal-400 text-zinc-950">
                <ShieldCheck size={21} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Compliance Copilot
                </p>
                <p className="text-xs text-zinc-400">
                  Document intelligence
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={startNewChat}
              className="mt-5 flex h-10 items-center justify-center gap-2 rounded-md bg-teal-400 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-teal-300"
            >
              <Plus size={17} />
              New conversation
            </button>

            <section className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
              <p className="mb-3 px-2 text-xs font-semibold text-zinc-500">
                PREVIOUS CONVERSATIONS
              </p>

              {isHistoryLoading && (
                <p className="px-2 text-sm text-zinc-500">
                  Loading history...
                </p>
              )}

              {historyError && (
                <p className="px-2 text-sm text-rose-400">
                  {historyError}
                </p>
              )}

              {!isHistoryLoading &&
                !historyError &&
                conversationSessions.length === 0 && (
                  <p className="px-2 text-sm text-zinc-500">
                    No saved conversations yet.
                  </p>
                )}

              <div className="space-y-2">
                {conversationSessions.map((conversation) => {
                  const isActiveSession =
                    conversation.session_id === sessionId;

                  const isOpening =
                    conversation.session_id === openingSessionId;

                  return (
                    <button
                      key={conversation.session_id}
                      type="button"
                      onClick={() => void openConversation(conversation)}
                      disabled={Boolean(openingSessionId)}
                      title="Open saved conversation"
                      className={`w-full border-l-2 px-3 py-2 text-left transition ${
                        isActiveSession
                          ? "border-teal-400 bg-zinc-800"
                          : "border-zinc-800 hover:border-teal-400 hover:bg-zinc-800"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {conversation.title}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {isOpening
                          ? "Opening conversation..."
                          : `${conversation.message_count} messages`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="mt-auto border-t border-zinc-800 px-2 pt-4">
              <p className="text-xs leading-5 text-zinc-500">
                Answers are grounded in indexed compliance documents.
              </p>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="flex min-h-16 items-center justify-between border-b border-zinc-800 px-5">
            <div>
              <h1 className="text-base font-semibold">
                Compliance review workspace
              </h1>
              <p className="mt-1 text-xs text-zinc-500">
                Grounded answers, risk analysis, and control discovery
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-teal-300">
              <span className="size-2 rounded-full bg-teal-400" />
              Backend connected
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
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
                    <p className="whitespace-pre-wrap">
                      {message.content}
                    </p>

                    {message.response && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
                        <span className="rounded-sm bg-zinc-800 px-2 py-1 text-xs capitalize text-teal-300">
                          {formatWorkflow(
                            message.response.selected_workflow,
                          )}
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
                  <LoaderCircle
                    className="animate-spin text-teal-300"
                    size={18}
                  />
                  Reviewing indexed documents...
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={submitMessage}
            className="border-t border-zinc-800 bg-zinc-950 p-4 sm:px-8"
          >
            <div className="mx-auto flex w-full max-w-3xl gap-3">
              <label className="sr-only" htmlFor="assistant-query">
                Compliance question
              </label>
              <input
                id="assistant-query"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about a vendor, policy, risk, or control..."
                className="h-11 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-teal-400"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !sessionId}
                className="grid size-11 shrink-0 place-items-center rounded-md bg-teal-400 text-zinc-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
                title="Send question"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </section>

        <aside className="border-t border-zinc-800 bg-zinc-900 lg:border-t-0 lg:border-l">
          <div className="p-5">
            <h2 className="text-sm font-semibold">Answer details</h2>

            {!activeResponse ? (
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                Send a question to view workflow decisions, sources, and
                feedback controls.
              </p>
            ) : (
              <div className="mt-5 space-y-6">
                <section>
                  <p className="text-xs font-medium text-zinc-500">
                    SELECTED WORKFLOW
                  </p>
                  <p className="mt-2 text-sm font-medium capitalize text-teal-300">
                    {formatWorkflow(activeResponse.selected_workflow)}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">
                    {activeResponse.routing_reason}
                  </p>
                </section>

                {activeResponse.result.risk_level && (
                  <section>
                    <p className="text-xs font-medium text-zinc-500">
                      RISK RESULT
                    </p>
                    <p className="mt-2 text-sm font-medium capitalize text-amber-300">
                      {activeResponse.result.risk_level} risk
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Score: {activeResponse.result.risk_score ?? "N/A"}
                    </p>
                  </section>
                )}

                <section>
                  <p className="text-xs font-medium text-zinc-500">
                    SOURCES
                  </p>
                  {sources.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      No document sources returned.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {sources.slice(0, 3).map((source) => (
                        <div
                          key={source.chunk_id}
                          className="flex gap-2 text-xs text-zinc-400"
                        >
                          <FileText
                            className="mt-0.5 shrink-0 text-teal-300"
                            size={15}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-zinc-300">
                              {source.source_path.split("\\").at(-1)}
                            </p>
                            <p className="mt-1">
                              Chunk {source.chunk_index + 1}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="border-t border-zinc-800 pt-5">
                  <p className="text-xs font-medium text-zinc-500">
                    WAS THIS ANSWER HELPFUL?
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => submitFeedback(true)}
                      className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 transition hover:border-teal-400 hover:text-teal-300"
                    >
                      <ThumbsUp size={15} />
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => submitFeedback(false)}
                      className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 transition hover:border-rose-400 hover:text-rose-300"
                    >
                      <ThumbsDown size={15} />
                      No
                    </button>
                  </div>
                  {feedbackStatus && (
                    <p className="mt-3 flex items-center gap-2 text-xs text-teal-300">
                      <CheckCircle2 size={14} />
                      {feedbackStatus}
                    </p>
                  )}
                </section>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}