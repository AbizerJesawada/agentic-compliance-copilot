import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentic Compliance Copilot",
  description:
    "Enterprise compliance assistant for grounded document questions, risk analysis, and control discovery.",
};

function NavBar() {
  return (
    <nav className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <Link href="/" className="flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-md bg-teal-400 text-sm font-bold text-zinc-950">
          CC
        </div>

        <span className="text-sm font-semibold">
          Compliance Copilot
        </span>
      </Link>

      <div className="flex items-center gap-1">
        <Link
          href="/"
          className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
        >
          Chat
        </Link>

        <Link
          href="/upload"
          className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
        >
          Upload
        </Link>

        <Link
          href="/controls"
          className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
        >
          Controls
        </Link>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full bg-zinc-950 font-sans text-zinc-100 antialiased">
        <NavBar />
        {children}
      </body>
    </html>
  );
}