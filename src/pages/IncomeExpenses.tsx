import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowDownToLine, CircleHelp, Plus, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { PageHeader } from '@/components/primitives/composition';
import { FinanceToolbar } from '@/components/finance/FinanceToolbar';
import { FinanceOverview } from '@/components/finance/FinanceOverview';
import { IncomeTable } from '@/components/finance/IncomeTable';
import { ExpenseTable } from '@/components/finance/ExpenseTable';
import { TaxSettingsModal } from '@/components/finance/TaxSettingsModal';
import { EmploymentContextPanel } from '@/components/finance/EmploymentContextPanel';
import { useData } from '@/data/DataContext';
import { useRoleAccess } from '@/data/useRoleAccess';
import { formatMoney } from '@/lib/format';
import { toast } from '@/lib/toast';
import * as invoiceApi from '@/data/invoiceApi';
import * as financeApi from '@/data/financeApi';
import * as employmentApi from '@/data/employmentApi';
import { calculateTotals, effectiveIncomeCents, instanceBusinessUseCents, instanceTotalCents, classifyIncome, classifyInstance, fromCents, incomeTaxReserveCents, type Expense, type ExpenseInstance, type FinanceSettings, type IncomeEntry, type Period } from '@/lib/finance';
import type { EmploymentData } from '@/data/employmentApi';

const DISCLAIMER = 'This is a planning estimate based on the rate and records you provide. It is not tax advice or a tax return calculation.';
const today = () => new Date().toISOString().slice(0, 10);
type View = 'overview' | 'income' | 'expenses' | 'w2';

function yearPeriod(year: number, quarter?: number): Period {
  if (!quarter) return { start: `${year}-01-01`, end: `${year}-12-31`, label: 'This Year' };
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = quarter * 3;
  return { start: `${year}-${String(startMonth).padStart(2, '0')}-01`, end: `${year}-${String(endMonth).padStart(2, '0')}-${new Date(year, endMonth, 0).getDate()}`, label: `Q${quarter}` };
}
function defaultSettings(currency: string): FinanceSettings { return { taxRatePct: null, taxYear: new Date().getFullYear(), currency, method: 'accrual', jurisdiction: null }; }

