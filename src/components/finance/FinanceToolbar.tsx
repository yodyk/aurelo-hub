import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import type { Period } from '@/lib/finance';

export function FinanceToolbar({ periodKey, onPeriodKey, period, onPeriod, mode, onMode, currency, syncing, onOpenTax }: {
  periodKey: string;
  onPeriodKey: (value: string) => void;
  period: Period;
  onPeriod: (period: Period) => void;
  mode: 'actual' | 'planned';
  onMode: (mode: 'actual' | 'planned') => void;
  currency: string;
  syncing: boolean;
  onOpenTax: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--hairline)] pb-4">
      <select aria-label="Period" value={periodKey} onChange={(e) => onPeriodKey(e.target.value)} className="h-9 rounded-md border border-[var(--hairline)] bg-[var(--surface-sunken)] px-3 text-sm">
        <option value="year">This Year</option>
        <option value="q1">Q1</option>
        <option value="q2">Q2</option>
        <option value="q3">Q3</option>
        <option value="q4">Q4</option>
        <option value="custom">Custom Range</option>
      </select>
      {periodKey === 'custom' && (
        <>
          <DatePicker value={period.start} onChange={(v) => onPeriod({ ...period, start: v || period.start })} />
          <DatePicker value={period.end} onChange={(v) => onPeriod({ ...period, end: v || period.end })} />
        </>
      )}
      <div className="flex h-9 overflow-hidden rounded-md border border-[var(--hairline)]">
        <button className={`px-3 text-xs ${mode === 'actual' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`} onClick={() => onMode('actual')}>Actual</button>
        <button className={`border-l border-[var(--hairline)] px-3 text-xs ${mode === 'planned' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`} onClick={() => onMode('planned')}>Actual + Planned</button>
      </div>
      <span className="text-xs text-muted-foreground">Currency: <strong className="text-foreground">{currency}</strong></span>
      <span className="ml-auto text-xs text-muted-foreground">{syncing ? 'Syncing…' : 'Synced to workspace records'}</span>
      <Button variant="outline" size="sm" onClick={onOpenTax}><Settings2 /> Tax Estimate Settings</Button>
    </div>
  );
}
