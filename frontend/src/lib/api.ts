const API_BASE_URL = "http://127.0.0.1:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error((detail as any).detail || `Request to ${path} failed.`);
  }
  return response.json();
}

export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error((detail as any).detail || "Upload failed.");
  }
  return response.json();
}

export async function assistantQuery(query: string, sessionId?: string) {
  return request<any>("/documents/assistant/query", {
    method: "POST",
    body: JSON.stringify({ query, top_k: 3, session_id: sessionId }),
  });
}

export async function submitFeedback(sessionId: string, query: string, helpful: boolean) {
  return request<any>("/documents/assistant/feedback", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, query, helpful }),
  });
}

export async function getConversationSessions() {
  return request<{ sessions: any[] }>("/documents/assistant/sessions");
}

export async function getConversationMessages(sessionId: string) {
  return request<{ session_id: string; messages: any[] }>(
    `/documents/assistant/sessions/${sessionId}`
  );
}

export async function getPendingControls(status?: string) {
  const query = status ? `?status=${status}` : "";
  return request<{ controls: any[] }>(`/documents/controls/review${query}`);
}

export async function reviewControl(controlId: string, decision: string) {
  return request<any>("/documents/controls/review", {
    method: "POST",
    body: JSON.stringify({ control_id: controlId, decision, reviewer: "frontend-user" }),
  });
}

export async function getEvaluationReports() {
  return request<{ reports: any[] }>("/documents/evaluation-reports");
}

export async function login(username: string, password: string) {
  return request<{ token: string; user: { username: string; role: string } }>(
    "/documents/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }
  );
}

export async function getDashboardStats() {
  return request<{
    document_count: number;
    indexed_document_count: number;
    total_character_count: number;
    control_count: number;
    pending_control_count: number;
    approved_control_count: number;
    rejected_control_count: number;
    audit_entry_count: number;
    evaluation_report_count: number;
  }>("/documents/stats/dashboard");
}

export async function getDocumentContent(documentId: string, previewChars = 0) {
  const suffix = previewChars ? `?preview_chars=${previewChars}` : "";
  return request<{ content: string; original_filename: string }>(
    `/documents/${documentId}/content${suffix}`
  );
}

export async function getAuditLog(limit = 100) {
  return request<{ entries: any[] }>(`/documents/audit-log?limit=${limit}`);
}

export async function compareDocuments(documentAId: string, documentBId: string) {
  return request<{ conflicts: any[]; document_a: string; document_b: string }>(
    "/documents/compare",
    {
      method: "POST",
      body: JSON.stringify({ document_a_id: documentAId, document_b_id: documentBId }),
    }
  );
}

export async function runGapAnalysis(contractText: string, checklist: string) {
  return request<{
    total_requirements: number;
    present_count: number;
    missing_count: number;
    results: any[];
  }>("/documents/gap-analysis", {
    method: "POST",
    body: JSON.stringify({ contract_text: contractText, checklist }),
  });
}

export function exportControlsUrl(status?: string) {
  const query = status ? `?status=${status}` : "";
  return `${API_BASE_URL}/documents/export/controls${query}`;
}

export function exportRiskReportUrl(format: "csv" | "pdf") {
  return `${API_BASE_URL}/documents/export/risk-report?format=${format}`;
}
