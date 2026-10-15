import { useRef, useState } from 'react';
import { ExternalLink, FileText, Paperclip, Plus, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import * as financeApi from '@/data/financeApi';
import type { ExpenseReceipt, ExpenseRecord } from '@/lib/finance';

const QUICK_LABELS = ['Order #', 'Invoice #', 'Receipt link', 'Payment method', 'Account', 'Purpose'];
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'image/*,application/pdf,.heic';
const isUrl = (v: string) => /^https?:\/\/\S+$/i.test(v.trim());
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function ReceiptsField({ receipts, pending, setPending, onRemoveExisting }: {
  receipts: ExpenseReceipt[]; pending: File[]; setPending: (f: File[]) => void; onRemoveExisting?: (r: ExpenseReceipt) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const add = (list: FileList | null) => {
    if (!list) return;
    const ok: File[] = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX_BYTES) { toast.error(`${f.name} is over 10 MB`); continue; }
      ok.push(f);
    }
    setPending([...pending, ...ok]);
  };
  const open = async (r: ExpenseReceipt) => {
    try { window.open(await financeApi.receiptUrl(r.path), '_blank', 'noopener'); } catch { toast.error('Could not open receipt'); }
  };
  return <div>
    <Label>Receipts</Label>
    <div
      role="button" tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
      className={`mt-1.5 flex cursor-pointer items-center justify-center gap-2 border border-dashed px-3 py-4 text-sm text-muted-foreground transition-colors ${drag ? 'border-primary bg-primary/5' : 'border-[var(--hairline)] bg-[var(--surface-sunken)] hover:border-primary/50'}`}
    >
      <Upload className="size-4" /> Drop receipts or <span className="text-primary">browse</span> <span className="text-xs">· PDF or image, 10 MB max</span>
    </div>
    <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
    {(receipts.length > 0 || pending.length > 0) && <ul className="mt-2 divide-y divide-[var(--hairline)] border border-[var(--hairline)]">
      {receipts.map((r) => <li key={r.path} className="flex items-center gap-2 px-3 py-2 text-sm">
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <button type="button" onClick={() => void open(r)} className="min-w-0 flex-1 cursor-pointer truncate text-left hover:text-primary">{r.name}</button>
        <span className="text-xs tabular-nums text-muted-foreground">{kb(r.size)}</span>
        {onRemoveExisting && <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Remove ${r.name}`} onClick={() => onRemoveExisting(r)}><Trash2 className="size-3.5" /></Button>}
      </li>)}
      {pending.map((f, i) => <li key={`${f.name}-${i}`} className="flex items-center gap-2 px-3 py-2 text-sm">
        <Paperclip className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{f.name}</span>
        <span className="text-xs text-muted-foreground">Uploads on save · {kb(f.size)}</span>
        <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Remove ${f.name}`} onClick={() => setPending(pending.filter((_, j) => j !== i))}><X className="size-3.5" /></Button>
      </li>)}
    </ul>}
  </div>;
}

export function RecordsField({ records, setRecords }: { records: ExpenseRecord[]; setRecords: (r: ExpenseRecord[]) => void }) {
  const update = (i: number, patch: Partial<ExpenseRecord>) => setRecords(records.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const used = new Set(records.map((r) => r.label));
  return <div>
    <div className="flex items-center justify-between"><Label>Records</Label><Button type="button" variant="ghost" size="sm" onClick={() => setRecords([...records, { label: '', value: '' }])}><Plus className="size-3.5" /> Add row</Button></div>
    {records.length > 0 && <div className="mt-1.5 divide-y divide-[var(--hairline)] border border-[var(--hairline)]">
      {records.map((r, i) => <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-2 px-2 py-1.5">
        <Input aria-label="Label" placeholder="Label" value={r.label} onChange={(e) => update(i, { label: e.target.value })} className="h-8 bg-[var(--surface-sunken)]" />
        <div className="relative">
          <Input aria-label="Value" placeholder="Value" value={r.value} onChange={(e) => update(i, { value: e.target.value })} className={`h-8 bg-[var(--surface-sunken)] ${isUrl(r.value) ? 'pr-8' : ''}`} />
          {isUrl(r.value) && <a href={r.value.trim()} target="_blank" rel="noopener noreferrer" aria-label="Open link" className="absolute right-2 top-1/2 -translate-y-1/2 text-primary"><ExternalLink className="size-3.5" /></a>}
        </div>
        <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Remove row" onClick={() => setRecords(records.filter((_, j) => j !== i))}><X className="size-3.5" /></Button>
      </div>)}
    </div>}
    <div className="mt-2 flex flex-wrap gap-1.5">
      {QUICK_LABELS.filter((l) => !used.has(l)).map((l) => <button key={l} type="button" onClick={() => setRecords([...records, { label: l, value: '' }])} className="cursor-pointer border border-[var(--hairline)] px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">+ {l}</button>)}
    </div>
  </div>;
}

/** Read-only display for expanded rows. */
export function RecordsSummary({ records, receipts }: { records: ExpenseRecord[]; receipts: ExpenseReceipt[] }) {
  if (!records.length && !receipts.length) return null;
  const open = async (r: ExpenseReceipt) => { try { window.open(await financeApi.receiptUrl(r.path), '_blank', 'noopener'); } catch { toast.error('Could not open receipt'); } };
  return <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
    {records.map((r, i) => <span key={i}><span className="text-muted-foreground">{r.label || 'Detail'}:</span>{' '}{isUrl(r.value) ? <a className="text-primary hover:underline" href={r.value} target="_blank" rel="noopener noreferrer">{r.value.replace(/^https?:\/\//, '').slice(0, 40)}</a> : r.value}</span>)}
    {receipts.map((r) => <button key={r.path} type="button" onClick={() => void open(r)} className="inline-flex cursor-pointer items-center gap-1 text-primary hover:underline"><Paperclip className="size-3" />{r.name}</button>)}
  </div>;
}
