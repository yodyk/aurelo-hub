// ── Link helpers shared by editor + renderer ────────────────────────
const SAFE_PROTOCOL = /^(https?:|mailto:|tel:)/i;
const UNSAFE_PROTOCOL = /^(javascript|data|vbscript|file):/i;

/**
 * Normalize a user-entered link. Returns null when the value is empty or
 * uses an unsafe scheme. Bare domains and emails are upgraded sensibly.
 */
export function normalizeUrl(raw: string): string | null {
  const value = (raw || '').trim();
  if (!value) return null;
  if (UNSAFE_PROTOCOL.test(value)) return null;
  if (SAFE_PROTOCOL.test(value)) return value;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  if (/^\/\//.test(value)) return `https:${value}`;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$|\?|#)/i.test(value)) return `https://${value}`;
  return null;
}

export function isSafeUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return SAFE_PROTOCOL.test(raw.trim()) && !UNSAFE_PROTOCOL.test(raw.trim());
}
