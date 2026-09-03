/**
 * Employment (W-2) income, paycheck and estimated-tax-payment API.
 *
 * These tables are owner-only at the database layer (RLS uses
 * `is_workspace_owner`), so non-owners get empty results / permission errors
 * from every call here — the UI gate is a convenience, not the enforcement.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  grossPerPaycheckCents,
  occurrenceKeyFor,
  payDates,
  type EmploymentSource,
  type Paycheck,
  type TaxPayment,
} from '@/lib/finance/employment';
import { fromCents, toCents } from '@/lib/finance/money';

const num = (v: any): number | null => (v == null || v === '' ? null : Number(v));

function mapSource(row: any): EmploymentSource {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    employerName: row.employer_name,
    compensationMethod: row.compensation_method,
    annualSalary: num(row.annual_salary),
    grossPerPaycheck: num(row.gross_per_paycheck),
    payFrequency: row.pay_frequency,
    anchorPayday: row.anchor_payday,
    semimonthlyDay1: row.semimonthly_day_1,
    semimonthlyDay2: row.semimonthly_day_2,
    monthlyDay: row.monthly_day,
    startDate: row.start_date,
    endDate: row.end_date,
    currency: row.currency,
    ytdThroughDate: row.ytd_through_date,
    ytdGross: num(row.ytd_gross),
    ytdFederalWithheld: num(row.ytd_federal_withheld),
    ytdStateWithheld: num(row.ytd_state_withheld),
    ytdDesignatedFederal: num(row.ytd_designated_federal),
    ytdDesignatedState: num(row.ytd_designated_state),
    additionalFederalPerPaycheck: Number(row.additional_federal_per_paycheck || 0),
    additionalStatePerPaycheck: Number(row.additional_state_per_paycheck || 0),
    additionalDesignatedForOtherIncome: !!row.additional_designated_for_other_income,
    projectionMode: row.projection_mode,
    manualRemainingDesignated: num(row.manual_remaining_designated),
    taxYear: row.tax_year,
    notes: row.notes,
    active: !!row.active,
  };
}

function mapPaycheck(row: any): Paycheck {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    employmentSourceId: row.employment_source_id,
    occurrenceKey: row.occurrence_key,
    payDate: row.pay_date,
    status: row.status,
    kind: row.kind,
    grossAmount: num(row.gross_amount),
    federalWithheld: num(row.federal_withheld),
    stateWithheld: num(row.state_withheld),
    designatedAdditionalFederal: Number(row.designated_additional_federal || 0),
    designatedAdditionalState: Number(row.designated_additional_state || 0),
    currency: row.currency,
    generated: !!row.generated,
    notes: row.notes,
  };
}

function mapPayment(row: any): TaxPayment {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    status: row.status,
    plannedDate: row.planned_date,
    paidDate: row.paid_date,
    amount: Number(row.amount || 0),
    taxYear: row.tax_year,
    jurisdiction: row.jurisdiction,
    periodLabel: row.period_label,
    reference: row.reference,
    currency: row.currency,
    notes: row.notes,
  };
}

const sourcePayload = (input: Partial<EmploymentSource>) => ({
  employer_name: input.employerName,
  compensation_method: input.compensationMethod,
  annual_salary: input.annualSalary ?? null,
  gross_per_paycheck: input.grossPerPaycheck ?? null,
  pay_frequency: input.payFrequency,
  anchor_payday: input.anchorPayday || null,
  semimonthly_day_1: input.semimonthlyDay1 ?? null,
  semimonthly_day_2: input.semimonthlyDay2 ?? null,
  monthly_day: input.monthlyDay ?? null,
  start_date: input.startDate || null,
  end_date: input.endDate || null,
  currency: input.currency,
  ytd_through_date: input.ytdThroughDate || null,
  ytd_gross: input.ytdGross ?? null,
  ytd_federal_withheld: input.ytdFederalWithheld ?? null,
  ytd_state_withheld: input.ytdStateWithheld ?? null,
  ytd_designated_federal: input.ytdDesignatedFederal ?? null,
  ytd_designated_state: input.ytdDesignatedState ?? null,
  additional_federal_per_paycheck: input.additionalFederalPerPaycheck ?? 0,
  additional_state_per_paycheck: input.additionalStatePerPaycheck ?? 0,
  additional_designated_for_other_income: input.additionalDesignatedForOtherIncome ?? false,
  projection_mode: input.projectionMode ?? 'schedule',
  manual_remaining_designated: input.manualRemainingDesignated ?? null,
  tax_year: input.taxYear,
  notes: input.notes || null,
  active: input.active ?? true,
});

export interface EmploymentData {
  sources: EmploymentSource[];
  paychecks: Paycheck[];
  payments: TaxPayment[];
  otherWithholdingAvailable: number;
}

export async function loadEmploymentData(workspaceId: string): Promise<EmploymentData> {
  const [sources, paychecks, payments, settings] = await Promise.all([
    supabase.from('employment_sources').select('*').eq('workspace_id', workspaceId).order('created_at'),
    supabase.from('employment_paychecks').select('*').eq('workspace_id', workspaceId).order('pay_date'),
    supabase.from('tax_payments').select('*').eq('workspace_id', workspaceId).order('tax_year', { ascending: false }),
    supabase.from('employment_settings').select('*').eq('workspace_id', workspaceId).maybeSingle(),
  ]);
  for (const r of [sources, paychecks, payments, settings]) if (r.error) throw r.error;
  return {
    sources: (sources.data || []).map(mapSource),
    paychecks: (paychecks.data || []).map(mapPaycheck),
    payments: (payments.data || []).map(mapPayment),
    otherWithholdingAvailable: Number((settings.data as any)?.other_withholding_available || 0),
  };
}

export async function saveOtherWithholdingAvailable(workspaceId: string, amount: number) {
  const { error } = await supabase
    .from('employment_settings')
    .upsert({ workspace_id: workspaceId, other_withholding_available: amount }, { onConflict: 'workspace_id' });
  if (error) throw error;
}

export async function addEmploymentSource(workspaceId: string, input: Partial<EmploymentSource>): Promise<EmploymentSource> {
  const { data, error } = await supabase
    .from('employment_sources')
    .insert({ workspace_id: workspaceId, ...sourcePayload(input) } as any)
    .select()
    .single();
  if (error) throw error;
  return mapSource(data);
}

export async function updateEmploymentSource(workspaceId: string, id: string, input: Partial<EmploymentSource>) {
  const { error } = await supabase
    .from('employment_sources')
    .update(sourcePayload(input) as any)
    .eq('workspace_id', workspaceId)
    .eq('id', id);
  if (error) throw error;
}

/** Deactivating keeps confirmed paycheck history; only projections are dropped. */
export async function deactivateEmploymentSource(workspaceId: string, id: string, endDate?: string | null) {
  const { error } = await supabase
    .from('employment_sources')
    .update({ active: false, end_date: endDate ?? null })
    .eq('workspace_id', workspaceId)
    .eq('id', id);
  if (error) throw error;
  await supabase.from('employment_paychecks').delete().eq('workspace_id', workspaceId).eq('employment_source_id', id).eq('status', 'projected').eq('generated', true);
}

