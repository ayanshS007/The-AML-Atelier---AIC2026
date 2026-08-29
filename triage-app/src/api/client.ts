/**
 * API client — thin fetch wrapper for the FastAPI backend.
 * All calls go through the Vite proxy (/api → localhost:8000).
 */

const BASE = '/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Patients ───────────────────────────────────────────────────────────
export const api = {
  /** List patients, optionally filtered by pipeline stage. */
  listPatients: (stage?: string) =>
    request<any[]>(stage ? `/patients?stage=${stage}` : '/patients'),

  /** Get a single patient's full chart. */
  getPatient: (caseId: string) =>
    request<any>(`/patients/${caseId}`),

  /** Create a patient from intake (scores + broadcasts). */
  createPatient: (payload: any) =>
    request<any>('/patients', { method: 'POST', body: JSON.stringify(payload) }),

  /** Get current ML recommendation for a patient. */
  getDecision: (caseId: string) =>
    request<any>(`/patients/${caseId}/decision`),

  /** Submit the nurse's ESI decision (may override ML). */
  submitTriage: (caseId: string, assignedESI: number, overrideReason = '') =>
    request<any>(`/patients/${caseId}/triage`, {
      method: 'POST',
      body: JSON.stringify({ assignedESI, overrideReason }),
    }),

  // ─── Staff ──────────────────────────────────────────────────────────
  listStaff: () => request<any[]>('/staff'),

  updateStaff: (staffId: string, payload: { patientId?: string | null; status?: string }) =>
    request<any>(`/staff/${staffId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // ─── Audit ──────────────────────────────────────────────────────────
  listAudit: () => request<any[]>('/audit'),
  auditStats: () => request<any>('/audit/stats'),

  // ─── System ─────────────────────────────────────────────────────────
  systemStatus: () => request<any>('/system/status'),
  toggleSurge: () => request<any>('/system/surge', { method: 'POST' }),
  rescoreAll: () => request<any>('/system/rescore', { method: 'POST' }),
};
