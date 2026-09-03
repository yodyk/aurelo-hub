import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function FinanceModal({ title, children, footer, onClose }: { title: ReactNode; children: ReactNode; footer?: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 p-4">
      <div className="w-full max-w-lg border border-[var(--hairline)] bg-card shadow-[var(--elev-3)]">
        <div className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-4">
          <h2 className="font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}><X /></Button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[var(--hairline)] px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function InlineNote({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing)
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); onSave(draft); }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { setEditing(false); onSave(draft); }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="min-h-8 w-36 resize-y rounded-md border border-[var(--hairline)] bg-[var(--surface-sunken)] p-2 text-xs"
      />
    );
  return (
    <button className="max-w-36 truncate text-left text-xs text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
      {value || 'Add note'}
    </button>
  );
}

export function InlineNumber({ value, suffix = '', onSave }: { value: any; suffix?: string; onSave: (value: string) => void }) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(String(value));
  if (edit)
    return (
      <Input
        autoFocus
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { setEdit(false); onSave(draft); } if (e.key === 'Escape') setEdit(false); }}
        onBlur={() => { setEdit(false); onSave(draft); }}
        className="ml-auto w-24 bg-card text-right"
      />
    );
  return (
    <button className="tabular-nums hover:text-primary" onClick={() => setEdit(true)}>
      {value === '' || value == null ? <span className="text-[color:var(--warning)]">Needs Amount</span> : `${value}${suffix}`}
    </button>
  );
}

/** Quiet outlined metadata chip — reads as a label, never as a value. */
export function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-[3px] border border-[var(--hairline)] px-1.5 py-0.5 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}

export type RowTone = 'paid' | 'planned' | 'attention' | 'neutral';

const RAIL: Record<RowTone, string> = {
  paid: 'bg-[color:var(--success)]',
  planned: 'bg-primary',
  attention: 'bg-[color:var(--warning)]',
  neutral: 'bg-[var(--hairline)]',
};

const DOT: Record<RowTone, string> = {
  paid: 'bg-[color:var(--success)]',
  planned: 'bg-primary',
  attention: 'bg-[color:var(--warning)]',
  neutral: 'bg-muted-foreground/50',
};

export function ToneRail({ tone }: { tone: RowTone }) {
  return <span aria-hidden className={`absolute left-0 top-0 h-full w-[2px] ${RAIL[tone]}`} />;
}

export function StatusDot({ tone, label }: { tone: RowTone; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px]">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone]}`} />
      {label}
    </span>
  );
}
