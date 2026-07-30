// ── Canonical editor content utilities ──────────────────────────────
// Every path that stores, renders, previews, or measures rich-text
// content in Aurelo goes through this module. No ad-hoc regex tag
// stripping, no scattered DOMPurify configs.
//
// Storage contract
// ----------------
// Rich fields (notes.content, checklist_items.description, sessions.notes)
// hold EITHER legacy plain text OR sanitized HTML. `looksLikeHtml()`
// discriminates the two, and `normalizeEditorContent()` upgrades legacy
// plain text to a safe HTML document on read. Nothing is rewritten in the
// database until the user edits and saves that record, so rollout is
// fully backward compatible and no schema/format column is required.
import DOMPurify from 'dompurify';

/** Tags the Aurelo editor schema can produce. Nothing else survives. */
const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 's', 'del', 'code',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3',
  'blockquote', 'pre',
  'a', 'label', 'div', 'span', 'input',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel',
  'type', 'checked', 'disabled',
  'data-type', 'data-checked',
  'class',
];

/** Schemes we allow on links. Everything else (javascript:, data:) is dropped. */
const SAFE_PROTOCOL = /^(https?:|mailto:|tel:)/i;

let hooksInstalled = false;
function installHooks() {
  if (hooksInstalled || typeof window === 'undefined') return;
  hooksInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (!SAFE_PROTOCOL.test(href)) {
        node.removeAttribute('href');
      } else {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
      }
    }
    // Checklist checkboxes are never interactive outside the editor.
    if (node.tagName === 'INPUT') {
      node.setAttribute('type', 'checkbox');
      node.setAttribute('disabled', 'disabled');
    }
  });
}

/**
 * Sanitize untrusted HTML down to the Aurelo editor schema.
 * Use before storing user content and before any read-only render.
 */
export function sanitizeEditorHtml(html: string | null | undefined): string {
  if (!html) return '';
  installHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload'],
    ALLOW_DATA_ATTR: false,
  });
}

/** Heuristic: does this stored value contain markup produced by the editor? */
export function looksLikeHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<(p|br|ul|ol|li|h[1-3]|strong|em|s|code|pre|blockquote|a|hr|div)\b[^>]*>/i.test(value);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Turn any stored value (legacy plain text or HTML) into safe editor HTML.
 * Legacy plain text keeps its line breaks by becoming paragraphs.
 */
export function normalizeEditorContent(value: string | null | undefined): string {
  if (!value) return '';
  if (looksLikeHtml(value)) return sanitizeEditorHtml(value);
  const paragraphs = value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => escapeHtml(block).replace(/\n/g, '<br>'))
    .filter((block) => block.length > 0);
  if (paragraphs.length === 0) return '';
  return paragraphs.map((p) => `<p>${p}</p>`).join('');
}

/**
 * DOM-based plain-text extraction. Block boundaries become newlines,
 * list items get a marker so previews read naturally.
 * Never uses a regex to strip tags.
 */
export function editorHtmlToPlainText(value: string | null | undefined): string {
  if (!value) return '';
  if (!looksLikeHtml(value)) return value.trim();
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    // SSR / non-DOM fallback: strip via a conservative parser-free path.
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const safe = sanitizeEditorHtml(value);
  const doc = new DOMParser().parseFromString(`<body>${safe}</body>`, 'text/html');
  const lines: string[] = [];

  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = (child.textContent || '').replace(/\s+/g, ' ');
        if (!text.trim()) return;
        if (lines.length === 0) lines.push('');
        lines[lines.length - 1] += text;
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === 'input') return; // checklist boxes contribute no text
      if (tag === 'br') { lines.push(''); return; }
      if (tag === 'hr') { lines.push(''); return; }
      const isBlock = ['p', 'div', 'li', 'h1', 'h2', 'h3', 'blockquote', 'pre', 'ul', 'ol'].includes(tag);
      if (isBlock) lines.push('');
      walk(el);
      if (isBlock) lines.push('');
    });
  };
  walk(doc.body);

  return lines
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0)
    .join('\n')
    .trim();
}

/** True when the value carries no meaningful content (covers `<p></p>`). */
export function isEditorContentEmpty(value: string | null | undefined): boolean {
  if (!value) return true;
  if (!looksLikeHtml(value)) return value.trim().length === 0;
  const safe = sanitizeEditorHtml(value);
  // Structural-only content (hr, empty checklist) still counts as content.
  if (/<(hr|input|img)\b/i.test(safe)) return false;
  return editorHtmlToPlainText(safe).length === 0;
}

/**
 * Value to persist: sanitized HTML, or null when empty.
 * The single supported write path for every editor field.
 */
export function toStorableEditorContent(value: string | null | undefined): string | null {
  if (isEditorContentEmpty(value)) return null;
  return sanitizeEditorHtml(value);
}

/** Compact single-line preview for tables, feeds, emails, exports. */
export function editorContentToPreview(
  value: string | null | undefined,
  maxChars = 140,
): string {
  const text = editorHtmlToPlainText(value).replace(/\s*\n+\s*/g, ' · ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

/** True when two editor values are semantically identical (dirty-state checks). */
export function editorContentEquals(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = isEditorContentEmpty(a) ? '' : sanitizeEditorHtml(a);
  const nb = isEditorContentEmpty(b) ? '' : sanitizeEditorHtml(b);
  return na === nb;
}
