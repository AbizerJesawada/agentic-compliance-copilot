import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Agentic Compliance Copilot",
  description:
    "Enterprise compliance assistant for grounded document questions, risk analysis, and control discovery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-zinc-950 font-sans text-zinc-100 antialiased">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
