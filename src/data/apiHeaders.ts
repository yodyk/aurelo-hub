// ── API headers stub ────────────────────────────────────────────────
// Will be replaced with real backend URL when Cloud is enabled.

export const BASE = '/api';

export async function authHeaders(json = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}
