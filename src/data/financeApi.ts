import { supabase } from '@/integrations/supabase/client';
import { loadSetting, saveSetting } from './settingsApi';
import { occurrenceDates, occurrenceKey, generatedInstanceStatus } from '@/lib/finance/recurrence';
import type { Expense, ExpenseAddition, ExpenseCategory, ExpenseInstance, FinanceSettings, IncomeEntry, RecognitionMethod } from '@/lib/finance';

const db = supabase as any;
const SETTINGS_KEY = 'finance';
const US_CATEGORIES = ['Advertising', 'Car & Truck', 'Commissions & Fees', 'Contract Labor', 'Insurance', 'Interest', 'Legal & Professional', 'Office Expense', 'Rent or Lease', 'Repairs & Maintenance', 'Supplies', 'Taxes & Licenses', 'Travel', 'Meals', 'Utilities', 'Wages', 'Business Use of Home', 'Software & Subscriptions', 'Other Expense'];

const mapIncome = (r: any): IncomeEntry => ({ id: r.id, workspaceId: r.workspace_id, sourceType: r.source_type, sourceId: r.source_id, sourceKey: r.source_key, clientId: r.client_id, payerName: r.payer_name, description: r.description, sourceAmount: Number(r.source_amount) || 0, overrideAmount: r.override_amount == null ? null : Number(r.override_amount), currency: r.currency || 'USD', status: r.status, earnedDate: r.earned_date, paidDate: r.paid_date, included: r.included, sourceState: r.source_state, suppressedBy: r.suppressed_by, notes: r.notes, metadata: r.metadata || {} });
const mapCategory = (r: any): ExpenseCategory => ({ id: r.id, workspaceId: r.workspace_id, name: r.name, sortOrder: r.sort_order, isSeed: r.is_seed });
const mapExpense = (r: any): Expense => ({ id: r.id, workspaceId: r.workspace_id, name: r.name, vendor: r.vendor, categoryId: r.category_id, recurrence: r.recurrence, intervalDays: r.interval_days, amountBehavior: r.amount_behavior, baseAmount: r.base_amount == null ? null : Number(r.base_amount), businessUsePct: Number(r.business_use_pct ?? 100), inclusion: r.inclusion, currency: r.currency || 'USD', startDate: r.start_date, endDate: r.end_date, active: r.active, notes: r.notes });
const mapInstance = (r: any, additions: ExpenseAddition[] = []): ExpenseInstance => ({ id: r.id, workspaceId: r.workspace_id, expenseId: r.expense_id, occurrenceKey: r.occurrence_key, incurredDate: r.incurred_date, paidDate: r.paid_date, status: r.status, baseAmount: r.base_amount == null ? null : Number(r.base_amount), businessUsePct: r.business_use_pct == null ? null : Number(r.business_use_pct), currency: r.currency || 'USD', notes: r.notes, generated: r.generated, additions });

export async function loadFinanceSettings(workspaceId: string): Promise<FinanceSettings> {
  const raw = await loadSetting(SETTINGS_KEY, workspaceId);
  return { taxRatePct: raw?.taxRatePct == null ? null : Number(raw.taxRatePct), taxYear: Number(raw?.taxYear || new Date().getFullYear()), currency: raw?.currency || 'USD', method: (raw?.method === 'cash' ? 'cash' : 'accrual') as RecognitionMethod, jurisdiction: raw?.jurisdiction || null };
}
export async function saveFinanceSettings(workspaceId: string, settings: FinanceSettings): Promise<void> { await saveSetting(SETTINGS_KEY, settings, workspaceId); }

