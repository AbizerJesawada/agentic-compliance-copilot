"use client";

import { useEffect, useMemo, useState } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessages from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import DetailsPanel from "@/components/DetailsPanel";
import { API_BASE_URL } from "@/lib/api";

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
  title: string;
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
          `${control.control_name.replaceAll("_", " ")}: ${control.recommendation}`
      )
      .join("\n\n");
  }

  return "The assistant completed the requested workflow.";
}

export default function Home() {
  const [sessionId, setSessionId] = useState("");
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
        `${API_BASE_URL}/documents/assistant/sessions`
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
          : "Could not load conversation history."
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
      (message) => message.role === "assistant" && message.response
    );

    return assistantMessages.at(-1)?.response;
  }, [messages]);

  async function openConversation(
    sessionToOpen: ConversationSession
  ) {
    setOpeningSessionId(sessionToOpen.session_id);
    setHistoryError("");
    setFeedbackStatus("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/assistant/sessions/${sessionToOpen.session_id}`
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
        }))
      );
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Could not open this conversation."
      );
    } finally {
      setOpeningSessionId("");
    }
  }

  function startNewChat() {
    setSessionId(createSessionId());
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

  async function submitMessage(query: string) {
    setFeedbackStatus("");
    setIsLoading(true);

    setMessages((previous) => [
      ...previous,
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
        }
      );

      if (!response.ok) {
        throw new Error(
          "The backend could not complete this request."
        );
      }

      const data: AssistantResponse = await response.json();

      setMessages((previous) => [
        ...previous,
        {
          id: createSessionId(),
          role: "assistant",
          content: getAssistantContent(data),
          response: data,
        },
      ]);

      void loadConversationSessions();
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: createSessionId(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong.",
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
        }
      );

      if (!response.ok) {
        throw new Error("Feedback could not be saved.");
      }

      setFeedbackStatus(
        helpful ? "Marked as helpful." : "Marked for review."
      );
    } catch {
      setFeedbackStatus("Feedback could not be saved.");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="grid min-h-screen lg:grid-cols-[250px_minmax(0,1fr)_300px]">
        <ChatSidebar
          sessions={conversationSessions}
          sessionId={sessionId}
          openingSessionId={openingSessionId}
          isLoading={isHistoryLoading}
          error={historyError}
          onSelectSession={openConversation}
          onNewChat={startNewChat}
        />

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

          <ChatMessages
            messages={messages}
            isLoading={isLoading}
          />

          <ChatInput
            sessionId={sessionId}
            isLoading={isLoading}
            onSubmit={submitMessage}
          />
        </section>

        <DetailsPanel
          response={activeResponse}
          feedbackStatus={feedbackStatus}
          onFeedback={submitFeedback}
        />
      </div>
    </main>
  );
}
