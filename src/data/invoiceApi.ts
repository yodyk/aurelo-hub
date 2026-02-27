import { supabase } from '@/integrations/supabase/client';

// ── Invoice Types ──────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'voided' | 'cancelled';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  sessionIds?: string[];
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  projectId?: string;
  projectName?: string;
  status: InvoiceStatus;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  dueDate: string;
  issuedDate: string;
  paidDate?: string;
  notes?: string;
  paymentTerms?: string;
  stripeInvoiceId: string | null;
  stripeCustomerId: string | null;
  stripePaymentUrl: string | null;
  fromName?: string;
  fromEmail?: string;
  fromAddress?: string;
  createdAt: string;
  updatedAt: string;
  createdFromSessions?: string[];
}

// ── Helpers ────────────────────────────────────────────────────────

async function getWorkspaceId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  return data?.workspace_id ?? null;
}

function rowToInvoice(r: any): Invoice {
  return {
    id: r.id,
    number: r.number,
    clientId: r.client_id,
    clientName: r.client_name || '',
    clientEmail: r.client_email || undefined,
    projectId: r.project_id || undefined,
    projectName: r.project_name || undefined,
    status: r.status as InvoiceStatus,
    lineItems: (Array.isArray(r.line_items) ? r.line_items : []) as LineItem[],
    subtotal: Number(r.subtotal) || 0,
    taxRate: Number(r.tax_rate) || 0,
    taxAmount: Number(r.tax_amount) || 0,
    total: Number(r.total) || 0,
    currency: r.currency || 'USD',
    dueDate: r.due_date || '',
    issuedDate: r.issued_date || '',
    paidDate: r.paid_date || undefined,
    notes: r.notes || undefined,
    paymentTerms: r.payment_terms || undefined,
    stripeInvoiceId: r.stripe_invoice_id,
    stripeCustomerId: r.stripe_customer_id,
    stripePaymentUrl: r.stripe_payment_url,
    fromName: r.from_name || undefined,
    fromEmail: r.from_email || undefined,
    fromAddress: r.from_address || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdFromSessions: r.created_from_sessions || undefined,
  };
}

function invoiceToRow(inv: Partial<Invoice>): Record<string, any> {
  const row: Record<string, any> = {};
  if (inv.number !== undefined) row.number = inv.number;
  if (inv.clientId !== undefined) row.client_id = inv.clientId;
  if (inv.clientName !== undefined) row.client_name = inv.clientName;
  if (inv.clientEmail !== undefined) row.client_email = inv.clientEmail;
  if (inv.projectId !== undefined) row.project_id = inv.projectId;
  if (inv.projectName !== undefined) row.project_name = inv.projectName;
  if (inv.status !== undefined) row.status = inv.status;
  if (inv.lineItems !== undefined) row.line_items = inv.lineItems;
  if (inv.subtotal !== undefined) row.subtotal = inv.subtotal;
  if (inv.taxRate !== undefined) row.tax_rate = inv.taxRate;
  if (inv.taxAmount !== undefined) row.tax_amount = inv.taxAmount;
  if (inv.total !== undefined) row.total = inv.total;
  if (inv.currency !== undefined) row.currency = inv.currency;
  if (inv.dueDate !== undefined) row.due_date = inv.dueDate;
  if (inv.issuedDate !== undefined) row.issued_date = inv.issuedDate;
  if (inv.paidDate !== undefined) row.paid_date = inv.paidDate;
  if (inv.notes !== undefined) row.notes = inv.notes;
  if (inv.paymentTerms !== undefined) row.payment_terms = inv.paymentTerms;
  if (inv.fromName !== undefined) row.from_name = inv.fromName;
  if (inv.fromEmail !== undefined) row.from_email = inv.fromEmail;
  if (inv.fromAddress !== undefined) row.from_address = inv.fromAddress;
  if (inv.createdFromSessions !== undefined) row.created_from_sessions = inv.createdFromSessions;
  return row;
}

// ── API functions ──────────────────────────────────────────────────

export async function loadInvoices(): Promise<Invoice[]> {
  const wsId = await getWorkspaceId();
  if (!wsId) return [];
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('workspace_id', wsId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[invoiceApi] loadInvoices failed:', error);
    return [];
  }
  return (data || []).map(rowToInvoice);
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToInvoice(data);
}

export async function createInvoice(invoice: Partial<Invoice>): Promise<Invoice> {
  const wsId = await getWorkspaceId();
  if (!wsId) throw new Error('No workspace found');
  const row = invoiceToRow(invoice);
  row.workspace_id = wsId;
  const { data, error } = await supabase
    .from('invoices')
    .insert(row as any)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToInvoice(data);
}

export async function updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<Invoice> {
  const row = invoiceToRow(updates);
  row.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('invoices')
    .update(row)
    .eq('id', invoiceId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToInvoice(data);
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId);
  if (error) throw new Error(error.message);
}

export async function sendInvoice(invoiceId: string): Promise<Invoice> {
  return updateInvoice(invoiceId, {
    status: 'sent',
    issuedDate: new Date().toISOString(),
  });
}

export async function markPaid(invoiceId: string): Promise<Invoice> {
  return updateInvoice(invoiceId, {
    status: 'paid',
    paidDate: new Date().toISOString(),
  });
}

export async function voidInvoice(invoiceId: string): Promise<Invoice> {
  return updateInvoice(invoiceId, { status: 'voided' });
}

export async function getNextInvoiceNumber(): Promise<string> {
  const wsId = await getWorkspaceId();
  if (!wsId) return `INV-${Date.now().toString().slice(-4)}`;

  const { data, error } = await supabase
    .from('invoice_sequences')
    .select('next_number')
    .eq('workspace_id', wsId)
    .maybeSingle();

  if (error || !data) return `INV-${Date.now().toString().slice(-4)}`;

  const num = data.next_number;

  // Increment
  await supabase
    .from('invoice_sequences')
    .update({ next_number: num + 1 })
    .eq('workspace_id', wsId);

  return `INV-${num}`;
}