export default function IncomeExpenses() {
  const { workspaceId, clients, loadAllProjects, financialDefaults } = useData();
  const { canViewFinancials, isWorkspaceOwner } = useRoleAccess();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>(((params.get('view') || params.get('tab')) as View) || 'overview');
  const [periodKey, setPeriodKey] = useState(params.get('period') || 'year');
  const [period, setPeriod] = useState<Period>(() => yearPeriod(Number(params.get('year')) || new Date().getFullYear()));
  const [mode, setMode] = useState<'actual' | 'planned'>(params.get('mode') === 'planned' ? 'planned' : 'actual');
  const [settings, setSettings] = useState<FinanceSettings>(defaultSettings(financialDefaults.currency));
  const [income, setIncome] = useState<IncomeEntry[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employmentData, setEmploymentData] = useState<EmploymentData>({ sources: [], paychecks: [], payments: [], otherWithholdingAvailable: 0 });
  const [instances, setInstances] = useState<ExpenseInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(params.get('q') || '');
  const [incomeStatus, setIncomeStatus] = useState(params.get('status') || 'all');
  const [expenseInclusion, setExpenseInclusion] = useState(params.get('inclusion') || 'all');
  const [taxOpen, setTaxOpen] = useState(false);
  const [taxWarningDismissed, setTaxWarningDismissed] = useState(() => localStorage.getItem('aurelo_tax_warning_dismissed') === 'true');
  const [addOpen, setAddOpen] = useState<'income' | 'expense' | null>(null);
  const [editIncome, setEditIncome] = useState<IncomeEntry | null>(null);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sort] = useState<{ key: string; asc: boolean }>({ key: 'date', asc: false });

  const refresh = useCallback(async (initial = false) => {
    if (!workspaceId) return;
    if (initial) setLoading(true); else setSyncing(true);
    setError(null);
    try {
      const [projects, loadedSettings, invoices] = await Promise.all([loadAllProjects(), financeApi.loadFinanceSettings(workspaceId), invoiceApi.loadInvoices()]);
      const synced = await financeApi.syncIncomeSources(workspaceId, clients, projects, invoices, loadedSettings.currency || financialDefaults.currency);
      await financeApi.seedExpenseCategories(workspaceId, loadedSettings.jurisdiction);
      const expenseData = await financeApi.loadExpenseData(workspaceId);
      await financeApi.generateExpenseInstances(workspaceId, expenseData.expenses, period.start, period.end);
      const latestExpenses = await financeApi.loadExpenseData(workspaceId);
      setSettings(loadedSettings); setIncome(synced); setCategories(latestExpenses.categories); setExpenses(latestExpenses.expenses); setInstances(latestExpenses.instances);
      if (isWorkspaceOwner) {
        const currentEmployment = await employmentApi.loadEmploymentData(workspaceId);
        await employmentApi.generatePaychecks(workspaceId, currentEmployment.sources, `${loadedSettings.taxYear}-01-01`, `${loadedSettings.taxYear}-12-31`);
        setEmploymentData(await employmentApi.loadEmploymentData(workspaceId));
      } else {
        setEmploymentData({ sources: [], paychecks: [], payments: [], otherWithholdingAvailable: 0 });
      }
    } catch (e: any) { setError(e?.message || 'Unable to sync finance records.'); } finally { setLoading(false); setSyncing(false); }
  }, [workspaceId, clients, loadAllProjects, period.start, period.end, financialDefaults.currency, isWorkspaceOwner]);

  useEffect(() => { if (workspaceId) void refresh(true); }, [workspaceId]);
  useEffect(() => {
    const handleIncomeSync = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (workspaceId && (!detail?.workspaceId || detail.workspaceId === workspaceId)) void refresh();
    };
    window.addEventListener('finance-income-sync', handleIncomeSync);
    return () => window.removeEventListener('finance-income-sync', handleIncomeSync);
  }, [workspaceId, refresh]);
  useEffect(() => { const next = new URLSearchParams(params); next.set('view', view); next.delete('tab'); next.set('period', periodKey); next.set('mode', mode); if (search) next.set('q', search); else next.delete('q'); if (incomeStatus !== 'all') next.set('status', incomeStatus); else next.delete('status'); if (expenseInclusion !== 'all') next.set('inclusion', expenseInclusion); else next.delete('inclusion'); setParams(next, { replace: true }); }, [view, periodKey, mode, search, incomeStatus, expenseInclusion]);

  const incomeRows = useMemo(() => income.map((entry) => ({ entry, bucket: classifyIncome(entry, { method: settings.method, period, currency: settings.currency, includePlanned: mode === 'planned' }) })).filter((x) => x.bucket === 'actual' || (mode === 'planned' && x.bucket === 'planned') || x.bucket === 'needs_review' || x.bucket === 'currency_mismatch').filter(({ entry }) => incomeStatus === 'all' || entry.status === incomeStatus).filter(({ entry }) => !search || `${entry.payerName} ${entry.description} ${entry.sourceType} ${entry.notes}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => { const dir = sort.asc ? 1 : -1; if (sort.key === 'amount') return dir * (effectiveIncomeCents(a.entry) - effectiveIncomeCents(b.entry)); return dir * String(a.entry.earnedDate || '').localeCompare(String(b.entry.earnedDate || '')); }), [income, settings, period, mode, incomeStatus, search, sort]);
  const expenseRows = useMemo(() => expenses.filter((e) => expenseInclusion === 'all' || e.inclusion === expenseInclusion).filter((e) => !search || `${e.name} ${e.vendor} ${e.notes}`.toLowerCase().includes(search.toLowerCase())).map((expense) => ({ expense, rows: instances.filter((i) => i.expenseId === expense.id).map((instance) => ({ instance, bucket: classifyInstance(instance, expense, { method: settings.method, period, currency: settings.currency, includePlanned: mode === 'planned' }) })).filter((x) => x.bucket === 'actual' || (mode === 'planned' && x.bucket === 'planned') || x.bucket === 'needs_review' || x.bucket === 'needs_amount' || x.bucket === 'currency_mismatch') })).filter(({ rows }) => rows.length > 0 || search), [expenses, instances, expenseInclusion, search, settings, period, mode]);
  const includePlannedTotals = mode === 'planned';
  const actualExpenseRows = expenseRows.flatMap(({ expense, rows }) => rows.filter((r) => r.bucket === 'actual' || (includePlannedTotals && r.bucket === 'planned')).map((r) => ({ expense, instance: r.instance, bucket: 'actual' as const })));
  const incomeBuckets = new Map(income.map((entry) => [entry.id, classifyIncome(entry, { method: settings.method, period, currency: settings.currency, includePlanned: true })]));
  const totals = calculateTotals({ income, incomeBuckets: new Map([...incomeBuckets].filter(([, bucket]) => bucket === 'actual' || bucket === 'planned').map(([id, bucket]) => [id, (includePlannedTotals ? 'actual' : bucket) as 'actual' | 'planned'])), expenses: actualExpenseRows, taxRatePct: settings.taxRatePct });
  const visibleIncomeCents = incomeRows.filter((x) => x.bucket === 'actual' || x.bucket === 'planned').reduce((sum, x) => sum + effectiveIncomeCents(x.entry), 0);
  const visibleProjectedCents = incomeRows.filter((x) => x.bucket === 'planned').reduce((sum, x) => sum + effectiveIncomeCents(x.entry), 0);
  const visibleReserve = incomeRows.filter((x) => x.bucket === 'actual' || x.bucket === 'planned').reduce((sum, x) => sum + (incomeTaxReserveCents(x.entry, settings.taxRatePct) || 0), 0);
  const currencyMismatchCount = incomeRows.filter((x) => x.bucket === 'currency_mismatch').length + expenseRows.flatMap((x) => x.rows).filter((x) => x.bucket === 'currency_mismatch').length;
  const needsReviewCount = incomeRows.filter((x) => x.bucket === 'needs_review' || x.entry.status === 'needs_review').length;
  const needsAmountCount = expenseRows.flatMap((x) => x.rows).filter((x) => x.bucket === 'needs_amount' || x.instance.status === 'needs_amount').length;
  const visibleExpenseInstances = expenseRows.flatMap((x) => x.rows.filter((r) => r.bucket === 'actual' || (mode === 'planned' && r.bucket === 'planned')));
  const visibleGrossExpense = visibleExpenseInstances.reduce((sum, r) => sum + instanceTotalCents(r.instance), 0);
  const visibleBusinessUse = visibleExpenseInstances.reduce((sum, r) => sum + instanceBusinessUseCents(r.instance, expenseRows.find((x) => x.rows.some((y) => y.instance.id === r.instance.id))?.expense || expenses[0]), 0);
  const hasFilters = Boolean(search || incomeStatus !== 'all' || expenseInclusion !== 'all');
  const setPeriodValue = (value: string) => { const year = settings.taxYear || new Date().getFullYear(); setPeriodKey(value); if (value === 'year') setPeriod(yearPeriod(year)); else if (/^q[1-4]$/.test(value)) setPeriod(yearPeriod(year, Number(value.slice(1)))); else if (value === 'custom') setPeriod((p) => ({ ...p, label: 'Custom Range' })); };

  const views: { key: View; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'income', label: 'Income', count: incomeRows.length },
    { key: 'expenses', label: 'Expenses', count: expenseRows.length },
    ...(isWorkspaceOwner ? [{ key: 'w2' as View, label: 'W-2 Context' }] : []),
  ];

  if (!canViewFinancials) return <div className="p-8 text-sm text-muted-foreground">This workspace does not have access to financial records.</div>;

  return <div className="min-w-0 pb-10">
    <PageHeader title="Income & Expenses" subtitle="A planning view of money in, business-use spend, and estimated reserve." actions={<div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => void refresh()} disabled={syncing}><RefreshCw className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing' : 'Sync'}</Button><Button variant="outline" size="sm" onClick={() => exportCsv(view === 'expenses' ? expenseRows.map((x) => x.expense) : incomeRows.map((x) => x.entry), view === 'expenses' ? 'expenses' : 'income')}><ArrowDownToLine /> Export</Button></div>} />
    <main className="space-y-6 px-4 py-5 lg:px-6">
      <FinanceToolbar periodKey={periodKey} onPeriodKey={setPeriodValue} period={period} onPeriod={setPeriod} mode={mode} onMode={setMode} currency={settings.currency} syncing={syncing} onOpenTax={() => setTaxOpen(true)} />

      <div className="flex items-center gap-1 border-b border-[var(--hairline)]">
        {views.map((item) => (
          <button key={item.key} className={`border-b-2 px-3 py-3 text-sm font-medium ${view === item.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} onClick={() => setView(item.key)}>
            {item.label}{item.count != null && <span className="ml-1 text-xs">{item.count}</span>}
          </button>
        ))}
        {(view === 'income' || view === 'expenses') && <div className="ml-auto"><Button size="sm" onClick={() => setAddOpen(view === 'income' ? 'income' : 'expense')}><Plus /> Add {view === 'income' ? 'Income' : 'Expense'}</Button></div>}
      </div>

      {!taxWarningDismissed && <div className="flex items-start gap-2 border-l-2 border-[color:var(--warning)] bg-warning/10 px-3 py-2 text-xs text-muted-foreground"><CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="flex-1">{DISCLAIMER}{currencyMismatchCount > 0 && <strong className="ml-2 font-medium text-[color:var(--warning)]">{currencyMismatchCount} record{currencyMismatchCount === 1 ? '' : 's'} excluded: Currency Mismatch.</strong>}</span><Button variant="ghost" size="sm" className="-my-1 h-7 text-xs" onClick={() => { setTaxWarningDismissed(true); localStorage.setItem('aurelo_tax_warning_dismissed', 'true'); }}>Mark as understood</Button></div>}
      {error && <div className="flex items-center justify-between border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void refresh()}>Try again</Button></div>}

      {loading ? <div className="py-16 text-center text-sm text-muted-foreground">Loading finance records…</div> : view === 'overview' ? (
        <FinanceOverview totals={totals} settings={settings} period={period} mode={mode} expenseRows={expenseRows} categories={categories} attention={{ needsReview: needsReviewCount, needsAmount: needsAmountCount, currencyMismatch: currencyMismatchCount }} onOpenTax={() => setTaxOpen(true)} onNavigate={setView} />
      ) : view === 'w2' ? (
        isWorkspaceOwner ? <EmploymentContextPanel workspaceId={workspaceId} currency={settings.currency} taxYear={settings.taxYear} includePlanned={mode === 'planned'} reserveBeforeOffsetsCents={totals.taxReserveCents} data={employmentData} onRefresh={async () => { await refresh(); }} /> : null
      ) : view === 'income' ? (
        <IncomeTable rows={incomeRows} settings={settings} currency={settings.currency} filtered={hasFilters} search={search} onSearch={setSearch} onClear={() => { setSearch(''); setIncomeStatus('all'); }} onEdit={setEditIncome} onUpdate={async (id: string, patch: any) => { if (!workspaceId) return; const saved = await financeApi.updateIncomeEntry(workspaceId, id, patch); setIncome((prev) => prev.map((e) => e.id === id ? saved : e)); }} onStatus={setIncomeStatus} status={incomeStatus} total={<><strong>{hasFilters ? 'Filtered Total' : 'Total'}</strong> · {incomeRows.length} visible · {formatMoney(fromCents(visibleIncomeCents), { currency: settings.currency })} effective{mode === 'planned' && ` · ${formatMoney(fromCents(visibleProjectedCents), { currency: settings.currency })} planned`} · {settings.taxRatePct == null ? 'Tax reserve needs setup' : `${formatMoney(fromCents(visibleReserve), { currency: settings.currency })} gross reserve`}</>} />
      ) : (
        <ExpenseTable rows={expenseRows} settings={settings} categories={categories} expanded={expanded} setExpanded={setExpanded} filtered={hasFilters} search={search} onSearch={setSearch} onClear={() => { setSearch(''); setExpenseInclusion('all'); }} onInclusion={setExpenseInclusion} inclusion={expenseInclusion} onEdit={setEditExpense} onInstanceUpdate={async (id: string, patch: any) => { if (!workspaceId) return; await financeApi.updateExpenseInstance(workspaceId, id, patch); await refresh(); }} onApplyFuture={async (expense: Expense, instance: ExpenseInstance, amount: number) => { if (!workspaceId) return; await financeApi.applyAmountFromDate(workspaceId, expense.id, instance.incurredDate, amount); await refresh(); toast.success('Amount applied from this occurrence forward'); }} onExpenseUpdate={async (id: string, patch: any) => { if (!workspaceId) return; await financeApi.updateExpense(workspaceId, id, patch); await refresh(); }} onDelete={async (id: string) => { if (!workspaceId || !window.confirm('Delete this expense and preserve no future instances?')) return; await financeApi.removeExpense(workspaceId, id); await refresh(); }} total={<><strong>{hasFilters ? 'Filtered Total' : 'Total'}</strong> · {expenseRows.length} expenses · {visibleExpenseInstances.length} visible instances · {formatMoney(fromCents(visibleGrossExpense), { currency: settings.currency })} gross · {formatMoney(fromCents(visibleBusinessUse), { currency: settings.currency })} business use</>} />
      )}
    </main>
    {taxOpen && <TaxSettingsModal value={settings} onClose={() => setTaxOpen(false)} onSave={async (next) => { if (!workspaceId) return; await financeApi.saveFinanceSettings(workspaceId, next); setSettings(next); toast.success('Tax settings saved'); }} />}
    {addOpen === 'income' && <IncomeModal currency={settings.currency} onClose={() => setAddOpen(null)} onSave={async (input: any) => { if (!workspaceId) return; try { const entry = await financeApi.addManualIncome(workspaceId, input); setIncome((prev) => [entry, ...prev]); setAddOpen(null); toast.success('Income added'); } catch (e: any) { toast.error(e?.message || 'Could not add income'); } }} />}
    {addOpen === 'expense' && <ExpenseModal currency={settings.currency} categories={categories} onClose={() => setAddOpen(null)} onSave={async (input: any) => { if (!workspaceId) return; try { await financeApi.addExpense(workspaceId, input); setAddOpen(null); await refresh(); toast.success('Expense added'); } catch (e: any) { toast.error(e?.message || 'Could not add expense'); } }} />}
    {editIncome && <IncomeModal currency={settings.currency} entry={editIncome} onClose={() => setEditIncome(null)} onSave={async (input: any) => {
      if (!workspaceId) return;
      const target = editIncome;
      try {
        const saved = target.sourceType === 'manual'
          ? await financeApi.updateManualIncome(workspaceId, target.id, input)
          : await financeApi.updateIncomeEntry(workspaceId, target.id, { overrideAmount: input.amount == null || input.amount === target.sourceAmount ? null : input.amount, notes: input.notes, included: input.included });
        setIncome((prev) => prev.map((e) => (e.id === target.id ? saved : e)));
        setEditIncome(null);
        toast.success('Income updated');
      } catch (e: any) {
        toast.error(e?.message || 'Could not update income');
      }
    }} />}
    {editExpense && <ExpenseModal currency={settings.currency} categories={categories} expense={editExpense} onClose={() => setEditExpense(null)} onSave={async (input: any) => { if (!workspaceId) return; try { await financeApi.updateExpense(workspaceId, editExpense.id, input); setEditExpense(null); await refresh(); toast.success('Expense updated'); } catch (e: any) { toast.error(e?.message || 'Could not update expense'); } }} />}
  </div>;
}

