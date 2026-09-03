import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FinanceSettings } from '@/lib/finance';

export function TaxSettingsModal({ value, onSave, onClose }: { value: FinanceSettings; onSave: (value: FinanceSettings) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState(value); const [saving, setSaving] = useState(false);
  const save = async () => { const rate = draft.taxRatePct; if (rate != null && (!Number.isFinite(rate) || rate < 0 || rate > 100)) return; setSaving(true); try { await onSave({ ...draft, taxRatePct: rate == null ? null : Number(rate) }); onClose(); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 p-4"><div className="w-full max-w-md border border-[var(--hairline)] bg-card shadow-[var(--elev-3)]">
    <div className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-4"><div><h2 className="text-base font-semibold">Tax Estimate Settings</h2><p className="mt-1 text-xs text-muted-foreground">Planning inputs only, not a tax filing calculation.</p></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X /></Button></div>
    <div className="space-y-4 p-5"><div><Label htmlFor="tax-rate">Combined estimated tax rate (%)</Label><Input id="tax-rate" type="number" min="0" max="100" step="0.01" value={draft.taxRatePct ?? ''} onChange={(e) => setDraft({ ...draft, taxRatePct: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Enter your rate" className="mt-1.5 bg-[var(--surface-sunken)]" /><p className="mt-1 text-xs text-muted-foreground">Leave blank to show a setup state rather than assuming a rate.</p></div>
    <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="tax-year">Tax year</Label><Input id="tax-year" type="number" value={draft.taxYear} onChange={(e) => setDraft({ ...draft, taxYear: Number(e.target.value) })} className="mt-1.5 bg-[var(--surface-sunken)]" /></div><div><Label htmlFor="tax-currency">Currency</Label><Input id="tax-currency" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} maxLength={3} className="mt-1.5 bg-[var(--surface-sunken)]" /></div></div>
    <div><Label htmlFor="method">Recognition method</Label><select id="method" value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value as FinanceSettings['method'] })} className="mt-1.5 h-10 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface-sunken)] px-3 text-sm"><option value="cash">Cash basis — received / paid dates</option><option value="accrual">Accrual basis — earned / incurred dates</option></select></div>
    <div><Label htmlFor="jurisdiction">Jurisdiction label (optional)</Label><Input id="jurisdiction" value={draft.jurisdiction || ''} onChange={(e) => setDraft({ ...draft, jurisdiction: e.target.value || null })} placeholder="e.g. United States" className="mt-1.5 bg-[var(--surface-sunken)]" /></div></div>
    <div className="flex justify-end gap-2 border-t border-[var(--hairline)] px-5 py-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button></div>
  </div></div>;
}
