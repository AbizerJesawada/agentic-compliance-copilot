"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";

type ChatInputProps = {
  sessionId: string;
  isLoading: boolean;
  onSubmit: (query: string) => void;
};

export default function ChatInput({ sessionId, isLoading, onSubmit }: ChatInputProps) {
  const [input, setInput] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.trim();
    if (!query || isLoading || !sessionId) return;
    onSubmit(query);
    setInput("");
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-zinc-800 bg-zinc-950 p-4 sm:px-8">
      <div className="mx-auto flex w-full max-w-3xl gap-3">
        <label className="sr-only" htmlFor="assistant-query">
          Compliance question
        </label>
        <input
          id="assistant-query"
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
  );
}