export async function loadIncomeEntries(workspaceId: string): Promise<IncomeEntry[]> {
  const { data, error } = await db.from('income_entries').select('*').eq('workspace_id', workspaceId).order('earned_date', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data || []).map(mapIncome);
}
export async function updateIncomeEntry(workspaceId: string, id: string, patch: Partial<Pick<IncomeEntry, 'overrideAmount' | 'included' | 'notes'>>): Promise<IncomeEntry> {
  const row: any = {};
  if (patch.overrideAmount !== undefined) row.override_amount = patch.overrideAmount;
  if (patch.included !== undefined) row.included = patch.included;
  if (patch.notes !== undefined) row.notes = patch.notes;
  const { data, error } = await db.from('income_entries').update(row).eq('id', id).eq('workspace_id', workspaceId).select().single();
  if (error) throw error;
  return mapIncome(data);
}
export async function addManualIncome(workspaceId: string, input: any): Promise<IncomeEntry> {
  const sourceKey = `manual:${crypto.randomUUID()}`;
  const { data, error } = await db.from('income_entries').insert({ workspace_id: workspaceId, source_type: 'manual', source_key: sourceKey, payer_name: input.payerName || null, description: input.description || null, source_amount: Number(input.amount) || 0, currency: input.currency || 'USD', status: 'paid', earned_date: input.earnedDate || null, paid_date: input.paidDate || input.earnedDate || null, notes: input.notes || null }).select().single();
  if (error) throw error;
  return mapIncome(data);
}

