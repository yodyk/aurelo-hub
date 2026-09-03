import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/primitives/EmptyState';
import { NumericCell } from '@/components/primitives/NumericCell';
import { FinanceTableShell, MONEY_CELL } from './FinanceTable';
import { ColumnChooser } from './ColumnChooser';
import { useColumnPrefs, labelMinWidth, type ColumnDef } from './columnPrefs';
import { FinanceModal, InlineNote, InlineNumber, MetaChip, StatusDot, ToneRail, type RowTone } from './FinanceModal';
import { formatDate, formatMoney, formatPercent } from '@/lib/format';
import { fromCents, instanceBusinessUseCents, instanceTotalCents, type Expense, type ExpenseInstance } from '@/lib/finance';

const today = () => new Date().toISOString().slice(0, 10);
function statusLabel(status: string) {
  return status === 'needs_review' ? 'Needs Review' : status === 'needs_amount' ? 'Needs Amount' : status.charAt(0).toUpperCase() + status.slice(1);
}
function instanceTone(status: string, bucket: string): RowTone {
  if (status === 'confirmed') return 'paid';
  if (status === 'needs_amount' || bucket === 'needs_review' || bucket === 'currency_mismatch') return 'attention';
  if (bucket === 'planned' || status === 'scheduled') return 'planned';
  return 'neutral';
}
function expenseTone(expense: Expense, rows: any[]): RowTone {
  if (expense.inclusion === 'needs_review' || rows.some((r) => r.instance.status === 'needs_amount')) return 'attention';
  if (rows.length && rows.every((r) => r.instance.status === 'confirmed')) return 'paid';
  if (rows.some((r) => r.bucket === 'planned')) return 'planned';
  return 'neutral';
}

const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Expense', minWidth: 280, locked: true },
  { key: 'vendor', label: 'Vendor', minWidth: labelMinWidth('Vendor', 60), defaultOn: true },
  { key: 'category', label: 'Category', minWidth: labelMinWidth('Category', 30), defaultOn: true },
  { key: 'behavior', label: 'Behavior', minWidth: labelMinWidth('Behavior', 20) },
  { key: 'frequency', label: 'Frequency', minWidth: labelMinWidth('Frequency', 20), defaultOn: true },
  { key: 'businessUsePct', label: 'Business use', minWidth: labelMinWidth('Business use'), numeric: true },
  { key: 'instances', label: 'Instances', minWidth: labelMinWidth('Instances'), numeric: true, defaultOn: true },
  { key: 'gross', label: 'Gross total', minWidth: labelMinWidth('Gross total'), numeric: true },
  { key: 'businessTotal', label: 'Business-use total', minWidth: labelMinWidth('Business-use total'), numeric: true, defaultOn: true },
  { key: 'reserveReduction', label: 'Reserve reduction', minWidth: labelMinWidth('Reserve reduction'), numeric: true },
  { key: 'notes', label: 'Notes', minWidth: labelMinWidth('Notes', 60) },
];