export async function deleteEmploymentSource(workspaceId: string, id: string) {
  // Preserve all paycheck history by using the same lifecycle rule as recurring
  // expenses: deactivate the source and remove only generated projections.
  await deactivateEmploymentSource(workspaceId, id, new Date().toISOString().slice(0, 10));
}

/**
 * Idempotent paycheck generation.
 * - Never touches confirmed or manually entered paychecks.
 * - Never generates on or before the YTD cutoff.
 * - Regenerates only future projected rows when compensation/schedule changes.
 */
export async function generatePaychecks(workspaceId: string, sources: EmploymentSource[], rangeStart: string, rangeEnd: string) {
  const existing = await supabase
    .from('employment_paychecks')
    .select('id, employment_source_id, occurrence_key, status, generated, pay_date, gross_amount')
    .eq('workspace_id', workspaceId);
  if (existing.error) throw existing.error;
  const byKey = new Map((existing.data || []).map((r: any) => [`${r.employment_source_id}|${r.occurrence_key}`, r]));
  const today = new Date().toISOString().slice(0, 10);

  const inserts: any[] = [];
  const staleProjected: string[] = [];
  for (const source of sources) {
    if (!source.active) continue;
    const dates = payDates(source, rangeStart, rangeEnd);
    const wanted = new Set(dates.map((d) => occurrenceKeyFor(source, d)));
    const gross = fromCents(grossPerPaycheckCents(source));
    const designatedFederal = source.additionalDesignatedForOtherIncome ? source.additionalFederalPerPaycheck : 0;
    const designatedState = source.additionalDesignatedForOtherIncome ? source.additionalStatePerPaycheck : 0;

    for (const date of dates) {
      const key = occurrenceKeyFor(source, date);
      const row = byKey.get(`${source.id}|${key}`);
      if (row) {
        // Confirmed history is immutable; refresh only future projections.
        if (row.status === 'projected' && row.generated && row.pay_date > today) {
          staleProjected.push(row.id);
        } else continue;
      }
      inserts.push({
        workspace_id: workspaceId,
        employment_source_id: source.id,
        occurrence_key: key,
        pay_date: date,
        status: date <= today && !row ? 'projected' : 'projected',
        kind: 'regular',
        gross_amount: gross || null,
        designated_additional_federal: designatedFederal,
        designated_additional_state: designatedState,
        currency: source.currency,
        generated: true,
      });
    }
    // Remove future generated projections that no longer belong to the schedule.
    const orphans = (existing.data || []).filter(
      (r: any) => r.employment_source_id === source.id && r.generated && r.status === 'projected' && r.pay_date > today && !wanted.has(r.occurrence_key),
    );
    for (const o of orphans) staleProjected.push(o.id);
  }

  if (staleProjected.length) {
    const { error } = await supabase.from('employment_paychecks').delete().in('id', staleProjected);
    if (error) throw error;
  }
  if (inserts.length) {
    const { error } = await supabase
      .from('employment_paychecks')
      .upsert(inserts, { onConflict: 'workspace_id,employment_source_id,occurrence_key', ignoreDuplicates: true });
    if (error) throw error;
  }
}

