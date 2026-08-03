"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, Lock, ShieldCheck } from "lucide-react";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login(username.trim(), password);
      localStorage.setItem("cc_token", result.token);
      localStorage.setItem(
        "cc_user",
        JSON.stringify(result.user)
      );
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-teal-400 text-zinc-950">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Sign in</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Access your compliance workspace.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6"
        >
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-xs font-medium text-zinc-400"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-teal-500"
              placeholder="admin"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-zinc-400"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-teal-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-400 text-sm font-semibold text-zinc-950 transition hover:bg-teal-300 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <LoaderCircle size={16} className="animate-spin" /> Signing in...
              </>
            ) : (
              <>
                <Lock size={15} /> Sign in
              </>
            )}
          </button>

          <p className="text-center text-xs text-zinc-500">
            Demo accounts: admin / admin123 · reviewer / review123 ·
            analyst / analyst123
          </p>
        </form>
      </div>
    </main>
  );
}