function exportCsv(rows: any[], filename: string) { const keys = rows.length ? Object.keys(rows[0]).filter((key) => !['metadata', 'additions'].includes(key)) : []; const csv = [keys.join(','), ...rows.map((row) => keys.map((key) => JSON.stringify(row[key] ?? '')).join(','))].join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${filename}.csv`; link.click(); URL.revokeObjectURL(url); }

function Modal({ title, children, footer, onClose }: any) { return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 p-4"><div className="w-full max-w-lg border border-[var(--hairline)] bg-card shadow-[var(--elev-3)]"><div className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-4"><h2 className="font-semibold">{title}</h2><Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}><X /></Button></div><div className="p-5">{children}</div><div className="flex justify-end gap-2 border-t border-[var(--hairline)] px-5 py-4">{footer}</div></div></div>; }

function IncomeModal({ currency, entry, onClose, onSave }: any) {
  const isManual = !entry || entry.sourceType === 'manual';
  const [form, setForm] = useState<any>(entry
    ? { amount: String(entry.overrideAmount ?? entry.sourceAmount ?? ''), payerName: entry.payerName || '', description: entry.description || '', earnedDate: entry.earnedDate || '', paidDate: entry.paidDate || '', notes: entry.notes || '', included: entry.included !== false }
    : { amount: '', payerName: '', description: '', earnedDate: today(), paidDate: today(), notes: '', included: true });
  const [saving, setSaving] = useState(false);
  const submit = async () => { if (saving) return; setSaving(true); try { await onSave({ ...form, amount: form.amount === '' ? null : Number(form.amount), currency }); } finally { setSaving(false); } };
  return <Modal title={entry ? 'Edit Income' : 'Add Income'} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => void submit()} disabled={saving || (!entry && !form.amount)}>{saving ? 'Saving…' : entry ? 'Save changes' : 'Save income'}</Button></>}>
    <div className="grid gap-4">
      {entry && !isManual && <p className="text-xs text-muted-foreground">This record is synced from a {entry.sourceType}. Source details stay in sync — you can override the amount, add notes, or exclude it from the estimate.</p>}
      <div><Label htmlFor="income-amount">{entry && !isManual ? 'Amount override' : 'Amount'}</Label><Input id="income-amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1.5 bg-[var(--surface-sunken)]" />{entry && !isManual && <p className="mt-1 text-[11px] text-muted-foreground">Source amount {formatMoney(entry.sourceAmount, { currency })}</p>}</div>
      <div><Label htmlFor="income-payer">Payer</Label><Input id="income-payer" value={form.payerName} disabled={!isManual} onChange={(e) => setForm({ ...form, payerName: e.target.value })} className="mt-1.5 bg-[var(--surface-sunken)]" /></div>
      <div><Label htmlFor="income-description">Description</Label><Input id="income-description" value={form.description} disabled={!isManual} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 bg-[var(--surface-sunken)]" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Earned / invoiced date</Label><DatePicker value={form.earnedDate} disabled={!isManual} onChange={(v) => setForm({ ...form, earnedDate: v })} /></div>
        <div><Label>Received date</Label><DatePicker value={form.paidDate} disabled={!isManual} onChange={(v) => setForm({ ...form, paidDate: v })} /></div>
      </div>
      {entry && <div><Label>Include in estimate</Label><select value={form.included ? 'included' : 'excluded'} onChange={(e) => setForm({ ...form, included: e.target.value === 'included' })} className="mt-1.5 h-10 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface-sunken)] px-3 text-sm"><option value="included">Included</option><option value="excluded">Excluded</option></select></div>}
      <div><Label>Notes</Label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5 min-h-20 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface-sunken)] p-2 text-sm" /></div>
    </div>
  </Modal>;
}
function ExpenseModal({ currency, categories, expense, onClose, onSave }: any) {
  const [clientRequestId] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState<any>(expense
    ? { name: expense.name || '', vendor: expense.vendor || '', categoryId: expense.categoryId || '', recurrence: expense.recurrence, amountBehavior: expense.amountBehavior, baseAmount: expense.baseAmount == null ? '' : String(expense.baseAmount), businessUsePct: expense.businessUsePct ?? 100, startDate: expense.startDate || today(), endDate: expense.endDate || '', inclusion: expense.inclusion || 'included', notes: expense.notes || '' }
    : { name: '', vendor: '', categoryId: categories[0]?.id || '', recurrence: 'one_time', amountBehavior: 'fixed', baseAmount: '', businessUsePct: 100, startDate: today(), endDate: '', inclusion: 'included', notes: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!expense && !form.categoryId && categories[0]?.id) setForm((current: any) => ({ ...current, categoryId: categories[0].id }));
  }, [categories, form.categoryId, expense]);
  const submit = async () => { if (saving || !form.name.trim()) return; setSaving(true); try { await onSave({ ...form, name: form.name.trim(), clientRequestId, baseAmount: form.baseAmount === '' ? null : Number(form.baseAmount), currency }); } finally { setSaving(false); } };
  return <Modal title={expense ? 'Edit Expense' : 'Add Expense'} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => void submit()} disabled={!form.name || saving}>{saving ? 'Saving…' : expense ? 'Save changes' : 'Save expense'}</Button></>}><div className="grid gap-4">{expense && <p className="text-xs text-muted-foreground">Changing the schedule or amount regenerates future occurrences. Confirmed history is never changed.</p>}<div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 bg-[var(--surface-sunken)]" placeholder="e.g. Creative Cloud" /></div><div className="grid grid-cols-2 gap-3"><div><Label>Vendor</Label><Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="mt-1.5 bg-[var(--surface-sunken)]" /></div><div><Label>Category</Label><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface-sunken)] px-3 text-sm"><option value="">No category — Needs Review</option>{categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Recurrence</Label><select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface-sunken)] px-3 text-sm"><option value="one_time">One-Time</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option><option value="custom">Custom interval</option></select></div><div><Label>Amount behavior</Label><select value={form.amountBehavior} onChange={(e) => setForm({ ...form, amountBehavior: e.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface-sunken)] px-3 text-sm"><option value="fixed">Fixed</option><option value="variable">Variable</option><option value="base_plus">Base + Additions</option></select></div></div><div className="grid grid-cols-2 gap-3"><div><Label>{form.amountBehavior === 'variable' ? 'Expected amount (optional)' : 'Amount'}</Label><Input type="number" value={form.baseAmount} onChange={(e) => setForm({ ...form, baseAmount: e.target.value })} className="mt-1.5 bg-[var(--surface-sunken)]" /></div><div><Label>Business use (%)</Label><Input type="number" min="0" max="100" value={form.businessUsePct} onChange={(e) => setForm({ ...form, businessUsePct: Number(e.target.value) })} className="mt-1.5 bg-[var(--surface-sunken)]" /></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Start date</Label><DatePicker value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} /></div><div><Label>End date (optional)</Label><DatePicker value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} /></div></div><div><Label>Include in estimate</Label><select value={form.inclusion} onChange={(e) => setForm({ ...form, inclusion: e.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface-sunken)] px-3 text-sm"><option value="included">Included</option><option value="excluded">Excluded</option><option value="needs_review">Needs Review</option></select></div><div><Label>Notes</Label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5 min-h-20 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface-sunken)] p-2 text-sm" /></div></div></Modal>;
}

