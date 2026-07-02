export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-cyan-400">
          Agentic AI Compliance Platform
        </p>

        <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
          Agentic Enterprise Compliance Copilot
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          Upload company policies, contracts, SOPs, and audit documents. Ask
          compliance questions, detect risks, retrieve cited evidence, and
          generate audit-ready reports using RAG, LangGraph, LangChain,
          LlamaIndex, and MCP.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Upload Documents</h2>
            <p className="mt-3 text-sm text-slate-400">
              Add PDFs, DOCX files, policies, vendor contracts, and audit
              reports for indexing.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Ask Questions</h2>
            <p className="mt-3 text-sm text-slate-400">
              Ask compliance, legal, policy, and contract questions with
              source-backed answers.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Generate Reports</h2>
            <p className="mt-3 text-sm text-slate-400">
              Create risk summaries, missing clause reports, and audit-ready
              action plans.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}