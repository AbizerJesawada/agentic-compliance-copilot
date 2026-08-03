"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut } from "lucide-react";

type StoredUser = {
  username: string;
  role: string;
} | null;

export function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("cc_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        return;
      } catch {
        localStorage.removeItem("cc_user");
      }
    }
    setUser(null);
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    setUser(null);
    router.push("/login");
  }

  const navLinks = [
    { href: "/", label: "Chat" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/upload", label: "Upload" },
    { href: "/documents", label: "Documents" },
    { href: "/compare", label: "Compare" },
    { href: "/gap-analysis", label: "Gap Analysis" },
    { href: "/controls", label: "Controls" },
    { href: "/evaluation", label: "Evaluation" },
    { href: "/audit", label: "Audit" },
  ];

  return (
    <nav className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-md bg-teal-400 text-sm font-bold text-zinc-950">
            CC
          </div>

          <span className="text-sm font-semibold">
            Compliance Copilot
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800"
            >
              <LayoutDashboard size={14} />
              {user.username}
              <span className="rounded bg-teal-950 px-1.5 py-0.5 text-[10px] uppercase text-teal-300">
                {user.role}
              </span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-rose-300"
            >
              <LogOut size={14} /> Sign out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