/** Sync source-owned fields only. User override, notes, and inclusion are never sent. */
export async function syncIncomeSources(workspaceId: string, clients: any[], projects: any[], invoices: any[], currency: string): Promise<IncomeEntry[]> {
  const { data: existingRows, error: existingError } = await db.from('income_entries').select('*').eq('workspace_id', workspaceId);
  if (existingError) throw existingError;
  const rows: any[] = [];
  const sourceKeys = new Set<string>();
  const invoiceByProject = new Map<string, any>();
  const invoiceMonthsByClient = new Map<string, Set<string>>();
  for (const invoice of invoices || []) {
    const key = `invoice:${invoice.id}`;
    sourceKeys.add(key);
    if (invoice.projectId) invoiceByProject.set(String(invoice.projectId), invoice);
    if (invoice.clientId && invoice.issuedDate) {
      const months = invoiceMonthsByClient.get(String(invoice.clientId)) || new Set<string>();
      months.add(String(invoice.issuedDate).slice(0, 7));
      invoiceMonthsByClient.set(String(invoice.clientId), months);
    }
    const client = clients.find((c) => c.id === invoice.clientId);
    const paid = invoice.status === 'paid';
    rows.push({ workspace_id: workspaceId, source_type: 'invoice', source_id: invoice.id, source_key: key, client_id: invoice.clientId || null, payer_name: invoice.clientName || client?.name || null, description: `Invoice #${invoice.number}`, source_amount: invoice.total, currency: invoice.currency || currency, status: paid ? 'paid' : invoice.status === 'voided' || invoice.status === 'cancelled' || invoice.status === 'archived' ? 'excluded' : 'invoiced', earned_date: invoice.issuedDate || null, paid_date: paid ? (invoice.paidDate || null) : null, source_state: 'active', suppressed_by: null, metadata: { invoiceNumber: invoice.number, projectId: invoice.projectId || null } });
  }
  for (const project of projects || []) {
    const key = `project:${project.id}`;
    const linkedInvoice = invoiceByProject.get(String(project.id));
    const amount = Number(project.contractValue ?? project.totalValue ?? 0);
    if (amount <= 0) continue;
    sourceKeys.add(key);
    const client = clients.find((c) => c.id === project.clientId);
    rows.push({ workspace_id: workspaceId, source_type: 'project', source_id: project.id, source_key: key, client_id: project.clientId || null, payer_name: client?.name || null, description: project.name, source_amount: amount, currency, status: project.status === 'Archived' ? 'excluded' : 'projected', earned_date: project.startDate || null, paid_date: null, source_state: project.status === 'Archived' ? 'archived' : 'active', suppressed_by: linkedInvoice ? `invoice:${linkedInvoice.id}` : null, metadata: { projectName: project.name, linkedInvoiceId: linkedInvoice?.id || null } });
  }
  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  for (const client of clients || []) {
    const monthly = Number(client.monthlyContractValue || 0);
    const isRetainer = String(client.billingModel || '').toLowerCase().includes('retainer') || monthly > 0;
    if (!isRetainer || monthly <= 0) continue;
    // Walk the client's true billing cycle, not calendar months.
    const cycleDays = Math.max(1, Number(client.retainerCycleDays || 30));
    const anchor = client.retainerCycleStart ? new Date(`${String(client.retainerCycleStart).slice(0, 10)}T00:00:00`) : new Date(year, 0, 1);
    if (Number.isNaN(anchor.getTime())) continue;
    const cursor = new Date(anchor);
    while (cursor < yearStart) cursor.setDate(cursor.getDate() + cycleDays);
    while (cursor > yearStart) {
      const previous = new Date(cursor);
      previous.setDate(previous.getDate() - cycleDays);
      if (previous < yearStart) break;
      cursor.setTime(previous.getTime());
    }
    for (let cycle = new Date(cursor); cycle <= yearEnd; cycle.setDate(cycle.getDate() + cycleDays)) {
      const cycleStart = new Date(cycle);
      const cycleEnd = new Date(cycle); cycleEnd.setDate(cycleEnd.getDate() + cycleDays - 1);
      const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const startIso = iso(cycleStart);
      const endIso = iso(cycleEnd);
      const key = `retainer:${client.id}:${startIso}`;
      const suppressedInvoice = (invoices || []).find((i: any) => i.clientId === client.id && i.issuedDate && String(i.issuedDate).slice(0, 10) >= startIso && String(i.issuedDate).slice(0, 10) <= endIso) || null;
      sourceKeys.add(key);
      rows.push({ workspace_id: workspaceId, source_type: 'retainer', source_id: client.id, source_key: key, client_id: client.id, payer_name: client.name, description: `${client.name} retainer · ${startIso} – ${endIso}`, source_amount: monthly, currency, status: client.status === 'Archived' ? 'excluded' : 'projected', earned_date: startIso, paid_date: null, source_state: client.status === 'Archived' ? 'archived' : 'active', suppressed_by: suppressedInvoice ? `invoice:${suppressedInvoice.id}` : null, metadata: { cycleStart: startIso, cycleEnd: endIso, cycleDays, linkedInvoiceId: suppressedInvoice?.id || null } });
    }
  }
  if (rows.length) {
    const { error } = await db.from('income_entries').upsert(rows, { onConflict: 'workspace_id,source_key', ignoreDuplicates: false });
    if (error) throw error;
  }
  const missing = (existingRows || []).filter((row: any) => ['invoice', 'project', 'retainer'].includes(row.source_type) && !sourceKeys.has(row.source_key));
  for (const row of missing) {
    // Preserve source history when a project, retainer cycle, or invoice disappears or changes shape.
    const { error } = await db.from('income_entries').update({ source_state: 'missing', status: 'needs_review', suppressed_by: null }).eq('id', row.id).eq('workspace_id', workspaceId);
    if (error) throw error;
  }

  const { data, error } = await db.from('income_entries').select('*').eq('workspace_id', workspaceId).order('earned_date', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data || []).map(mapIncome);
}

export async function loadExpenseData(workspaceId: string): Promise<{ categories: ExpenseCategory[]; expenses: Expense[]; instances: ExpenseInstance[] }> {
  const [catRes, expRes, instRes, addRes] = await Promise.all([
    db.from('expense_categories').select('*').eq('workspace_id', workspaceId).order('sort_order'),
    db.from('expenses').select('*').eq('workspace_id', workspaceId).eq('active', true).order('created_at', { ascending: false }),

    db.from('expense_instances').select('*').eq('workspace_id', workspaceId).order('incurred_date', { ascending: false }),
    db.from('expense_instance_additions').select('*').eq('workspace_id', workspaceId),
  ]);
  if (catRes.error) throw catRes.error; if (expRes.error) throw expRes.error; if (instRes.error) throw instRes.error; if (addRes.error) throw addRes.error;
  const additions = (addRes.data || []).map((r: any) => ({ id: r.id, workspaceId: r.workspace_id, instanceId: r.instance_id, label: r.label, amount: Number(r.amount) || 0 }));
  return { categories: (catRes.data || []).map(mapCategory), expenses: (expRes.data || []).map(mapExpense), instances: (instRes.data || []).map((r: any) => mapInstance(r, additions.filter((a: ExpenseAddition) => a.instanceId === r.id))) };
}

