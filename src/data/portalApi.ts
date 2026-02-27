import { publicAnonKey } from '/utils/supabase/info';
import { BASE, authHeaders } from './apiHeaders';

// ── Internal (workspace owner) — uses auth token ───────────────────

export async function generatePortalToken(clientId: string): Promise<any> {
  const res = await fetch(`${BASE}/portal/generate`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ clientId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate portal token');
  }
  const { data } = await res.json();
  return data;
}

export async function togglePortal(clientId: string, active: boolean): Promise<any> {
  const res = await fetch(`${BASE}/portal/toggle`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ clientId, active }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to toggle portal');
  }
  const { data } = await res.json();
  return data;
}

export async function getPortalConfig(clientId: string): Promise<any | null> {
  const res = await fetch(`${BASE}/portal/config/${clientId}`, { headers: await authHeaders() });
  if (!res.ok) return null;
  const { data } = await res.json();
  return data;
}

// ── Public (client-facing, no auth needed) ─────────────────────────

export async function loadPortalData(token: string): Promise<any> {
  const res = await fetch(`${BASE}/portal/view/${token}`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'apikey': publicAnonKey,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Portal not found');
  }
  const { data } = await res.json();
  return data;
}
