// ── Payment Terms Display Mapping ────────────────────────────────────
// Stored values remain backward-compatible (e.g. "Net 30"),
// but the UI shows humanized labels (e.g. "Due in 30 days").

const PAYMENT_TERMS_MAP: Record<string, string> = {
  'Due on receipt': 'Due immediately',
  'Net 15': 'Due in 15 days',
  'Net 30': 'Due in 30 days',
  'Net 45': 'Due in 45 days',
  'Net 60': 'Due in 60 days',
};

/** Convert a stored payment-terms value to a friendly display label. */
export function friendlyPaymentTerms(stored: string | undefined | null): string {
  if (!stored) return '';
  return PAYMENT_TERMS_MAP[stored] || stored;
}

/** Options for <select> dropdowns: display friendly labels, store original values. */
export const PAYMENT_TERMS_OPTIONS = [
  { value: 'Due on receipt', label: 'Due immediately' },
  { value: 'Net 15', label: 'Due in 15 days' },
  { value: 'Net 30', label: 'Due in 30 days' },
  { value: 'Net 45', label: 'Due in 45 days' },
  { value: 'Net 60', label: 'Due in 60 days' },
];
