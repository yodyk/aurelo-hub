import { BASE, authHeaders } from './apiHeaders';
import { getAccessToken } from './authService';

// ── Invoice Types ──────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'voided' | 'cancelled';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  /** Session IDs this line was generated from (for traceability) */
  sessionIds?: string[];
}

export interface Invoice {
  id: string;
  number: string;                   // e.g. "INV-1001"
  clientId: string;
  clientName: string;
  clientEmail?: string;
  projectId?: string;
  projectName?: string;
  status: InvoiceStatus;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;                  // decimal, e.g. 0.10
  taxAmount: number;
  total: number;
  currency: string;
  dueDate: string;                  // ISO string
  issuedDate: string;               // ISO string
  paidDate?: string;
  notes?: string;
  paymentTerms?: string;

  // ── Stripe integration fields (nullable until connected) ──────
  stripeInvoiceId: string | null;
  stripeCustomerId: string | null;
  stripePaymentUrl: string | null;

  // ── Branding (pulled from workspace settings) ─────────────────
  fromName?: string;
  fromEmail?: string;
  fromAddress?: string;

  // ── Metadata ──────────────────────────────────────────────────
  createdAt: string;
  updatedAt: string;
  /** Session IDs used to create this invoice (for "already invoiced" tracking) */
  createdFromSessions?: string[];
}

// ── API functions ──────────────────────────────────────────────────

export async function loadInvoices(): Promise<Invoice[]> {
  const token = await getAccessToken();
  if (!token) return [];
  const res = await fetch(`${BASE}/invoices`, { headers: await authHeaders(false) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[invoiceApi] loadInvoices failed:', res.status, err);
    return [];
  }
  const { data } = await res.json();
  return data || [];
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const res = await fetch(`${BASE}/invoices/${invoiceId}`, { headers: await authHeaders(false) });
  if (!res.ok) return null;
  const { data } = await res.json();
  return data || null;
}

export async function createInvoice(invoice: Partial<Invoice>): Promise<Invoice> {
  const res = await fetch(`${BASE}/invoices`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(invoice),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create invoice');
  }
  const { data } = await res.json();
  return data;
}

export async function updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<Invoice> {
  const res = await fetch(`${BASE}/invoices/${invoiceId}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update invoice');
  }
  const { data } = await res.json();
  return data;
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  const res = await fetch(`${BASE}/invoices/${invoiceId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete invoice');
  }
}

/**
 * Mark invoice as sent.
 * 
 * STRIPE INTEGRATION POINT:
 * When Stripe is connected, this will:
 *   1. Create/finalize the Stripe invoice via API
 *   2. Send the invoice email via Stripe
 *   3. Store the stripeInvoiceId back on our record
 * 
 * Until then, this just updates status to 'sent' and sets issuedDate.
 */
export async function sendInvoice(invoiceId: string): Promise<Invoice> {
  const res = await fetch(`${BASE}/invoices/${invoiceId}/send`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send invoice');
  }
  const { data } = await res.json();
  return data;
}

/** Manually mark as paid (or via Stripe webhook when connected) */
export async function markPaid(invoiceId: string): Promise<Invoice> {
  const res = await fetch(`${BASE}/invoices/${invoiceId}/mark-paid`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to mark invoice as paid');
  }
  const { data } = await res.json();
  return data;
}

/** Void an invoice */
export async function voidInvoice(invoiceId: string): Promise<Invoice> {
  const res = await fetch(`${BASE}/invoices/${invoiceId}/void`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to void invoice');
  }
  const { data } = await res.json();
  return data;
}

/**
 * Get next invoice number for the workspace.
 * Returns the next sequential number like "INV-1001".
 */
export async function getNextInvoiceNumber(): Promise<string> {
  const res = await fetch(`${BASE}/invoices/next-number`, { headers: await authHeaders(false) });
  if (!res.ok) return `INV-${Date.now().toString().slice(-4)}`;
  const { data } = await res.json();
  return data?.number || `INV-${Date.now().toString().slice(-4)}`;
}
