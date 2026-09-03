import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { formatMoney, formatPercent } from '@/lib/format';
import { fromCents, instanceBusinessUseCents } from '@/lib/finance';

const SLICE = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.72)',
  'hsl(var(--primary) / 0.5)',
  'hsl(var(--primary) / 0.34)',
  'var(--warning)',
  'hsl(var(--muted-foreground) / 0.45)',
];

export interface OverviewProps {
  totals: { incomeCents: number; grossExpensesCents: number; businessUseExpensesCents: number; taxReserveCents: number; availableCents: number };
  settings: { currency: string; taxRatePct: number | null; method: string };
  period: { label: string; start: string; end: string };
  mode: 'actual' | 'planned';
  expenseRows: any[];
  categories: { id: string; name: string }[];
  attention: { needsReview: number; needsAmount: number; currencyMismatch: number };
  onOpenTax: () => void;
  onNavigate: (view: 'income' | 'expenses') => void;
}

export function FinanceOverview({ totals, settings, period, mode, expenseRows, categories, attention, onOpenTax, onNavigate }: OverviewProps) {
  const [taxOpen, setTaxOpen] = useState(false);
  const currency = settings.currency;
  const planned = mode === 'planned';

  const mix = useMemo(() => {
    const byCategory = new Map<string, number>();
    expenseRows.forEach(({ expense, rows }: any) => {
      const included = rows.filter((r: any) => r.bucket === 'actual' || (planned && r.bucket === 'planned'));
      const cents = included.reduce((sum: number, r: any) => sum + instanceBusinessUseCents(r.instance, expense), 0);
      if (cents <= 0) return;
      const name = categories.find((c) => c.id === expense.categoryId)?.name || 'Uncategorized';
      byCategory.set(name, (byCategory.get(name) || 0) + cents);
    });
    const sorted = [...byCategory.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents);
    if (sorted.length <= 6) return sorted;
    const head = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((sum, item) => sum + item.cents, 0);
    return [...head, { name: 'Other', cents: rest }];
  }, [expenseRows, categories, planned]);

  const mixTotal = mix.reduce((sum, slice) => sum + slice.cents, 0);

  return (
    <section className="space-y-5">
      <div className="text-xs text-muted-foreground">
        Showing <strong className="text-foreground">{period.label}</strong> ({period.start} – {period.end}) · <strong className="text-foreground">{planned ? 'Actual + Planned' : 'Actual only'}</strong> · recognized by {settings.method === 'cash' ? 'payment date (cash)' : 'earned / incurred date (accrual)'}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Metric
          label={planned ? 'Income (incl. planned)' : 'Income'}
          value={formatMoney(fromCents(totals.incomeCents), { currency })}
          onClick={() => onNavigate('income')}
          cta="View income"
        />
        <Metric
          label={planned ? 'Business-use expenses (incl. planned)' : 'Business-use expenses'}
          value={formatMoney(fromCents(totals.businessUseExpensesCents), { currency })}
          hint={`${formatMoney(fromCents(totals.grossExpensesCents), { currency })} gross`}
          onClick={() => onNavigate('expenses')}
          cta="View expenses"
        />
        <div className="border border-[var(--hairline)] bg-card p-4">
          <div className="type-eyebrow">Expense mix</div>
          {mixTotal > 0 ? (
            <div className="mt-2 flex items-center gap-3">
              <div className="h-[132px] w-[132px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mix} dataKey="cents" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={1.5} stroke="var(--card)" strokeWidth={1.5}>
                      {mix.map((slice, index) => <Cell key={slice.name} fill={SLICE[index % SLICE.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--hairline)', borderRadius: 4, fontSize: 12 }}
                      formatter={(value: any, name: any) => [formatMoney(fromCents(Number(value)), { currency }), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-0 flex-1 space-y-1">
                {mix.slice(0, 5).map((slice, index) => (
                  <li key={slice.name} className="flex items-center gap-2 text-[12px]">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SLICE[index % SLICE.length] }} />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{slice.name}</span>
                    <span className="tabular-nums">{formatPercent(slice.cents / mixTotal)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No categorized business-use spend in this period yet.</p>
          )}
        </div>
      </div>

      <Comparison incomeCents={totals.incomeCents} expenseCents={totals.grossExpensesCents} currency={currency} />

      <div className="border border-[var(--hairline)] bg-card">
        <button className="flex w-full items-center gap-2 px-4 py-3 text-sm" onClick={() => setTaxOpen((v) => !v)}>
          {taxOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium">Estimated profit &amp; tax reserve</span>
          <span className="ml-auto tabular-nums text-muted-foreground">
            {formatMoney(fromCents(totals.incomeCents - totals.businessUseExpensesCents), { currency })} estimated profit
          </span>
        </button>
        {taxOpen && (
          <div className="grid gap-4 border-t border-[var(--hairline)] px-4 py-4 sm:grid-cols-3">
            <Detail label="Estimated profit" value={formatMoney(fromCents(totals.incomeCents - totals.businessUseExpensesCents), { currency })} />
            <Detail
              label="Estimated tax reserve"
              tone="warning"
              value={settings.taxRatePct == null ? null : formatMoney(fromCents(totals.taxReserveCents), { currency })}
              onSet={onOpenTax}
            />
            <Detail label="Available after reserve" value={formatMoney(fromCents(totals.availableCents), { currency })} />
          </div>
        )}
      </div>

      {(attention.needsReview > 0 || attention.needsAmount > 0 || attention.currencyMismatch > 0) && (
        <div className="flex flex-wrap items-center gap-2 border border-[var(--hairline)] bg-card px-4 py-3 text-xs">
          <span className="type-eyebrow">Needs attention</span>
          {attention.needsReview > 0 && <AttentionLink label={`${attention.needsReview} needs review`} onClick={() => onNavigate('income')} />}
          {attention.needsAmount > 0 && <AttentionLink label={`${attention.needsAmount} missing amounts`} onClick={() => onNavigate('expenses')} />}
          {attention.currencyMismatch > 0 && <AttentionLink label={`${attention.currencyMismatch} currency mismatch`} onClick={() => onNavigate('income')} />}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, hint, cta, onClick }: { label: string; value: string; hint?: string; cta: string; onClick: () => void }) {
  return (
    <div className="flex flex-col border border-[var(--hairline)] bg-card p-4">
      <div className="type-eyebrow">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">{hint}</div>}
      <Button variant="ghost" size="sm" className="mt-auto w-fit px-0 text-xs" onClick={onClick}>{cta} <ArrowRight /></Button>
    </div>
  );
}

function Detail({ label, value, tone, onSet }: { label: string; value: string | null; tone?: 'warning'; onSet?: () => void }) {
  return (
    <div>
      <div className="type-eyebrow">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${tone === 'warning' ? 'text-[color:var(--warning)]' : ''}`}>
        {value == null ? <button className="text-xs font-medium text-primary hover:underline" onClick={onSet}>Set tax rate</button> : `~${value}`}
      </div>
    </div>
  );
}

function AttentionLink({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="rounded-[3px] border border-[color:var(--warning)]/40 bg-warning/10 px-2 py-1 text-[color:var(--warning)] hover:bg-warning/20" onClick={onClick}>{label}</button>;
}

function Comparison({ incomeCents, expenseCents, currency }: { incomeCents: number; expenseCents: number; currency: string }) {
  const scale = Math.max(incomeCents, expenseCents, 0);
  const pct = (value: number) => (scale > 0 ? Math.max(0, Math.min(100, (value / scale) * 100)) : 0);
  const rows = [
    { label: 'Income', cents: incomeCents, fill: 'bg-primary', note: undefined as string | undefined },
    { label: 'Gross expenses', cents: expenseCents, fill: 'bg-[color:var(--warning)]', note: incomeCents > 0 ? `${formatPercent(expenseCents / incomeCents)} of income` : undefined },
  ];
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3 text-xs">
          <span className="w-28 shrink-0 text-muted-foreground">{row.label}</span>
          <div className="h-2 flex-1 bg-[var(--surface-sunken)]">
            <motion.div className={`h-full ${row.fill}`} initial={false} animate={{ width: `${pct(row.cents)}%` }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} />
          </div>
          <span className="w-24 shrink-0 text-right font-medium tabular-nums text-foreground">{formatMoney(fromCents(row.cents), { currency })}</span>
          <span className="w-24 shrink-0 text-right text-muted-foreground">{row.note || ''}</span>
        </div>
      ))}
      {expenseCents > incomeCents && scale > 0 && <div className="text-xs text-[color:var(--warning)]">Expenses exceed income in this period.</div>}
    </div>
  );
}