export async function upsertManualPaycheck(workspaceId: string, input: Partial<Paycheck> & { employmentSourceId: string; payDate: string }) {
  const payload = {
    workspace_id: workspaceId,
    employment_source_id: input.employmentSourceId,
    occurrence_key: input.occurrenceKey || `manual:${input.kind || 'regular'}:${input.payDate}:${crypto.randomUUID().slice(0, 8)}`,
    pay_date: input.payDate,
    status: input.status || 'confirmed',
    kind: input.kind || 'regular',
    gross_amount: input.grossAmount ?? null,
    federal_withheld: input.federalWithheld ?? null,
    state_withheld: input.stateWithheld ?? null,
    designated_additional_federal: input.designatedAdditionalFederal ?? 0,
    designated_additional_state: input.designatedAdditionalState ?? 0,
    currency: input.currency || 'USD',
    generated: false,
    notes: input.notes || null,
  };
  const { error } = await supabase.from('employment_paychecks').insert(payload as any);
  if (error) throw error;
}

export async function updatePaycheck(workspaceId: string, id: string, patch: Partial<Paycheck>) {
  const payload: any = {};
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.grossAmount !== undefined) payload.gross_amount = patch.grossAmount;
  if (patch.federalWithheld !== undefined) payload.federal_withheld = patch.federalWithheld;
  if (patch.stateWithheld !== undefined) payload.state_withheld = patch.stateWithheld;
  if (patch.designatedAdditionalFederal !== undefined) payload.designated_additional_federal = patch.designatedAdditionalFederal;
  if (patch.designatedAdditionalState !== undefined) payload.designated_additional_state = patch.designatedAdditionalState;
  if (patch.notes !== undefined) payload.notes = patch.notes;
  if (patch.payDate !== undefined) payload.pay_date = patch.payDate;
  // Overriding an individual projected paycheck detaches it from regeneration.
  payload.generated = false;
  const { error } = await supabase.from('employment_paychecks').update(payload).eq('workspace_id', workspaceId).eq('id', id);
  if (error) throw error;
}

export async function deletePaycheck(workspaceId: string, id: string) {
  const { error } = await supabase.from('employment_paychecks').delete().eq('workspace_id', workspaceId).eq('id', id);
  if (error) throw error;
}

/* ── estimated tax payments ───────────────────────────────────────── */

const paymentPayload = (input: Partial<TaxPayment>) => ({
  status: input.status ?? 'planned',
  planned_date: input.plannedDate || null,
  paid_date: input.status === 'paid' ? input.paidDate || null : null,
  amount: input.amount ?? 0,
  tax_year: input.taxYear,
  jurisdiction: input.jurisdiction ?? 'federal',
  period_label: input.periodLabel || null,
  reference: input.reference || null,
  currency: input.currency || 'USD',
  notes: input.notes || null,
});

export async function addTaxPayment(workspaceId: string, input: Partial<TaxPayment>) {
  const { error } = await supabase.from('tax_payments').insert({ workspace_id: workspaceId, ...paymentPayload(input) } as any);
  if (error) throw error;
}

export async function updateTaxPayment(workspaceId: string, id: string, input: Partial<TaxPayment>) {
  const { error } = await supabase.from('tax_payments').update(paymentPayload(input) as any).eq('workspace_id', workspaceId).eq('id', id);
  if (error) throw error;
}

export async function deleteTaxPayment(workspaceId: string, id: string) {
  const { error } = await supabase.from('tax_payments').delete().eq('workspace_id', workspaceId).eq('id', id);
  if (error) throw error;
}

export const cents = { toCents, fromCents };