export function ExpenseTable({ rows, settings, categories, expanded, setExpanded, filtered, search, onSearch, onClear, onInclusion, inclusion, onEdit, onInstanceUpdate, onApplyFuture, onExpenseUpdate, onDelete, total, actions }: any) {
  const cols = useMemo(() => COLUMNS, []);
  const { visible, shown, toggle, reset } = useColumnPrefs('aurelo_finance_cols_expenses', cols);
  return (
    <FinanceTableShell
      total={total}
      filtered={filtered}
      search={search}
      onSearch={onSearch}
      onClear={onClear}
      toolbar={
        <>
          <select aria-label="Expense inclusion filter" value={inclusion} onChange={(e) => onInclusion(e.target.value)} className="h-9 rounded-md border border-[var(--hairline)] bg-[var(--surface-sunken)] px-2 text-xs">
            <option value="all">All inclusion states</option>
            <option value="included">Included</option>
            <option value="excluded">Excluded</option>
            <option value="needs_review">Needs Review</option>
          </select>
          <ColumnChooser columns={cols} visible={visible} onToggle={toggle} onReset={reset} />
          {actions}
        </>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            {shown.map((c) => (
              <TableHead key={c.key} numeric={c.numeric} className={`whitespace-nowrap ${c.numeric ? MONEY_CELL : ''}`} style={{ minWidth: c.minWidth }}>{c.label}</TableHead>
            ))}
            <TableHead className="w-[92px]"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? rows.map(({ expense, rows: instanceRows }: any) => {
            const isOpen = expanded.has(expense.id);
            const gross = instanceRows.reduce((n: number, r: any) => n + instanceTotalCents(r.instance), 0);
            const business = instanceRows.reduce((n: number, r: any) => n + instanceBusinessUseCents(r.instance, expense), 0);
            const tone = expenseTone(expense, instanceRows);
            const cell: Record<string, React.ReactNode> = {
              name: (
                <button className="flex items-center gap-2 font-medium" onClick={() => setExpanded((prev: Set<string>) => { const next = new Set(prev); if (next.has(expense.id)) next.delete(expense.id); else next.add(expense.id); return next; })}>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="whitespace-nowrap">{expense.name}</span>
                </button>
              ),
              vendor: expense.vendor || '—',
              category: <MetaChip>{categories.find((c: any) => c.id === expense.categoryId)?.name || 'Needs Review'}</MetaChip>,
              behavior: <MetaChip>{expense.amountBehavior.replace('_', ' + ')}</MetaChip>,
              frequency: <MetaChip>{expense.recurrence.replace('_', ' ')}</MetaChip>,
              businessUsePct: formatPercent(expense.businessUsePct / 100),
              instances: instanceRows.length,
              gross: <NumericCell value={formatMoney(fromCents(gross), { currency: expense.currency })} />,
              businessTotal: <NumericCell value={formatMoney(fromCents(business), { currency: expense.currency })} />,
              reserveReduction: settings.taxRatePct == null ? '—' : formatMoney(fromCents(Math.max(0, Math.round((business * settings.taxRatePct) / 100))), { currency: expense.currency }),
              notes: <InlineNote value={expense.notes || ''} onSave={(notes) => onExpenseUpdate(expense.id, { notes })} />,
            };
            return (
              <>
                <TableRow key={expense.id} className={isOpen ? 'border-b-0' : ''}>
                  {shown.map((c: ColumnDef, index: number) => (
                    <TableCell key={c.key} numeric={c.numeric} className={`${index === 0 ? 'relative' : ''} ${c.numeric ? MONEY_CELL : ''} ${c.key === 'vendor' ? 'whitespace-nowrap text-muted-foreground' : ''}`} style={{ minWidth: c.minWidth }}>
                      {index === 0 && <ToneRail tone={tone} />}
                      {cell[c.key]}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${expense.name}`} onClick={() => onEdit(expense)}><Pencil /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${expense.name}`} onClick={() => void onDelete(expense.id)}><Trash2 /></Button>
                    </div>
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow key={`${expense.id}-instances`} className="hover:bg-transparent">
                    <TableCell colSpan={shown.length + 1} className="bg-[var(--surface-sunken)] p-0">
                      <InstanceList expense={expense} rows={instanceRows} settings={settings} onUpdate={onInstanceUpdate} onApplyFuture={onApplyFuture} />
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          }) : (
            <TableRow>
              <TableCell colSpan={shown.length + 1}>
                <EmptyState title="No expenses in this view" description="Add a one-time or recurring expense to start tracking business-use spend." />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </FinanceTableShell>
  );
}

function InstanceList({ expense, rows, settings, onUpdate, onApplyFuture }: { expense: Expense; rows: any[]; settings: any; onUpdate: (id: string, patch: any) => void; onApplyFuture: (expense: Expense, instance: ExpenseInstance, amount: number) => void }) {
  const [pending, setPending] = useState<{ instance: any; amount: number } | null>(null);
  const singlePatch = (instance: any, amount: number) => (instance.incurredDate <= today() ? { baseAmount: amount, status: 'confirmed' } : { baseAmount: amount });
  const saveAmount = (instance: any, value: string) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return;
    if (expense.recurrence !== 'one_time' && instance.generated) { setPending({ instance, amount }); return; }
    onUpdate(instance.id, singlePatch(instance, amount));
  };
  return (
    <div className="px-4 py-3">
      <div className="mb-2 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">Occurrences in this period</div>
      <div className="divide-y divide-[var(--hairline)] border border-[var(--hairline)] bg-card">
        <div className="grid grid-cols-[180px_150px_120px_110px_130px_1fr] gap-3 px-3 py-2 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
          <span>Date</span><span>Status</span><span className="text-right">Amount</span><span className="text-right">Business use</span><span className="text-right">Business total</span><span>Note</span>
        </div>
        {rows.map(({ instance, bucket }: any) => (
          <div key={instance.id} className="grid grid-cols-[180px_150px_120px_110px_130px_1fr] items-center gap-3 px-3 py-2 text-[13px]">
            <span className="whitespace-nowrap text-muted-foreground">{settings.method === 'cash' ? (instance.paidDate ? `${formatDate(instance.paidDate, 'medium')} · paid` : 'Needs Review') : `${formatDate(instance.incurredDate, 'medium')} · incurred`}</span>
            <StatusDot tone={instanceTone(instance.status, bucket)} label={`${statusLabel(instance.status)}${bucket === 'planned' ? ' · Planned' : ''}`} />
            <span className="text-right"><InlineNumber value={instance.baseAmount ?? ''} onSave={(value) => saveAmount(instance, value)} /></span>
            <span className="text-right"><InlineNumber value={instance.businessUsePct ?? expense.businessUsePct} suffix="%" onSave={(value) => onUpdate(instance.id, { businessUsePct: Number(value) })} /></span>
            <span className="text-right tabular-nums">{formatMoney(fromCents(instanceBusinessUseCents(instance, expense)), { currency: expense.currency })}</span>
            <span><InlineNote value={instance.notes || ''} onSave={(notes) => onUpdate(instance.id, { notes })} /></span>
          </div>
        ))}
      </div>
      {pending && (
        <FinanceModal
          title="Update recurring amount"
          onClose={() => setPending(null)}
          footer={<>
            <Button variant="outline" onClick={() => { const { instance, amount } = pending; setPending(null); onUpdate(instance.id, singlePatch(instance, amount)); }}>Just this {expense.recurrence === 'monthly' ? 'month' : 'occurrence'}</Button>
            <Button onClick={() => { const { instance, amount } = pending; setPending(null); onApplyFuture(expense, instance, amount); }}>This &amp; future</Button>
          </>}
        >
          <p className="text-sm text-muted-foreground">
            Set <strong className="text-foreground">{expense.name}</strong> to <strong className="tabular-nums text-foreground">{formatMoney(pending.amount, { currency: expense.currency })}</strong> starting {formatDate(pending.instance.incurredDate, 'medium')}. Use "This &amp; future" for price changes — e.g. a plan that was $43 through February and $75 from March onward. Confirmed history is never changed.
          </p>
        </FinanceModal>
      )}
    </div>
  );
}
