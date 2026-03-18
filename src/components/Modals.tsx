import { useState, useEffect, useRef } from 'react';
import { X, Loader2, User, Globe, Mail, DollarSign, Clock, Repeat, FolderKanban, Eye, EyeOff, ChevronRight, StickyNote, Calendar as CalendarIcon, FileText, Pause, Play, CircleDot, CheckCircle2, Archive, Info, AlertTriangle } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../data/DataContext';

// ── Unsaved Changes Confirmation (inline in modal) ─────────────────
function UnsavedChangesConfirm({ onDiscard, onCancel }: { onDiscard: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-xl"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 6 }}
        transition={{ duration: 0.18 }}
        className="bg-card border border-border rounded-xl p-6 max-w-[300px] w-full mx-4"
        style={{ boxShadow: '0 12px 36px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-4.5 h-4.5 text-destructive" />
        </div>
        <h3 className="text-[15px] text-foreground text-center mb-1" style={{ fontWeight: 600 }}>
          Discard changes?
        </h3>
        <p className="text-[12px] text-muted-foreground text-center leading-relaxed mb-4">
          You have unsaved changes that will be lost if you close this.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onDiscard}
            className="w-full py-2 text-[13px] rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all"
            style={{ fontWeight: 500 }}
          >
            Discard and close
          </button>
          <button
            onClick={onCancel}
            className="w-full py-1.5 text-[13px] text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/40 transition-all"
            style={{ fontWeight: 500 }}
          >
            Keep editing
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Shared Modal Shell ─────────────────────────────────────────────
function ModalShell({ open, onClose, title, subtitle, children, wide, isDirty }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; wide?: boolean; isDirty?: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset confirm state when modal opens/closes
  useEffect(() => {
    if (!open) setShowConfirm(false);
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowConfirm(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleAttemptClose}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`relative bg-card border border-border rounded-xl ${wide ? 'w-full max-w-[600px]' : 'w-full max-w-md'} max-h-[90vh] overflow-y-auto`}
            style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-[16px]" style={{ fontWeight: 600 }}>{title}</h2>
                {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={handleAttemptClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">{children}</div>
            <AnimatePresence>
              {showConfirm && (
                <UnsavedChangesConfirm
                  onDiscard={handleConfirmDiscard}
                  onCancel={() => setShowConfirm(false)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Shared form primitives ─────────────────────────────────────────

function SectionDivider({ icon: Icon, label }: { icon: typeof User; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 600, letterSpacing: '0.03em' }}>{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-[13px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground/60 ml-1">({hint})</span>}
    </label>
  );
}

function Input({ value, onChange, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      className={`w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all ${className}`}
      {...props}
    />
  );
}

function Select({ value, onChange, children, className = '' }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; className?: string }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all ${className}`}
    >
      {children}
    </select>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-[13px]" style={{ fontWeight: 500 }}>{label}</div>
        <div className="text-[12px] text-muted-foreground">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-primary' : 'bg-zinc-300'}`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`}
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
        />
      </button>
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-primary text-primary-foreground text-[13px] rounded-lg hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
      style={{ fontWeight: 500, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      {children}
    </button>
  );
}

function ModelButton({ active, onClick, icon: Icon, label, description }: {
  active: boolean; onClick: () => void; icon: typeof Clock; label: string; description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-left px-3.5 py-3 rounded-lg border transition-all duration-200 ${
        active
          ? 'bg-primary/6 border-primary/25 ring-1 ring-primary/15'
          : 'border-border hover:bg-accent/40 hover:border-border'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className={`text-[13px] ${active ? 'text-primary' : 'text-foreground'}`} style={{ fontWeight: 600 }}>{label}</span>
      </div>
      <div className="text-[11px] text-muted-foreground leading-snug">{description}</div>
    </button>
  );
}

function StatusPill({ active, onClick, label, dot }: { active: boolean; onClick: () => void; label: string; dot: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] transition-all duration-200 ${
        active
          ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15'
          : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
      }`}
      style={{ fontWeight: 500 }}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${active ? dot : 'bg-zinc-400'}`} />
      {label}
    </button>
  );
}

// ── Add Client Modal ───────────────────────────────────────────────
export function AddClientModal({ open, onClose, onSave }: {
  open: boolean; onClose: () => void;
  onSave: (client: any) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [model, setModel] = useState<'Hourly' | 'Retainer' | 'Project'>('Hourly');
  const [rate, setRate] = useState('');
  const [status, setStatus] = useState<'Active' | 'Prospect'>('Active');
  const [retainerTotal, setRetainerTotal] = useState('');
  const [projectBudget, setProjectBudget] = useState('');
  const [showPortalCosts, setShowPortalCosts] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(''); setContactName(''); setContactEmail(''); setWebsite('');
    setModel('Hourly'); setRate(''); setStatus('Active'); setRetainerTotal('');
    setProjectBudget(''); setShowPortalCosts(true); setNotes('');
  };

  // Derive the rate label/unit based on model
  const rateLabel = model === 'Project' ? 'Effective rate' : 'Hourly rate';
  const rateHint = model === 'Project' ? 'used for time-value tracking' : undefined;

  // Compute the retainer monthly value for the summary
  const rateNum = Number(rate) || 0;
  const retainerNum = Number(retainerTotal) || 0;
  const retainerMonthlyValue = rateNum * retainerNum;

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        website: website.trim(),
        model,
        rate: rateNum,
        status,
        monthlyEarnings: 0,
        lifetimeRevenue: 0,
        hoursLogged: 0,
        retainerRemaining: model === 'Retainer' ? retainerNum : 0,
        retainerTotal: model === 'Retainer' ? retainerNum : 0,
        trueHourlyRate: rateNum,
        showPortalCosts,
        lastSessionDate: null,
        notes: notes.trim(),
      });
      reset();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Add client" subtitle="Set up a new client relationship" wide isDirty={!!name.trim()}>
      <div className="space-y-5">
        {/* ── Identity ────────────────────────── */}
        <SectionDivider icon={User} label="Identity" />
        <div>
          <Label>Client or company name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Corp" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Primary contact</Label>
            <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="jane@acme.com" type="email" />
          </div>
        </div>
        <div>
          <Label hint="no https needed">Website</Label>
          <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="acme.com" />
        </div>

        {/* ── Engagement ──────────────────────── */}
        <SectionDivider icon={FolderKanban} label="Engagement" />

        <div>
          <Label>Status</Label>
          <div className="flex gap-2">
            <StatusPill active={status === 'Active'} onClick={() => setStatus('Active')} label="Active" dot="bg-primary" />
            <StatusPill active={status === 'Prospect'} onClick={() => setStatus('Prospect')} label="Prospect" dot="bg-stone-400" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">
            {status === 'Prospect'
              ? 'Prospect clients appear in your pipeline but won\'t affect revenue metrics.'
              : 'Active clients contribute to revenue dashboards and time tracking.'}
          </div>
        </div>

        <div>
          <Label>Billing model</Label>
          <div className="flex gap-2">
            <ModelButton active={model === 'Hourly'} onClick={() => setModel('Hourly')} icon={Clock} label="Hourly" description="Bill per hour tracked" />
            <ModelButton active={model === 'Retainer'} onClick={() => setModel('Retainer')} icon={Repeat} label="Retainer" description="Fixed monthly hours" />
            <ModelButton active={model === 'Project'} onClick={() => setModel('Project')} icon={FolderKanban} label="Project" description="Fixed scope & price" />
          </div>
        </div>

        {/* ── Financial terms ─────────────────── */}
        <SectionDivider icon={DollarSign} label="Financial terms" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label hint={rateHint}>{rateLabel} ($/hr)</Label>
            <Input value={rate} onChange={e => setRate(e.target.value)} placeholder="150" className="tabular-nums" />
          </div>

          {model === 'Retainer' && (
            <div>
              <Label>Hours per month</Label>
              <Input value={retainerTotal} onChange={e => setRetainerTotal(e.target.value)} placeholder="40" className="tabular-nums" />
            </div>
          )}

          {model === 'Project' && (
            <div>
              <Label>Project budget ($)</Label>
              <Input value={projectBudget} onChange={e => setProjectBudget(e.target.value)} placeholder="12,000" className="tabular-nums" />
            </div>
          )}
        </div>

        {/* Retainer summary line */}
        {model === 'Retainer' && rateNum > 0 && retainerNum > 0 && (
          <div className="bg-accent/30 rounded-lg px-3.5 py-2.5 flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Monthly retainer value</span>
            <span className="tabular-nums text-primary" style={{ fontWeight: 600 }}>${retainerMonthlyValue.toLocaleString()}/mo</span>
          </div>
        )}

        {/* Project summary line */}
        {model === 'Project' && rateNum > 0 && Number(projectBudget) > 0 && (
          <div className="bg-accent/30 rounded-lg px-3.5 py-2.5 flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Estimated hours at rate</span>
            <span className="tabular-nums" style={{ fontWeight: 600 }}>~{Math.round(Number(projectBudget) / rateNum)}h</span>
          </div>
        )}

        {/* ── Settings ────────────────────────── */}
        <SectionDivider icon={Eye} label="Portal & visibility" />

        <Toggle
          checked={showPortalCosts}
          onChange={setShowPortalCosts}
          label="Show costs in client portal"
          description="When off, the client sees hours and activity but not dollar amounts"
        />

        {/* ── Notes ──────────────────────────── */}
        <div>
          <Label hint="optional">Internal notes</Label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How you met, referral source, scope ideas, anything useful..."
            rows={2}
            className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none"
          />
        </div>

        {/* ── Footer ─────────────────────────── */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="text-[12px] text-muted-foreground">
            {status === 'Prospect' ? 'Will be added to your prospect pipeline' : 'Will appear in active clients'}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-[13px] rounded-lg border border-border text-muted-foreground hover:bg-accent/40 transition-all" style={{ fontWeight: 500 }}>Cancel</button>
            <PrimaryBtn onClick={handleSave} disabled={saving || !canSave}>{saving ? 'Adding...' : 'Add client'}</PrimaryBtn>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Edit Client Modal ──────────────────────────────────────────────
export function EditClientModal({ open, onClose, client, onSave, workspaceId, isStudio, clientFaviconUrl, clientLogoUrl, onLogoChange }: {
  open: boolean; onClose: () => void; client: any;
  onSave: (updates: any) => Promise<void>;
  workspaceId?: string;
  isStudio?: boolean;
  clientFaviconUrl?: string | null;
  clientLogoUrl?: string | null;
  onLogoChange?: (type: 'favicon' | 'logo', url: string | null) => void;
}) {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [model, setModel] = useState<'Hourly' | 'Retainer' | 'Project'>('Hourly');
  const [rate, setRate] = useState('');
  const [status, setStatus] = useState<'Active' | 'Prospect' | 'Archived'>('Active');
  const [retainerTotal, setRetainerTotal] = useState('');
  const [retainerRemaining, setRetainerRemaining] = useState('');
  const [showPortalCosts, setShowPortalCosts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (client) {
      setName(client.name || '');
      setContactName(client.contactName || '');
      setContactEmail(client.contactEmail || '');
      setWebsite(client.website || '');
      setModel(client.model || 'Hourly');
      setRate(String(client.rate || ''));
      setStatus(client.status || 'Active');
      setRetainerTotal(String(client.retainerTotal || ''));
      setRetainerRemaining(String(client.retainerRemaining || ''));
      setShowPortalCosts(client.showPortalCosts !== false);
    }
  }, [client]);

  const rateNum = Number(rate) || 0;
  const retainerTotalNum = Number(retainerTotal) || 0;
  const retainerRemainingNum = Number(retainerRemaining) || 0;
  const retainerMonthlyValue = rateNum * retainerTotalNum;
  const retainerUsedPct = retainerTotalNum > 0 ? Math.round(((retainerTotalNum - retainerRemainingNum) / retainerTotalNum) * 100) : 0;

  // Track what changed for the save summary
  const hasChanges = client && (
    name !== (client.name || '') ||
    contactName !== (client.contactName || '') ||
    contactEmail !== (client.contactEmail || '') ||
    website !== (client.website || '') ||
    model !== (client.model || 'Hourly') ||
    rate !== String(client.rate || '') ||
    status !== (client.status || 'Active') ||
    retainerTotal !== String(client.retainerTotal || '') ||
    retainerRemaining !== String(client.retainerRemaining || '') ||
    showPortalCosts !== (client.showPortalCosts !== false)
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        name: name.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        website: website.trim(),
        model,
        rate: rateNum,
        status,
        showPortalCosts,
        trueHourlyRate: rateNum,
      };

      if (model === 'Retainer') {
        updates.retainerTotal = retainerTotalNum;
        updates.retainerRemaining = retainerRemainingNum;
      } else {
        updates.retainerTotal = 0;
        updates.retainerRemaining = 0;
      }

      await onSave(updates);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Edit client" subtitle={client?.name ? `Editing ${client.name}` : undefined} wide isDirty={!!hasChanges}>
      <div className="space-y-5">
        {/* ── Identity ────────────────────────── */}
        <SectionDivider icon={User} label="Identity" />
        <div>
          <Label>Client or company name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Primary contact</Label>
            <Input value={contactName} onChange={e => setContactName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} type="email" />
          </div>
        </div>
        <div>
          <Label hint="no https needed">Website</Label>
          <Input value={website} onChange={e => setWebsite(e.target.value)} />
        </div>

        {/* ── Engagement ──────────────────────── */}
        <SectionDivider icon={FolderKanban} label="Engagement" />

        <div>
          <Label>Status</Label>
          <div className="flex gap-2">
            <StatusPill active={status === 'Active'} onClick={() => setStatus('Active')} label="Active" dot="bg-primary" />
            <StatusPill active={status === 'Prospect'} onClick={() => setStatus('Prospect')} label="Prospect" dot="bg-stone-400" />
            <StatusPill active={status === 'Archived'} onClick={() => setStatus('Archived')} label="Archived" dot="bg-zinc-400" />
          </div>
          {status === 'Archived' && (
            <div className="text-[11px] text-muted-foreground mt-1.5">
              Archived clients are hidden from active views. All data is preserved.
            </div>
          )}
        </div>

        <div>
          <Label>Billing model</Label>
          <div className="flex gap-2">
            <ModelButton active={model === 'Hourly'} onClick={() => setModel('Hourly')} icon={Clock} label="Hourly" description="Bill per hour tracked" />
            <ModelButton active={model === 'Retainer'} onClick={() => setModel('Retainer')} icon={Repeat} label="Retainer" description="Fixed monthly hours" />
            <ModelButton active={model === 'Project'} onClick={() => setModel('Project')} icon={FolderKanban} label="Project" description="Fixed scope & price" />
          </div>
        </div>

        {/* ── Financial terms ─────────────────── */}
        <SectionDivider icon={DollarSign} label="Financial terms" />

        <div>
          <Label>{model === 'Project' ? 'Effective rate' : 'Hourly rate'} ($/hr)</Label>
          <Input value={rate} onChange={e => setRate(e.target.value)} className="tabular-nums" />
          {client && rateNum > 0 && rateNum !== (client.rate || 0) && (
            <div className="text-[11px] text-muted-foreground mt-1">
              Changed from ${client.rate}/hr — future sessions will use this rate
            </div>
          )}
        </div>

        {model === 'Retainer' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hours per month</Label>
                <Input value={retainerTotal} onChange={e => setRetainerTotal(e.target.value)} className="tabular-nums" />
              </div>
              <div>
                <Label hint="adjust manually if needed">Remaining this month</Label>
                <Input value={retainerRemaining} onChange={e => setRetainerRemaining(e.target.value)} className="tabular-nums" />
              </div>
            </div>

            {retainerTotalNum > 0 && (
              <div className="bg-accent/30 rounded-lg px-3.5 py-3">
                <div className="flex items-center justify-between text-[13px] mb-2">
                  <span className="text-muted-foreground">Retainer usage</span>
                  <span className="tabular-nums" style={{ fontWeight: 600 }}>
                    {retainerRemainingNum}h remaining · {retainerUsedPct}% used
                  </span>
                </div>
                <div className="h-1.5 bg-accent/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(0, Math.min(100, ((retainerTotalNum - retainerRemainingNum) / retainerTotalNum) * 100))}%`,
                      background: retainerUsedPct > 85 ? '#5ea1bf' : 'linear-gradient(90deg, #5ea1bf, #7fb8d1)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
                  <span>${retainerMonthlyValue.toLocaleString()}/mo</span>
                  <span>Resets 1st of month</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Settings ────────────────────────── */}
        <SectionDivider icon={Eye} label="Portal & visibility" />

        <Toggle
          checked={showPortalCosts}
          onChange={setShowPortalCosts}
          label="Show costs in client portal"
          description="When off, the client sees hours and activity but not dollar amounts"
        />

        {/* ── Client logos (Studio only) ─────── */}
        {isStudio && workspaceId && client && (
          <>
            <SectionDivider icon={User} label="Client branding" />
            <div className="text-[11px] text-muted-foreground mb-2">
              Upload logos that appear on this client's portal page and detail view.
            </div>

            {/* Favicon */}
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px]" style={{ fontWeight: 500 }}>Favicon / icon</span>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                    <div className="absolute top-full left-0 mt-1.5 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[11px] leading-relaxed whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                      SVG (best), PNG, or JPG · 1:1 ratio · 1080×1080px ideal<br/>White logo on a colored background works best
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">Small square logo shown next to client name</div>
              </div>
              <div className="flex items-center gap-2">
                {clientFaviconUrl ? (
                  <>
                    <img src={clientFaviconUrl} alt="Favicon" className="h-8 w-8 rounded-lg object-cover" />
                    <button onClick={() => faviconInputRef.current?.click()} className="text-[11px] text-primary hover:text-primary/80" style={{ fontWeight: 500 }}>Replace</button>
                    <button onClick={async () => {
                      const { data: existing } = await (await import('@/integrations/supabase/client')).supabase.storage.from('logos').list(workspaceId, { limit: 30 });
                      const match = existing?.find((f: any) => f.name.startsWith(`client-${client.id}-favicon.`));
                      if (match) await (await import('@/integrations/supabase/client')).supabase.storage.from('logos').remove([`${workspaceId}/${match.name}`]);
                      onLogoChange?.('favicon', null);
                    }} className="text-[11px] text-destructive hover:text-destructive/80" style={{ fontWeight: 500 }}>Remove</button>
                  </>
                ) : (
                  <button onClick={() => faviconInputRef.current?.click()} disabled={uploadingFavicon} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-accent/30 rounded-lg hover:bg-accent/50 transition-all text-muted-foreground" style={{ fontWeight: 500 }}>
                    {uploadingFavicon ? <Loader2 className="w-3 h-3 animate-spin" /> : <User className="w-3 h-3" />}
                    Upload
                  </button>
                )}
              </div>
            </div>
            <input ref={faviconInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; e.target.value = '';
              if (!file) return;
              setUploadingFavicon(true);
              try {
                const sb = (await import('@/integrations/supabase/client')).supabase;
                const ext = file.name.split('.').pop() || 'png';
                const path = `${workspaceId}/client-${client.id}-favicon.${ext}`;
                const { data: existing } = await sb.storage.from('logos').list(workspaceId, { limit: 30 });
                const old = existing?.find((f: any) => f.name.startsWith(`client-${client.id}-favicon.`));
                if (old) await sb.storage.from('logos').remove([`${workspaceId}/${old.name}`]);
                const { error } = await sb.storage.from('logos').upload(path, file, { upsert: true });
                if (error) throw new Error(error.message);
                const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${path}`;
                onLogoChange?.('favicon', url);
              } catch (err: any) { console.error(err); }
              finally { setUploadingFavicon(false); }
            }} />

            {/* Full logo */}
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px]" style={{ fontWeight: 500 }}>Full logo</span>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                    <div className="absolute top-full left-0 mt-1.5 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[11px] leading-relaxed whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                      SVG (best), PNG, or JPG · Min 1080px wide recommended
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">Larger logo displayed on the portal page</div>
              </div>
              <div className="flex items-center gap-2">
                {clientLogoUrl ? (
                  <>
                    <img src={clientLogoUrl} alt="Logo" className="h-8 w-auto max-w-[100px] rounded-lg object-contain border border-border bg-white p-0.5" />
                    <button onClick={() => logoInputRef.current?.click()} className="text-[11px] text-primary hover:text-primary/80" style={{ fontWeight: 500 }}>Replace</button>
                    <button onClick={async () => {
                      const { data: existing } = await (await import('@/integrations/supabase/client')).supabase.storage.from('logos').list(workspaceId, { limit: 30 });
                      const match = existing?.find((f: any) => f.name.startsWith(`client-${client.id}.`) && !f.name.includes('-favicon'));
                      if (match) await (await import('@/integrations/supabase/client')).supabase.storage.from('logos').remove([`${workspaceId}/${match.name}`]);
                      onLogoChange?.('logo', null);
                    }} className="text-[11px] text-destructive hover:text-destructive/80" style={{ fontWeight: 500 }}>Remove</button>
                  </>
                ) : (
                  <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-accent/30 rounded-lg hover:bg-accent/50 transition-all text-muted-foreground" style={{ fontWeight: 500 }}>
                    {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <User className="w-3 h-3" />}
                    Upload
                  </button>
                )}
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; e.target.value = '';
              if (!file) return;
              setUploadingLogo(true);
              try {
                const sb = (await import('@/integrations/supabase/client')).supabase;
                const ext = file.name.split('.').pop() || 'png';
                const path = `${workspaceId}/client-${client.id}.${ext}`;
                const { data: existing } = await sb.storage.from('logos').list(workspaceId, { limit: 30 });
                const old = existing?.find((f: any) => f.name.startsWith(`client-${client.id}.`) && !f.name.includes('-favicon'));
                if (old) await sb.storage.from('logos').remove([`${workspaceId}/${old.name}`]);
                const { error } = await sb.storage.from('logos').upload(path, file, { upsert: true });
                if (error) throw new Error(error.message);
                const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${path}`;
                onLogoChange?.('logo', url);
              } catch (err: any) { console.error(err); }
              finally { setUploadingLogo(false); }
            }} />
          </>
        )}

        {/* ── Footer ─────────────────────────── */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="text-[12px] text-muted-foreground">
            {hasChanges ? 'Unsaved changes' : 'No changes'}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[13px] rounded-lg border border-border text-muted-foreground hover:bg-accent/40 transition-all" style={{ fontWeight: 500 }}>Cancel</button>
            <PrimaryBtn onClick={handleSave} disabled={saving || !hasChanges}>{saving ? 'Saving...' : 'Save changes'}</PrimaryBtn>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Log Session Modal ──────────────────────────────────────────────
export function LogSessionModal({ open, onClose, onSave, clients, preSelectedClient, prefilledDuration }: {
  open: boolean; onClose: () => void;
  onSave: (session: any) => Promise<void>;
  clients: any[];
  preSelectedClient?: string;
  prefilledDuration?: number;
}) {
  const { getProjects, loadProjectsForClient, workCategoryNames } = useData();
  const [clientId, setClientId] = useState('');
  const [task, setTask] = useState('');
  const [duration, setDuration] = useState('');
  const [billable, setBillable] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sessionDate, setSessionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Allocation state ──
  const [allocationType, setAllocationType] = useState<'general' | 'retainer' | 'project'>('general');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [clientProjects, setClientProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const allTags = workCategoryNames.length > 0
    ? workCategoryNames
    : ['Design', 'Development', 'Meetings', 'Strategy', 'Prospecting'];

  // Initialize selected tags with first category when tags load
  const firstTag = allTags[0] || 'Design';
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && allTags.length > 0) {
      setSelectedTags([firstTag]);
      initializedRef.current = true;
    }
  }, [firstTag]);

  // Initialize date to today on open
  useEffect(() => {
    if (open && !sessionDate) {
      const now = new Date();
      setSessionDate(now.toISOString().split('T')[0]);
    }
  }, [open]);

  useEffect(() => {
    if (preSelectedClient) setClientId(preSelectedClient);
    if (prefilledDuration) setDuration((prefilledDuration / 3600).toFixed(1));
  }, [preSelectedClient, prefilledDuration, open]);

  // Load projects when client changes
  useEffect(() => {
    if (!clientId) {
      setClientProjects([]);
      setAllocationType('general');
      setSelectedProjectId('');
      return;
    }

    // Get cached projects first
    const cached = getProjects(clientId);
    setClientProjects(cached);

    // Set smart default allocation
    const client = clients.find(c => c.id === clientId);
    if (client?.model === 'Retainer') {
      setAllocationType('retainer');
      setSelectedProjectId('');
    } else if (cached.length > 0) {
      const activeProject = cached.find((p: any) => p.status === 'In Progress');
      if (activeProject) {
        setAllocationType('project');
        setSelectedProjectId(String(activeProject.id));
      } else {
        setAllocationType('general');
        setSelectedProjectId('');
      }
    } else {
      setAllocationType('general');
      setSelectedProjectId('');
    }

    // Also load from server in background
    setLoadingProjects(true);
    loadProjectsForClient(clientId)
      .then(projects => {
        setClientProjects(projects);
      })
      .catch(err => console.error('Failed to load projects for client:', err))
      .finally(() => setLoadingProjects(false));
  }, [clientId]);

  const reset = () => {
    setClientId(''); setTask(''); setDuration(''); setBillable(true);
    setSelectedTags([allTags[0] || 'Design']); setSessionDate(''); setNotes('');
    setAllocationType('general'); setSelectedProjectId(''); setClientProjects([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const activeClients = clients.filter(c => c.status === 'Active' || c.status === 'Prospect');
  const selectedClient = clients.find(c => c.id === clientId);
  const durationNum = parseFloat(duration) || 0;
  const revenue = billable && selectedClient ? Math.round(durationNum * selectedClient.rate) : 0;

  // Selected project for preview
  const selectedProject = allocationType === 'project' && selectedProjectId
    ? clientProjects.find((p: any) => String(p.id) === selectedProjectId)
    : null;

  // Compute date display info
  const parsedDate = sessionDate ? new Date(sessionDate + 'T12:00:00') : new Date();
  const dateStr = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateObj = new Date(sessionDate + 'T00:00:00');
  const diffDays = Math.round((today.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
  const dateGroupLabel = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : dateStr;
  const isBackdated = diffDays > 0;

  const canSave = clientId && task.trim() && durationNum > 0
    && (allocationType !== 'project' || selectedProjectId);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const session: any = {
        date: dateStr,
        dateGroup: dateGroupLabel,
        client: selectedClient?.name || '',
        clientId,
        task: task.trim(),
        tags: selectedTags,
        workTags: selectedTags,
        duration: durationNum,
        revenue,
        billable,
        notes: notes.trim(),
        allocationType,
        projectId: allocationType === 'project' ? selectedProjectId : null,
        projectName: selectedProject?.name || null,
      };
      await onSave(session);
      reset();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Allocation label for footer
  const allocationLabel = allocationType === 'retainer'
    ? 'retainer'
    : allocationType === 'project' && selectedProject
      ? selectedProject.name
      : 'general';

  // Active (non-complete) projects for the selector
  const selectableProjects = clientProjects.filter((p: any) => p.status !== 'Complete');
  const completedProjects = clientProjects.filter((p: any) => p.status === 'Complete');

  return (
    <ModalShell open={open} onClose={onClose} title="Log session" subtitle="Record work you've completed" wide isDirty={!!(clientId || task.trim() || duration)}>
      <div className="space-y-5">
        {/* ── When & where ──────────────────── */}
        <SectionDivider icon={CalendarIcon} label="When & where" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <DatePicker
              value={sessionDate}
              onChange={setSessionDate}
              maxDate={new Date().toISOString().split('T')[0]}
              placeholder="Select date"
            />
            {isBackdated && sessionDate && (
              <div className="text-[11px] text-muted-foreground mt-1">
                Backdating {diffDays} day{diffDays !== 1 ? 's' : ''} — will appear under "{dateGroupLabel}"
              </div>
            )}
          </div>
          <div>
            <Label>Client</Label>
            <Select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Select a client</option>
              {activeClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.model}{c.rate ? ` · $${c.rate}/hr` : ''}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Client context line */}
        {selectedClient && (
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
            <div className="w-6 h-6 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] text-primary" style={{ fontWeight: 600 }}>{selectedClient.name?.charAt(0)}</span>
            </div>
            <span>{selectedClient.model}</span>
            <span>·</span>
            <span className="tabular-nums">${selectedClient.rate}/hr</span>
            {selectedClient.model === 'Retainer' && selectedClient.retainerRemaining > 0 && (
              <>
                <span>·</span>
                <span className="tabular-nums">{selectedClient.retainerRemaining}h remaining this month</span>
              </>
            )}
          </div>
        )}

        {/* ── Apply to (allocation) ─────────── */}
        {selectedClient && (
          <>
            <SectionDivider icon={FolderKanban} label="Apply to" />

            <div className="flex flex-wrap gap-1.5">
              {/* General time option */}
              <button
                onClick={() => { setAllocationType('general'); setSelectedProjectId(''); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-lg border transition-all duration-200 ${
                  allocationType === 'general'
                    ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
                }`}
                style={{ fontWeight: 500 }}
              >
                <Clock className="w-3.5 h-3.5" />
                General time
              </button>

              {/* Retainer option — only for retainer clients */}
              {selectedClient.model === 'Retainer' && (
                <button
                  onClick={() => { setAllocationType('retainer'); setSelectedProjectId(''); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-lg border transition-all duration-200 ${
                    allocationType === 'retainer'
                      ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  Retainer
                  {selectedClient.retainerRemaining > 0 && (
                    <span className="text-[11px] opacity-70 tabular-nums ml-0.5">{selectedClient.retainerRemaining}h left</span>
                  )}
                </button>
              )}

              {/* Project options */}
              {selectableProjects.map((proj: any) => (
                <button
                  key={proj.id}
                  onClick={() => { setAllocationType('project'); setSelectedProjectId(String(proj.id)); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-lg border transition-all duration-200 ${
                    allocationType === 'project' && selectedProjectId === String(proj.id)
                      ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  {proj.name}
                  {proj.estimatedHours > 0 && (
                    <span className="text-[11px] opacity-70 tabular-nums ml-0.5">{proj.hours || 0}/{proj.estimatedHours}h</span>
                  )}
                </button>
              ))}

              {/* Completed projects in a muted group */}
              {completedProjects.map((proj: any) => (
                <button
                  key={proj.id}
                  onClick={() => { setAllocationType('project'); setSelectedProjectId(String(proj.id)); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-lg border transition-all duration-200 ${
                    allocationType === 'project' && selectedProjectId === String(proj.id)
                      ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15'
                      : 'border-border text-zinc-400 hover:text-zinc-500 hover:bg-accent/40'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {proj.name}
                  <span className="text-[10px] opacity-60">done</span>
                </button>
              ))}

              {loadingProjects && (
                <div className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </div>
              )}
            </div>

            {/* Allocation context */}
            <div className="text-[11px] text-muted-foreground">
              {allocationType === 'general' && 'Tracked as general client time — not applied to a specific project or retainer.'}
              {allocationType === 'retainer' && `This session's hours will be deducted from ${selectedClient.name}'s retainer balance.`}
              {allocationType === 'project' && selectedProject && `Hours and revenue will be added to "${selectedProject.name}" project totals.`}
              {allocationType === 'project' && !selectedProject && 'Select a project to apply this time to.'}
            </div>
          </>
        )}

        {/* ── What you did ─────────────────── */}
        <SectionDivider icon={FileText} label="What you did" />

        <div>
          <Label>Description</Label>
          <input
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder="Brand refresh — icon exploration"
            className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          />
        </div>

        <div>
          <Label>Categories</Label>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1.5 text-[12px] rounded-lg border transition-all duration-200 ${
                  selectedTags.includes(tag)
                    ? 'bg-primary/8 border-primary/20 text-primary ring-1 ring-primary/10'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
                }`}
                style={{ fontWeight: 500 }}
              >
                {tag}
              </button>
            ))}
          </div>
          {selectedTags.length === 0 && (
            <div className="text-[11px] text-muted-foreground mt-1">Select at least one category for time allocation reports</div>
          )}
        </div>

        <div>
          <Label>Duration (hours)</Label>
          <div className="grid grid-cols-4 gap-2">
            <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="2.5" className="tabular-nums col-span-1" />
            <div className="col-span-3 flex gap-1.5">
              {[0.5, 1, 1.5, 2, 3, 4].map(preset => (
                <button
                  key={preset}
                  onClick={() => setDuration(String(preset))}
                  className={`flex-1 py-2 text-[12px] rounded-lg border transition-all duration-200 tabular-nums ${
                    duration === String(preset)
                      ? 'bg-primary/8 border-primary/20 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  {preset}h
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label hint="optional">Session notes</Label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Key decisions, blockers, next steps..."
            rows={2}
            className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none"
          />
        </div>

        {/* ── Billing ────────────────────────── */}
        <SectionDivider icon={DollarSign} label="Billing" />

        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px]" style={{ fontWeight: 500 }}>Billable time</div>
            <div className="text-[12px] text-muted-foreground">
              {billable ? 'This session will count toward client revenue' : 'Non-billable — internal or pro-bono work'}
            </div>
          </div>
          <button
            onClick={() => setBillable(b => !b)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${billable ? 'bg-primary' : 'bg-zinc-300'}`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${billable ? 'translate-x-4' : 'translate-x-0'}`}
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
            />
          </button>
        </div>

        {/* Revenue & allocation impact preview */}
        {selectedClient && durationNum > 0 && (
          <div className="bg-accent/30 rounded-lg px-3.5 py-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">
                {billable ? 'Estimated revenue' : 'Time value'}{selectedClient.rate ? ` @ $${selectedClient.rate}/hr` : ''}
              </span>
              <span className={`tabular-nums ${billable ? 'text-primary' : 'text-muted-foreground'}`} style={{ fontWeight: 600 }}>
                {billable ? `$${revenue.toLocaleString()}` : `$0 (non-billable)`}
              </span>
            </div>

            {/* Retainer impact */}
            {allocationType === 'retainer' && billable && selectedClient.model === 'Retainer' && selectedClient.retainerTotal > 0 && (
              <div className="mt-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                  <span>Retainer after this session</span>
                  <span className="tabular-nums" style={{ fontWeight: 500 }}>
                    {Math.max(0, (selectedClient.retainerRemaining || 0) - durationNum).toFixed(1)}h of {selectedClient.retainerTotal}h remaining
                  </span>
                </div>
                <div className="h-1.5 bg-accent/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(0, Math.min(100, ((selectedClient.retainerTotal - Math.max(0, (selectedClient.retainerRemaining || 0) - durationNum)) / selectedClient.retainerTotal) * 100))}%`,
                      background: ((selectedClient.retainerTotal - Math.max(0, (selectedClient.retainerRemaining || 0) - durationNum)) / selectedClient.retainerTotal) > 0.85
                        ? '#5ea1bf'
                        : 'linear-gradient(90deg, #5ea1bf, #7fb8d1)',
                    }}
                  />
                </div>
                {(selectedClient.retainerRemaining || 0) - durationNum < 0 && (
                  <div className="text-[11px] text-primary mt-1" style={{ fontWeight: 500 }}>
                    {Math.abs((selectedClient.retainerRemaining || 0) - durationNum).toFixed(1)}h over retainer — will be billed as overage
                  </div>
                )}
              </div>
            )}

            {/* Project impact */}
            {allocationType === 'project' && selectedProject && (
              <div className="mt-2 pt-2 border-t border-border/40">
                {/* Effective rate context for project-model clients */}
                {selectedProject.totalValue > 0 && (
                  <div className="mb-2">
                    {(selectedProject.hours || 0) > 0 ? (
                      <div className="text-[11px] text-muted-foreground">
                        This project: <span className="tabular-nums" style={{ fontWeight: 500, color: '#5ea1bf' }}>${Math.round(selectedProject.totalValue / (selectedProject.hours || 1))}/hr</span> effective across {selectedProject.hours}h logged
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground">
                        This project: <span className="tabular-nums" style={{ fontWeight: 500 }}>${selectedProject.totalValue.toLocaleString()}</span> total — no hours logged yet
                      </div>
                    )}
                    {durationNum > 0 && (selectedProject.hours || 0) + durationNum > 0 && (() => {
                      const newEffRate = Math.round(selectedProject.totalValue / ((selectedProject.hours || 0) + durationNum));
                      const cl = clients.find(c => c.id === clientId);
                      const rateColor = cl && newEffRate < (cl.rate * 0.5) ? '#c27272' : cl && newEffRate < cl.rate ? '#bfa044' : '#5ea1bf';
                      return (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          After this session: <span className="tabular-nums" style={{ fontWeight: 500, color: rateColor }}>${newEffRate}/hr</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                  <span>"{selectedProject.name}" after this session</span>
                  <span className="tabular-nums" style={{ fontWeight: 500 }}>
                    {((selectedProject.hours || 0) + durationNum).toFixed(1)}h{selectedProject.estimatedHours > 0 ? ` of ${selectedProject.estimatedHours}h` : ''}
                  </span>
                </div>
                {selectedProject.estimatedHours > 0 && (
                  <>
                    <div className="h-1.5 bg-accent/60 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (((selectedProject.hours || 0) + durationNum) / selectedProject.estimatedHours) * 100)}%`,
                          background: (((selectedProject.hours || 0) + durationNum) / selectedProject.estimatedHours) > 0.9
                            ? '#5ea1bf'
                            : 'linear-gradient(90deg, #5ea1bf, #7fb8d1)',
                        }}
                      />
                    </div>
                    {((selectedProject.hours || 0) + durationNum) > selectedProject.estimatedHours && (
                      <div className="text-[11px] text-primary mt-1" style={{ fontWeight: 500 }}>
                        {(((selectedProject.hours || 0) + durationNum) - selectedProject.estimatedHours).toFixed(1)}h over estimated scope
                      </div>
                    )}
                  </>
                )}
                {billable && selectedProject.totalValue > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                    <span>Revenue earned</span>
                    <span className="tabular-nums" style={{ fontWeight: 500 }}>
                      ${((selectedProject.revenue || 0) + revenue).toLocaleString()} of ${selectedProject.totalValue.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Footer ─────────────────────────── */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="text-[12px] text-muted-foreground">
            {canSave
              ? `${durationNum}h ${billable ? 'billable' : 'non-billable'} · ${allocationLabel} · ${dateGroupLabel}`
              : allocationType === 'project' && !selectedProjectId
                ? 'Select a project to apply this time to'
                : 'Fill in client, description, and duration'}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-[13px] rounded-lg border border-border text-muted-foreground hover:bg-accent/40 transition-all" style={{ fontWeight: 500 }}>Cancel</button>
            <PrimaryBtn onClick={handleSave} disabled={saving || !canSave}>{saving ? 'Saving...' : 'Log session'}</PrimaryBtn>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Add Project Modal ──────────────────────────────────────────────
export function AddProjectModal({ open, onClose, onSave, clients, preSelectedClientId }: {
  open: boolean; onClose: () => void;
  onSave: (project: any, clientId?: string) => Promise<void>;
  clients?: any[];
  preSelectedClientId?: string;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState<'Not Started' | 'In Progress' | 'On Hold' | 'Complete'>('In Progress');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const showClientSelector = clients && clients.length > 0 && !preSelectedClientId;
  const activeClients = clients?.filter(c => c.status === 'Active' || c.status === 'Prospect') || [];

  // Initialize on open
  useEffect(() => {
    if (open) {
      if (!startDate) setStartDate(new Date().toISOString().split('T')[0]);
      if (preSelectedClientId) setClientId(preSelectedClientId);
    }
  }, [open, preSelectedClientId]);

  const reset = () => {
    setName(''); setDescription(''); setClientId(''); setStatus('In Progress');
    setEstimatedHours(''); setTotalValue(''); setStartDate(''); setEndDate('');
  };

  const hoursNum = Number(estimatedHours) || 0;
  const valueNum = Number(totalValue) || 0;
  const effectiveRate = hoursNum > 0 && valueNum > 0 ? Math.round(valueNum / hoursNum) : 0;

  // Compute timeline duration
  const timelineDays = startDate && endDate
    ? Math.round((new Date(endDate + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const timelineWeeks = timelineDays > 0 ? Math.round(timelineDays / 7) : 0;
  const weeklyHours = timelineWeeks > 0 && hoursNum > 0 ? (hoursNum / timelineWeeks).toFixed(1) : null;

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const statusConfig: Record<string, { icon: typeof Play; dot: string; description: string }> = {
    'Not Started': { icon: CircleDot, dot: 'bg-stone-400', description: 'Scoped but not yet begun' },
    'In Progress': { icon: Play, dot: 'bg-primary', description: 'Actively being worked on' },
    'On Hold': { icon: Pause, dot: 'bg-stone-400', description: 'Paused — awaiting input or decision' },
    'Complete': { icon: CheckCircle2, dot: 'bg-zinc-400', description: 'Delivered and closed' },
  };

  const canSave = name.trim().length > 0 && (preSelectedClientId || !showClientSelector || clientId);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const resolvedClientId = preSelectedClientId || clientId;
      await onSave({
        name: name.trim(),
        description: description.trim(),
        status,
        hours: 0,
        revenue: 0,
        estimatedHours: hoursNum,
        totalValue: valueNum,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || null,
      }, resolvedClientId);
      reset();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Add project" subtitle="Define scope and timeline for a new project" wide isDirty={!!name.trim()}>
      <div className="space-y-5">
        {/* ── Project details ───────────────── */}
        <SectionDivider icon={FolderKanban} label="Project details" />

        {showClientSelector && (
          <div>
            <Label>Client</Label>
            <Select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Select a client</option>
              {activeClients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <Label>Project name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Website redesign" autoFocus />
        </div>

        <div>
          <Label hint="optional">Description</Label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Scope summary, deliverables, key milestones..."
            rows={2}
            className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none"
          />
        </div>

        <div>
          <Label>Status</Label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map(key => {
              const cfg = statusConfig[key];
              const active = status === key;
              return (
                <button
                  key={key}
                  onClick={() => setStatus(key as typeof status)}
                  className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border text-center transition-all duration-200 ${
                    active
                      ? 'bg-primary/6 border-primary/25 ring-1 ring-primary/15'
                      : 'border-border hover:bg-accent/40'
                  }`}
                >
                  <cfg.icon className={`w-3.5 h-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-[11px] leading-tight ${active ? 'text-primary' : 'text-foreground'}`} style={{ fontWeight: 600 }}>{key}</span>
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">{statusConfig[status]?.description}</div>
        </div>

        {/* ── Timeline ──────────────────────── */}
        <SectionDivider icon={CalendarIcon} label="Timeline" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start date</Label>
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="Start date"
            />
          </div>
          <div>
            <Label hint="optional">End date</Label>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              minDate={startDate}
              placeholder="End date"
            />
          </div>
        </div>

        {timelineDays > 0 && (
          <div className="text-[11px] text-muted-foreground">
            {timelineDays} days ({timelineWeeks} week{timelineWeeks !== 1 ? 's' : ''})
            {weeklyHours && <> · ~{weeklyHours}h/week at estimated scope</>}
          </div>
        )}

        {/* ── Budget & scope ─────────────────── */}
        <SectionDivider icon={DollarSign} label="Budget & scope" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Estimated hours</Label>
            <Input value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} placeholder="40" className="tabular-nums" />
          </div>
          <div>
            <Label>Total value ($)</Label>
            <Input value={totalValue} onChange={e => setTotalValue(e.target.value)} placeholder="6,000" className="tabular-nums" />
          </div>
        </div>

        {/* Budget summary */}
        {(effectiveRate > 0 || (hoursNum > 0 && valueNum > 0)) && (
          <div className="bg-accent/30 rounded-lg px-3.5 py-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">Effective hourly rate</span>
              <span className="tabular-nums text-primary" style={{ fontWeight: 600 }}>${effectiveRate}/hr</span>
            </div>
            {hoursNum > 0 && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40">
                <span>Scope utilization at 0h logged</span>
                <span className="tabular-nums" style={{ fontWeight: 500 }}>0% · {hoursNum}h remaining</span>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ─────────────────────────── */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="text-[12px] text-muted-foreground">
            {canSave
              ? `${status}${valueNum > 0 ? ` · $${valueNum.toLocaleString()}` : ''}${hoursNum > 0 ? ` · ${hoursNum}h estimated` : ''}`
              : 'Enter a project name to continue'}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-[13px] rounded-lg border border-border text-muted-foreground hover:bg-accent/40 transition-all" style={{ fontWeight: 500 }}>Cancel</button>
            <PrimaryBtn onClick={handleSave} disabled={saving || !canSave}>{saving ? 'Adding...' : 'Add project'}</PrimaryBtn>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Edit Session Modal ─────────────────────────────────────────────
export function EditSessionModal({ open, onClose, session, onSave, onDelete, clients }: {
  open: boolean; onClose: () => void;
  session: any;
  onSave: (sessionId: string, updates: any) => Promise<void>;
  onDelete: (sessionId: string) => Promise<void>;
  clients: any[];
}) {
  const { getProjects, loadProjectsForClient, workCategoryNames } = useData();
  const [clientId, setClientId] = useState('');
  const [task, setTask] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [billable, setBillable] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sessionDate, setSessionDate] = useState('');
  const [allocationType, setAllocationType] = useState<'general' | 'retainer' | 'project'>('general');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [clientProjects, setClientProjects] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allTags = workCategoryNames.length > 0
    ? workCategoryNames
    : ['Design', 'Development', 'Meetings', 'Strategy', 'Prospecting'];

  // Populate fields when session changes
  useEffect(() => {
    if (!session) return;
    setClientId(session.clientId || '');
    setTask(session.task || '');
    setNotes(session.notes || '');
    setDuration(String(session.duration || ''));
    setBillable(session.billable !== false);
    setSelectedTags(session.workTags || session.tags || []);
    setAllocationType(session.allocationType || 'general');
    setSelectedProjectId(session.projectId ? String(session.projectId) : '');
    setConfirmDelete(false);

    // Use rawDate (YYYY-MM-DD) if available, otherwise parse display date
    if (session.rawDate) {
      setSessionDate(session.rawDate);
    } else if (session.date) {
      const parsed = new Date(session.date);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        setSessionDate(`${y}-${m}-${d}`);
      }
    }
  }, [session]);

  // Load projects when clientId is set
  useEffect(() => {
    if (!clientId) { setClientProjects([]); return; }
    const cached = getProjects(clientId);
    setClientProjects(cached);
    loadProjectsForClient(clientId)
      .then(setClientProjects)
      .catch(() => {});
  }, [clientId]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const originalDate = session?.rawDate || '';
  const hasChanges = session && (
    clientId !== (session.clientId || '') ||
    task !== (session.task || '') ||
    notes !== (session.notes || '') ||
    duration !== String(session.duration || '') ||
    billable !== (session.billable !== false) ||
    JSON.stringify(selectedTags) !== JSON.stringify(session.workTags || session.tags || []) ||
    sessionDate !== originalDate ||
    allocationType !== (session.allocationType || 'general') ||
    selectedProjectId !== (session.projectId ? String(session.projectId) : '')
  );

  const selectedClient = clients.find(c => c.id === clientId);
  const durationNum = parseFloat(duration) || 0;
  const revenue = billable && selectedClient ? Math.round(durationNum * selectedClient.rate) : 0;
  const canSave = clientId && task.trim() && durationNum > 0
    && (allocationType !== 'project' || selectedProjectId);

  const handleSave = async () => {
    if (!canSave || !session) return;
    setSaving(true);
    try {
      await onSave(session.id, {
        clientId,
        task: task.trim(),
        notes: notes.trim(),
        duration: durationNum,
        revenue,
        billable,
        workTags: selectedTags,
        rawDate: sessionDate,
        allocationType,
        projectId: allocationType === 'project' ? selectedProjectId : null,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    setDeleting(true);
    try {
      await onDelete(session.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const selectableProjects = clientProjects.filter((p: any) => p.status !== 'Complete');

  return (
    <ModalShell open={open} onClose={onClose} title="Edit session" subtitle="Update or remove this time entry" wide isDirty={!!hasChanges}>
      <div className="space-y-5">
        <SectionDivider icon={CalendarIcon} label="When & where" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <DatePicker
              value={sessionDate}
              onChange={setSessionDate}
              maxDate={new Date().toISOString().split('T')[0]}
              placeholder="Select date"
            />
          </div>
          <div>
            <Label>Client</Label>
            <Select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Select a client</option>
              {clients.filter(c => c.status === 'Active' || c.status === 'Prospect').map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.model}{c.rate ? ` · $${c.rate}/hr` : ''}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Allocation */}
        {selectedClient && (
          <>
            <SectionDivider icon={FolderKanban} label="Apply to" />
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setAllocationType('general'); setSelectedProjectId(''); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-lg border transition-all duration-200 ${
                  allocationType === 'general'
                    ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
                }`}
                style={{ fontWeight: 500 }}
              >
                <Clock className="w-3.5 h-3.5" />
                General time
              </button>
              {selectedClient.model === 'Retainer' && (
                <button
                  onClick={() => { setAllocationType('retainer'); setSelectedProjectId(''); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-lg border transition-all duration-200 ${
                    allocationType === 'retainer'
                      ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  Retainer
                </button>
              )}
              {selectableProjects.map((proj: any) => (
                <button
                  key={proj.id}
                  onClick={() => { setAllocationType('project'); setSelectedProjectId(String(proj.id)); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-lg border transition-all duration-200 ${
                    allocationType === 'project' && selectedProjectId === String(proj.id)
                      ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  {proj.name}
                </button>
              ))}
            </div>
          </>
        )}

        <SectionDivider icon={FileText} label="What you did" />

        <div>
          <Label>Description</Label>
          <Input value={task} onChange={e => setTask(e.target.value)} placeholder="Brand refresh — icon exploration" />
        </div>

        <div>
          <Label>Categories</Label>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1.5 text-[12px] rounded-lg border transition-all duration-200 ${
                  selectedTags.includes(tag)
                    ? 'bg-primary/8 border-primary/20 text-primary ring-1 ring-primary/10'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
                }`}
                style={{ fontWeight: 500 }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Duration (hours)</Label>
          <div className="grid grid-cols-4 gap-2">
            <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="2.5" className="tabular-nums col-span-1" />
            <div className="col-span-3 flex gap-1.5">
              {[0.5, 1, 1.5, 2, 3, 4].map(preset => (
                <button
                  key={preset}
                  onClick={() => setDuration(String(preset))}
                  className={`flex-1 py-2 text-[12px] rounded-lg border transition-all duration-200 tabular-nums ${
                    duration === String(preset)
                      ? 'bg-primary/8 border-primary/20 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  {preset}h
                </button>
              ))}
            </div>
          </div>
        </div>

        <SectionDivider icon={DollarSign} label="Billing" />

        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px]" style={{ fontWeight: 500 }}>Billable time</div>
            <div className="text-[12px] text-muted-foreground">
              {billable ? 'This session will count toward client revenue' : 'Non-billable — internal or pro-bono work'}
            </div>
          </div>
          <button
            onClick={() => setBillable(b => !b)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${billable ? 'bg-primary' : 'bg-zinc-300'}`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${billable ? 'translate-x-4' : 'translate-x-0'}`}
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
            />
          </button>
        </div>

        {selectedClient && durationNum > 0 && (
          <div className="bg-accent/30 rounded-lg px-3.5 py-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">
                {billable ? 'Estimated revenue' : 'Time value'}{selectedClient.rate ? ` @ $${selectedClient.rate}/hr` : ''}
              </span>
              <span className={`tabular-nums ${billable ? 'text-primary' : 'text-muted-foreground'}`} style={{ fontWeight: 600 }}>
                {billable ? `$${revenue.toLocaleString()}` : `$0 (non-billable)`}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-destructive" style={{ fontWeight: 500 }}>Delete this session?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 text-[12px] rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all disabled:opacity-60"
                  style={{ fontWeight: 500 }}
                >
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-[12px] rounded-lg border border-border text-muted-foreground hover:bg-accent/40 transition-all"
                  style={{ fontWeight: 500 }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-[12px] text-destructive/70 hover:text-destructive transition-colors"
                style={{ fontWeight: 500 }}
              >
                Delete session
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[13px] rounded-lg border border-border text-muted-foreground hover:bg-accent/40 transition-all" style={{ fontWeight: 500 }}>Cancel</button>
            <PrimaryBtn onClick={handleSave} disabled={saving || !canSave}>{saving ? 'Saving...' : 'Save changes'}</PrimaryBtn>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
