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
