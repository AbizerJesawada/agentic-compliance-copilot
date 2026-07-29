import { Plus, ShieldCheck } from "lucide-react";

type ConversationSession = {
  session_id: string;
  title: string;
  message_count: number;
  last_message: string;
  updated_at: string;
};

type ChatSidebarProps = {
  sessions: ConversationSession[];
  sessionId: string;
  openingSessionId: string;
  isLoading: boolean;
  error: string;
  onSelectSession: (session: ConversationSession) => void;
  onNewChat: () => void;
};

export default function ChatSidebar({
  sessions,
  sessionId,
  openingSessionId,
  isLoading,
  error,
  onSelectSession,
  onNewChat,
}: ChatSidebarProps) {
  return (
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
          onClick={onNewChat}
          className="mt-5 flex h-10 items-center justify-center gap-2 rounded-md bg-teal-400 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-teal-300"
        >
          <Plus size={17} />
          New conversation
        </button>

        <section className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
          <p className="mb-3 px-2 text-xs font-semibold text-zinc-500">
            PREVIOUS CONVERSATIONS
          </p>

          {isLoading && (
            <p className="px-2 text-sm text-zinc-500">
              Loading history...
            </p>
          )}

          {error && (
            <p className="px-2 text-sm text-rose-400">
              {error}
            </p>
          )}

          {!isLoading && !error && sessions.length === 0 && (
            <p className="px-2 text-sm text-zinc-500">
              No saved conversations yet.
            </p>
          )}

          <div className="space-y-2">
            {sessions.map((conversation) => {
              const isActive = conversation.session_id === sessionId;
              const isOpening =
                conversation.session_id === openingSessionId;

              return (
                <button
                  key={conversation.session_id}
                  type="button"
                  onClick={() => onSelectSession(conversation)}
                  disabled={Boolean(openingSessionId)}
                  title="Open saved conversation"
                  className={`w-full border-l-2 px-3 py-2 text-left transition ${
                    isActive
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
  );
}