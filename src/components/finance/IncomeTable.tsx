import { useMemo, useState } from 'react';
import { Filter, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/primitives/EmptyState';
import { FinanceTableShell, MONEY_CELL } from './FinanceTable';
import { ColumnChooser } from './ColumnChooser';
import { useColumnPrefs, labelMinWidth, type ColumnDef } from './columnPrefs';
import { InlineNote, MetaChip, StatusDot, ToneRail, type RowTone } from './FinanceModal';
import { formatDate, formatMoney } from '@/lib/format';
import { fromCents, incomeTaxReserveCents } from '@/lib/finance';

function statusLabel(status: string) {
  return status === 'needs_review' ? 'Needs Review' : status.charAt(0).toUpperCase() + status.slice(1);
}

function rowTone(status: string, bucket: string): RowTone {
  if (bucket === 'planned' || status === 'projected') return 'planned';
  if (status === 'paid') return 'paid';
  if (status === 'needs_review' || bucket === 'needs_review' || bucket === 'currency_mismatch') return 'attention';
  return 'neutral';
}

const columns = (method: string): ColumnDef[] => [
  { key: 'date', label: method === 'cash' ? 'Date (received)' : 'Date (earned)', minWidth: labelMinWidth(method === 'cash' ? 'Date (received)' : 'Date (earned)'), defaultOn: true },
  { key: 'source', label: 'Source', minWidth: 260, locked: true },
  { key: 'payer', label: 'Client / Payer', minWidth: labelMinWidth('Client / Payer', 40), defaultOn: true },
  { key: 'type', label: 'Type', minWidth: labelMinWidth('Type') },
  { key: 'status', label: 'Status', minWidth: labelMinWidth('Status', 20), defaultOn: true },
  { key: 'amount', label: 'Amount', minWidth: labelMinWidth('Amount', 30), numeric: true, defaultOn: true },
  { key: 'reserve', label: 'Tax reserve', minWidth: labelMinWidth('Tax reserve'), numeric: true },
  { key: 'notes', label: 'Notes', minWidth: labelMinWidth('Notes', 60) },
];

export function IncomeTable({ rows, settings, currency, filtered, search, onSearch, onClear, onUpdate, onStatus, status, total, onEdit, actions }: any) {
  const cols = useMemo(() => columns(settings.method), [settings.method]);
  const { visible, shown, toggle, reset } = useColumnPrefs('aurelo_finance_cols_income', cols);
  let lastMonth = '';
  return (
    <FinanceTableShell
      total={total}
      filtered={filtered}
      search={search}
      onSearch={onSearch}
      onClear={onClear}
      toolbar={
        <>
          <select aria-label="Income status filter" value={status} onChange={(e) => onStatus(e.target.value)} className="h-9 rounded-md border border-[var(--hairline)] bg-[var(--surface-sunken)] px-2 text-xs">
            <option value="all">All statuses</option>
            <option value="projected">Projected</option>
            <option value="invoiced">Invoiced</option>
            <option value="paid">Paid</option>
            <option value="needs_review">Needs Review</option>
            <option value="excluded">Excluded</option>
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
          {rows.length ? rows.map(({ entry, bucket }: any) => {
            const date = settings.method === 'cash' ? entry.paidDate : entry.earnedDate;
            const month = (date || '').slice(0, 7);
            const newMonth = month && month !== lastMonth;
            if (month) lastMonth = month;
            return <IncomeRow key={entry.id} entry={entry} bucket={bucket} settings={settings} currency={currency} onUpdate={onUpdate} onEdit={onEdit} shown={shown} groupBreak={newMonth} />;
          }) : (
            <TableRow>
              <TableCell colSpan={shown.length + 1}>
                <EmptyState title="No income records in this view" description="Try another period or add a manual income record." action={<Button onClick={() => onSearch('')}>Clear search</Button>} />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </FinanceTableShell>
  );
}

function IncomeRow({ entry, bucket, settings, currency, onUpdate, onEdit, shown, groupBreak }: any) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(entry.overrideAmount ?? entry.sourceAmount);
  const date = settings.method === 'cash' ? entry.paidDate : entry.earnedDate;
  const reserve = incomeTaxReserveCents(entry, settings.taxRatePct);
  const tone = rowTone(entry.status, bucket);
  const save = async () => {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    setEditing(false);
    await onUpdate(entry.id, { overrideAmount: n === entry.sourceAmount ? null : n });
  };

  const cell: Record<string, React.ReactNode> = {
    date: date ? formatDate(date, 'medium') : <span className="text-[color:var(--warning)]">Needs Review</span>,
    source: (
      <>
        <div className="whitespace-nowrap font-medium text-foreground">{entry.description || 'Income entry'}</div>
        <div className="whitespace-nowrap text-xs text-muted-foreground">
          {entry.sourceType === 'invoice' ? `Invoice ${entry.metadata?.invoiceNumber ? `#${entry.metadata.invoiceNumber}` : ''}` : entry.sourceType}
          {entry.sourceState !== 'active' && ` · Source ${entry.sourceState}`}
        </div>
      </>
    ),
    payer: entry.payerName || '—',
    type: <MetaChip>{String(entry.sourceType).replace('_', ' ')}</MetaChip>,
    status: (
      <>
        <StatusDot tone={tone} label={bucket === 'planned' ? 'Projected' : statusLabel(entry.status)} />
        {entry.currency !== currency && <div className="text-[11px] text-[color:var(--warning)]">Currency Mismatch</div>}
      </>
    ),
    amount: (
      <>
        {editing ? (
          <Input autoFocus type="number" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setEditing(false); }} onBlur={() => void save()} className="ml-auto w-28 bg-card text-right" />
        ) : (
          <button className="text-right font-medium tabular-nums hover:text-primary" onClick={() => setEditing(true)}>{formatMoney(entry.overrideAmount ?? entry.sourceAmount, { currency })}</button>
        )}
        {entry.overrideAmount != null && <div className="text-right text-[10px] text-primary">Overridden · source {formatMoney(entry.sourceAmount, { currency })}</div>}
      </>
    ),
    reserve: settings.taxRatePct == null ? '—' : formatMoney(fromCents(reserve || 0), { currency }),
    notes: <InlineNote value={entry.notes || ''} onSave={(notes: string) => onUpdate(entry.id, { notes })} />,
  };

  return (
    <TableRow className={groupBreak ? 'border-t-2 border-t-[var(--hairline)]' : ''}>
      {shown.map((c: ColumnDef, index: number) => (
        <TableCell
          key={c.key}
          numeric={c.numeric}
          className={`${index === 0 ? 'relative' : ''} ${c.numeric ? MONEY_CELL : ''} ${c.key === 'date' || c.key === 'payer' ? 'whitespace-nowrap text-muted-foreground' : ''}`}
          style={{ minWidth: c.minWidth }}
        >
          {index === 0 && <ToneRail tone={tone} />}
          {cell[c.key]}
        </TableCell>
      ))}
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label={`Edit ${entry.description || 'income'}`} onClick={() => onEdit(entry)}><Pencil /></Button>
          <Button variant="ghost" size="icon" aria-label={entry.included ? 'Exclude income' : 'Include income'} onClick={() => void onUpdate(entry.id, { included: !entry.included })}>{entry.included ? <Filter /> : <X />}</Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