export async function seedExpenseCategories(workspaceId: string, _jurisdiction: string | null): Promise<void> {
  // Keep a useful baseline available even before a jurisdiction is configured. The list is
  // bookkeeping-oriented and does not represent tax advice; jurisdiction can refine it later.
  const { data, error: readError } = await db.from('expense_categories').select('name').eq('workspace_id', workspaceId);
  if (readError) throw readError;
  const existing = new Set((data || []).map((r: any) => r.name));
  const rows = US_CATEGORIES.filter((name) => !existing.has(name)).map((name, i) => ({ workspace_id: workspaceId, name, sort_order: i, is_seed: true }));
  if (rows.length) {
    const { error } = await db.from('expense_categories').upsert(rows, { onConflict: 'workspace_id,name' });
    if (error) throw error;
  }
}

/**
 * Idempotent expense creation. The caller supplies a stable `clientRequestId`
 * for a given submission attempt; retries or double-submits (even across slow
 * networks or reloads) resolve to the same row instead of creating duplicates.
 */
export async function addExpense(workspaceId: string, input: any): Promise<Expense> {
  const clientRequestId: string = input.clientRequestId || crypto.randomUUID();
  const row = { workspace_id: workspaceId, client_request_id: clientRequestId, name: input.name, vendor: input.vendor || null, category_id: input.categoryId || null, recurrence: input.recurrence || 'one_time', interval_days: input.intervalDays || null, amount_behavior: input.amountBehavior || 'fixed', base_amount: input.baseAmount == null ? null : Number(input.baseAmount), business_use_pct: Number(input.businessUsePct ?? 100), inclusion: input.inclusion || 'included', currency: input.currency || 'USD', start_date: input.startDate || null, end_date: input.endDate || null, notes: input.notes || null, active: true };

  const { data, error } = await db.from('expenses').insert(row as any).select().single();
  if (!error && data) return mapExpense(data);

  // The unique workspace/request key makes concurrent retries converge on the
  // original row without reapplying the payload over later user edits.
  const { data: existing, error: readError } = await db.from('expenses').select('*').eq('workspace_id', workspaceId).eq('client_request_id', clientRequestId).maybeSingle();
  if (readError) throw readError;
  if (existing) return mapExpense(existing);
  throw error;
}
export async function updateExpense(workspaceId: string, id: string, patch: any): Promise<void> {
  const row: Record<string, unknown> = {};
  const fields: Record<string, string> = { name: 'name', vendor: 'vendor', categoryId: 'category_id', recurrence: 'recurrence', intervalDays: 'interval_days', amountBehavior: 'amount_behavior', baseAmount: 'base_amount', businessUsePct: 'business_use_pct', inclusion: 'inclusion', currency: 'currency', startDate: 'start_date', endDate: 'end_date', active: 'active', notes: 'notes' };
  for (const [key, value] of Object.entries(patch)) if (fields[key]) row[fields[key]] = value;
  if (!Object.keys(row).length) return;

  const recurrenceFields = ['recurrence', 'intervalDays', 'amountBehavior', 'baseAmount', 'businessUsePct', 'currency', 'startDate', 'endDate'];
  const changesSchedule = recurrenceFields.some((field) => Object.prototype.hasOwnProperty.call(patch, field));
  if (changesSchedule) {
    const { error: cleanupError } = await db.from('expense_instances')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('expense_id', id)
      .eq('generated', true)
      .gte('incurred_date', new Date().toISOString().slice(0, 10))
      .neq('status', 'confirmed');
    if (cleanupError) throw cleanupError;
  }
  const { error } = await db.from('expenses').update(row).eq('id', id).eq('workspace_id', workspaceId);
  if (error) throw error;
}
/** Preserve the financial record while stopping future occurrence generation. */
export async function removeExpense(workspaceId: string, id: string): Promise<void> { const { error } = await db.from('expenses').update({ active: false }).eq('id', id).eq('workspace_id', workspaceId); if (error) throw error; }

/** Upserts only missing occurrence rows; existing confirmed rows are untouched. */
export async function generateExpenseInstances(workspaceId: string, expenses: Expense[], rangeStart: string, rangeEnd: string): Promise<void> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const rows: any[] = [];
  for (const expense of expenses) {
    for (const date of occurrenceDates(expense, rangeStart, rangeEnd)) {
      const { status, paidDate } = generatedInstanceStatus(expense, date, todayIso);
      rows.push({ workspace_id: workspaceId, expense_id: expense.id, occurrence_key: occurrenceKey(expense.id, date), incurred_date: date, paid_date: paidDate, status, base_amount: expense.baseAmount, currency: expense.currency, generated: true });
    }
  }
  if (rows.length) { const { error } = await db.from('expense_instances').upsert(rows, { onConflict: 'expense_id,occurrence_key', ignoreDuplicates: true }); if (error) throw error; }
  // Backfill past scheduled occurrences created before this rule existed.
  const expenseIds = expenses.filter((e) => e.amountBehavior !== 'variable').map((e) => e.id);
  if (expenseIds.length) {
    const { data: stale, error: staleError } = await db.from('expense_instances').select('id, incurred_date').eq('workspace_id', workspaceId).in('expense_id', expenseIds).eq('generated', true).eq('status', 'scheduled').lte('incurred_date', todayIso).not('base_amount', 'is', null);
    if (staleError) throw staleError;
    for (const row of stale || []) {
      const { error } = await db.from('expense_instances').update({ status: 'confirmed', paid_date: row.incurred_date }).eq('id', row.id).eq('workspace_id', workspaceId);
      if (error) throw error;
    }
  }
}

export async function updateExpenseInstance(workspaceId: string, id: string, patch: any): Promise<void> {
  const row: Record<string, unknown> = {};
  const fields: Record<string, string> = { incurredDate: 'incurred_date', paidDate: 'paid_date', status: 'status', baseAmount: 'base_amount', businessUsePct: 'business_use_pct', currency: 'currency', notes: 'notes' };
  for (const [key, value] of Object.entries(patch)) row[fields[key] || key] = value;
  const { error } = await db.from('expense_instances').update(row).eq('id', id).eq('workspace_id', workspaceId); if (error) throw error;
}
export async function addExpenseInstance(workspaceId: string, input: any): Promise<ExpenseInstance> { const { data, error } = await db.from('expense_instances').insert({ workspace_id: workspaceId, expense_id: input.expenseId, occurrence_key: `${input.expenseId}:manual:${crypto.randomUUID()}`, incurred_date: input.incurredDate, paid_date: input.paidDate || null, status: input.status || 'confirmed', base_amount: input.baseAmount == null ? null : Number(input.baseAmount), business_use_pct: input.businessUsePct == null ? null : Number(input.businessUsePct), currency: input.currency || 'USD', notes: input.notes || null, generated: false }).select().single(); if (error) throw error; return mapInstance(data); }
export async function addExpenseAddition(workspaceId: string, instanceId: string, label: string, amount: number): Promise<void> { const { error } = await db.from('expense_instance_additions').insert({ workspace_id: workspaceId, instance_id: instanceId, label, amount }); if (error) throw error; }
export async function updateExpenseAddition(workspaceId: string, id: string, patch: any): Promise<void> { const row = { ...(patch.label !== undefined ? { label: patch.label } : {}), ...(patch.amount !== undefined ? { amount: Number(patch.amount) } : {}) }; const { error } = await db.from('expense_instance_additions').update(row).eq('id', id).eq('workspace_id', workspaceId); if (error) throw error; }
