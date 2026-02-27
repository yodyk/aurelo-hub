import { useState, useEffect, useRef } from 'react';
import { X, Loader2, User, Globe, Mail, DollarSign, Clock, Repeat, FolderKanban, Eye, EyeOff, ChevronRight, StickyNote, Calendar, FileText, Pause, Play, CircleDot, CheckCircle2, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../data/DataContext';

// ── Shared Modal Shell ─────────────────────────────────────────────
function ModalShell({ open, onClose, title, subtitle, children, wide }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-[2px] pt-[8vh] overflow-y-auto pb-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className={`bg-card border border-border rounded-2xl overflow-hidden ${wide ? 'w-full max-w-xl' : 'w-full max-w-md'} mx-4`}
            style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 pt-5 pb-3">
              <div>
                <h2 className="text-[17px] text-foreground" style={{ fontWeight: 600 }}>{title}</h2>
                {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Shared form primitives ─────────────────────────────────────────

function SectionDivider({ icon: Icon, label }: { icon: typeof User; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 600, letterSpacing: '0.04em' }}>{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-[13px] text-foreground mb-1" style={{ fontWeight: 500 }}>
      {children}
      {hint && <span className="text-muted-foreground ml-1 text-[11px]" style={{ fontWeight: 400 }}>({hint})</span>}
    </label>
  );
}

function Input({ value, onChange, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <input
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
      className={`w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all appearance-none cursor-pointer ${className}`}
    >
      {children}
    </select>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[13px]" style={{ fontWeight: 500 }}>{label}</div>
        <div className="text-[12px] text-muted-foreground">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-primary' : 'bg-muted'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }} />
      </button>
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all" style={{ fontWeight: 500 }}>
      {disabled && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
      className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border transition-all duration-200 ${
        active ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[13px]" style={{ fontWeight: 500 }}>{label}</span>
      </div>
      <span className="text-[11px] opacity-70">{description}</span>
    </button>
  );
}

function StatusPill({ active, onClick, label, dot }: { active: boolean; onClick: () => void; label: string; dot: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg border transition-all duration-200 ${
        active ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
      }`}
      style={{ fontWeight: 500 }}
    >
      <div className={`w-2 h-2 rounded-full ${dot}`} />
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

  const rateNum = Number(rate) || 0;
  const retainerNum = Number(retainerTotal) || 0;
  const retainerMonthlyValue = rateNum * retainerNum;
  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(), contactName: contactName.trim(), contactEmail: contactEmail.trim(),
        website: website.trim(), model, rate: rateNum, status, monthlyEarnings: 0, lifetimeRevenue: 0,
        hoursLogged: 0, retainerRemaining: model === 'Retainer' ? retainerNum : 0,
        retainerTotal: model === 'Retainer' ? retainerNum : 0, trueHourlyRate: rateNum,
        showPortalCosts, lastSessionDate: null, notes: notes.trim(),
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
    <ModalShell open={open} onClose={onClose} title="Add client" subtitle="New client or prospect" wide>
      <div className="space-y-5">
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
          <Label>Website</Label>
          <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="acme.com" />
        </div>

        <SectionDivider icon={FolderKanban} label="Engagement" />
        <div>
          <Label>Status</Label>
          <div className="flex gap-2">
            <StatusPill active={status === 'Active'} onClick={() => setStatus('Active')} label="Active" dot="bg-primary" />
            <StatusPill active={status === 'Prospect'} onClick={() => setStatus('Prospect')} label="Prospect" dot="bg-muted-foreground" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">
            {status === 'Prospect' ? "Prospect clients appear in your pipeline but won't affect revenue metrics." : 'Active clients contribute to revenue dashboards and time tracking.'}
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

        <SectionDivider icon={DollarSign} label="Financial terms" />
        <div>
          <Label hint={model === 'Project' ? 'used for time-value tracking' : undefined}>
            {model === 'Project' ? 'Effective rate' : 'Hourly rate'} ($/hr)
          </Label>
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
        {model === 'Retainer' && rateNum > 0 && retainerNum > 0 && (
          <div className="flex items-center justify-between text-[13px] px-3 py-2 bg-accent/30 rounded-lg">
            <span className="text-muted-foreground">Monthly retainer value</span>
            <span className="tabular-nums" style={{ fontWeight: 600 }}>${retainerMonthlyValue.toLocaleString()}/mo</span>
          </div>
        )}
        {model === 'Project' && rateNum > 0 && Number(projectBudget) > 0 && (
          <div className="flex items-center justify-between text-[13px] px-3 py-2 bg-accent/30 rounded-lg">
            <span className="text-muted-foreground">Estimated hours at rate</span>
            <span className="tabular-nums" style={{ fontWeight: 600 }}>~{Math.round(Number(projectBudget) / rateNum)}h</span>
          </div>
        )}

        <SectionDivider icon={Eye} label="Portal & visibility" />
        <Toggle checked={showPortalCosts} onChange={setShowPortalCosts} label="Show costs in client portal" description="When off, the client sees hours and activity but not dollar amounts" />

        <div>
          <Label>Internal notes</Label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How you met, referral source, scope ideas, anything useful..." rows={2} className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none" />
        </div>

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
export function EditClientModal({ open, onClose, client, onSave }: {
  open: boolean; onClose: () => void; client: any;
  onSave: (updates: any) => Promise<void>;
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

  useEffect(() => {
    if (client) {
      setName(client.name || ''); setContactName(client.contactName || '');
      setContactEmail(client.contactEmail || ''); setWebsite(client.website || '');
      setModel(client.model || 'Hourly'); setRate(String(client.rate || ''));
      setStatus(client.status || 'Active'); setRetainerTotal(String(client.retainerTotal || ''));
      setRetainerRemaining(String(client.retainerRemaining || ''));
      setShowPortalCosts(client.showPortalCosts !== false);
    }
  }, [client]);

  const rateNum = Number(rate) || 0;
  const retainerTotalNum = Number(retainerTotal) || 0;
  const retainerRemainingNum = Number(retainerRemaining) || 0;
  const retainerMonthlyValue = rateNum * retainerTotalNum;
  const retainerUsedPct = retainerTotalNum > 0 ? Math.round(((retainerTotalNum - retainerRemainingNum) / retainerTotalNum) * 100) : 0;

  const hasChanges = client && (
    name !== (client.name || '') || contactName !== (client.contactName || '') ||
    contactEmail !== (client.contactEmail || '') || website !== (client.website || '') ||
    model !== (client.model || 'Hourly') || rate !== String(client.rate || '') ||
    status !== (client.status || 'Active') || retainerTotal !== String(client.retainerTotal || '') ||
    retainerRemaining !== String(client.retainerRemaining || '') || showPortalCosts !== (client.showPortalCosts !== false)
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        name: name.trim(), contactName: contactName.trim(), contactEmail: contactEmail.trim(),
        website: website.trim(), model, rate: rateNum, status, showPortalCosts, trueHourlyRate: rateNum,
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
    <ModalShell open={open} onClose={onClose} title="Edit client" subtitle={client?.name ? `Editing ${client.name}` : undefined} wide>
      <div className="space-y-5">
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

        <SectionDivider icon={FolderKanban} label="Engagement" />
        <div>
          <Label>Status</Label>
          <div className="flex gap-2">
            <StatusPill active={status === 'Active'} onClick={() => setStatus('Active')} label="Active" dot="bg-primary" />
            <StatusPill active={status === 'Prospect'} onClick={() => setStatus('Prospect')} label="Prospect" dot="bg-muted-foreground" />
            <StatusPill active={status === 'Archived'} onClick={() => setStatus('Archived')} label="Archived" dot="bg-muted" />
          </div>
          {status === 'Archived' && (
            <div className="text-[11px] text-muted-foreground mt-1.5">Archived clients are hidden from active views. All data is preserved.</div>
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

        <SectionDivider icon={DollarSign} label="Financial terms" />
        <div>
          <Label>{model === 'Project' ? 'Effective rate' : 'Hourly rate'} ($/hr)</Label>
          <Input value={rate} onChange={e => setRate(e.target.value)} className="tabular-nums" />
          {client && rateNum > 0 && rateNum !== (client.rate || 0) && (
            <div className="text-[11px] text-muted-foreground mt-1">Changed from ${client.rate}/hr — future sessions will use this rate</div>
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
                  <span className="tabular-nums" style={{ fontWeight: 600 }}>{retainerRemainingNum}h remaining · {retainerUsedPct}% used</span>
                </div>
                <div className="h-1.5 bg-accent/60 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, ((retainerTotalNum - retainerRemainingNum) / retainerTotalNum) * 100))}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
                  <span>${retainerMonthlyValue.toLocaleString()}/mo</span>
                  <span>Resets 1st of month</span>
                </div>
              </div>
            )}
          </>
        )}

        <SectionDivider icon={Eye} label="Portal & visibility" />
        <Toggle checked={showPortalCosts} onChange={setShowPortalCosts} label="Show costs in client portal" description="When off, the client sees hours and activity but not dollar amounts" />

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="text-[12px] text-muted-foreground">{hasChanges ? 'Unsaved changes' : 'No changes'}</div>
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
  const [allocationType, setAllocationType] = useState<'general' | 'retainer' | 'project'>('general');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [clientProjects, setClientProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const allTags = workCategoryNames.length > 0 ? workCategoryNames : ['Design', 'Development', 'Meetings', 'Strategy', 'Prospecting'];
  const firstTag = allTags[0] || 'Design';
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && allTags.length > 0) {
      setSelectedTags([firstTag]);
      initializedRef.current = true;
    }
  }, [firstTag]);

  useEffect(() => {
    if (open && !sessionDate) setSessionDate(new Date().toISOString().split('T')[0]);
  }, [open]);

  useEffect(() => {
    if (preSelectedClient) setClientId(preSelectedClient);
    if (prefilledDuration) setDuration((prefilledDuration / 3600).toFixed(1));
  }, [preSelectedClient, prefilledDuration, open]);

  useEffect(() => {
    if (!clientId) {
      setClientProjects([]); setAllocationType('general'); setSelectedProjectId('');
      return;
    }
    const cached = getProjects(clientId);
    setClientProjects(cached);
    const client = clients.find(c => c.id === clientId);
    if (client?.model === 'Retainer') {
      setAllocationType('retainer'); setSelectedProjectId('');
    } else if (cached.length > 0) {
      const activeProject = cached.find((p: any) => p.status === 'In Progress');
      if (activeProject) { setAllocationType('project'); setSelectedProjectId(String(activeProject.id)); }
      else { setAllocationType('general'); setSelectedProjectId(''); }
    } else {
      setAllocationType('general'); setSelectedProjectId('');
    }
    setLoadingProjects(true);
    loadProjectsForClient(clientId)
      .then(projects => setClientProjects(projects))
      .catch(err => console.error('Failed to load projects for client:', err))
      .finally(() => setLoadingProjects(false));
  }, [clientId]);

  const reset = () => {
    setClientId(''); setTask(''); setDuration(''); setBillable(true);
    setSelectedTags([allTags[0] || 'Design']); setSessionDate(''); setNotes('');
    setAllocationType('general'); setSelectedProjectId(''); setClientProjects([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const activeClients = clients.filter(c => c.status === 'Active' || c.status === 'Prospect');
  const selectedClient = clients.find(c => c.id === clientId);
  const durationNum = parseFloat(duration) || 0;
  const revenue = billable && selectedClient ? Math.round(durationNum * selectedClient.rate) : 0;
  const selectedProject = allocationType === 'project' && selectedProjectId ? clientProjects.find((p: any) => String(p.id) === selectedProjectId) : null;

  const parsedDate = sessionDate ? new Date(sessionDate + 'T12:00:00') : new Date();
  const dateStr = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dateObj = new Date(sessionDate + 'T00:00:00');
  const diffDays = Math.round((today.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
  const dateGroupLabel = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : dateStr;

  const canSave = !!clientId && task.trim().length > 0 && durationNum > 0 && (allocationType !== 'project' || !!selectedProjectId);
  const selectableProjects = clientProjects.filter((p: any) => p.status !== 'Complete');
  const completedProjects = clientProjects.filter((p: any) => p.status === 'Complete');
  const allocationLabel = allocationType === 'retainer' ? 'retainer' : allocationType === 'project' && selectedProject ? selectedProject.name : 'general';

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        date: dateStr, dateGroup: dateGroupLabel, client: selectedClient?.name || '', clientId,
        task: task.trim(), tags: selectedTags, workTags: selectedTags, duration: durationNum,
        revenue, billable, notes: notes.trim(), allocationType,
        projectId: allocationType === 'project' ? selectedProjectId : null,
        projectName: selectedProject?.name || null,
      });
      reset(); onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Log session" subtitle="Record work you've completed" wide>
      <div className="space-y-5">
        <SectionDivider icon={Calendar} label="When & where" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all tabular-nums" />
            {diffDays > 0 && sessionDate && (
              <div className="text-[11px] text-muted-foreground mt-1">Backdating {diffDays} day{diffDays !== 1 ? 's' : ''} — will appear under "{dateGroupLabel}"</div>
            )}
          </div>
          <div>
            <Label>Client</Label>
            <Select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Select a client</option>
              {activeClients.map(c => (
                <option key={c.id} value={c.id}>{c.name} · {c.model}{c.rate ? ` · $${c.rate}/hr` : ''}</option>
              ))}
            </Select>
          </div>
        </div>

        {selectedClient && (
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
            <div className="w-6 h-6 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] text-primary" style={{ fontWeight: 600 }}>{selectedClient.name?.charAt(0)}</span>
            </div>
            <span>{selectedClient.model}</span>
            <span>·</span>
            <span className="tabular-nums">${selectedClient.rate}/hr</span>
            {selectedClient.model === 'Retainer' && selectedClient.retainerRemaining > 0 && (
              <><span>·</span><span className="tabular-nums">{selectedClient.retainerRemaining}h remaining this month</span></>
            )}
          </div>
        )}

        {selectedClient && (
          <>
            <SectionDivider icon={FolderKanban} label="Apply to" />
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => { setAllocationType('general'); setSelectedProjectId(''); }} className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-lg border transition-all duration-200 ${allocationType === 'general' ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'}`} style={{ fontWeight: 500 }}>
                <Clock className="w-3.5 h-3.5" /> General time
              </button>
              {selectedClient.model === 'Retainer' && (
                <button onClick={() => { setAllocationType('retainer'); setSelectedProjectId(''); }} className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-lg border transition-all duration-200 ${allocationType === 'retainer' ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'}`} style={{ fontWeight: 500 }}>
                  <Repeat className="w-3.5 h-3.5" /> Retainer
                  {selectedClient.retainerRemaining > 0 && <span className="text-[11px] opacity-70 tabular-nums ml-0.5">{selectedClient.retainerRemaining}h left</span>}
                </button>
              )}
              {selectableProjects.map((proj: any) => (
                <button key={proj.id} onClick={() => { setAllocationType('project'); setSelectedProjectId(String(proj.id)); }} className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-lg border transition-all duration-200 ${allocationType === 'project' && selectedProjectId === String(proj.id) ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'}`} style={{ fontWeight: 500 }}>
                  <FolderKanban className="w-3.5 h-3.5" /> {proj.name}
                  {proj.estimatedHours > 0 && <span className="text-[11px] opacity-70 tabular-nums ml-0.5">{proj.hours || 0}/{proj.estimatedHours}h</span>}
                </button>
              ))}
              {completedProjects.map((proj: any) => (
                <button key={proj.id} onClick={() => { setAllocationType('project'); setSelectedProjectId(String(proj.id)); }} className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-lg border transition-all duration-200 ${allocationType === 'project' && selectedProjectId === String(proj.id) ? 'bg-primary/6 border-primary/25 text-primary ring-1 ring-primary/15' : 'border-border text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/40'}`} style={{ fontWeight: 500 }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> {proj.name} <span className="text-[10px] opacity-60">done</span>
                </button>
              ))}
              {loadingProjects && <div className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</div>}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {allocationType === 'general' && 'Tracked as general client time — not applied to a specific project or retainer.'}
              {allocationType === 'retainer' && `This session's hours will be deducted from ${selectedClient.name}'s retainer balance.`}
              {allocationType === 'project' && selectedProject && `Hours and revenue will be added to "${selectedProject.name}" project totals.`}
              {allocationType === 'project' && !selectedProject && 'Select a project to apply this time to.'}
            </div>
          </>
        )}

        <SectionDivider icon={FileText} label="What you did" />
        <div>
          <Label>Description</Label>
          <input value={task} onChange={e => setTask(e.target.value)} placeholder="Brand refresh — icon exploration" className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" />
        </div>
        <div>
          <Label>Categories</Label>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(tag => (
              <button key={tag} onClick={() => toggleTag(tag)} className={`px-2.5 py-1.5 text-[12px] rounded-lg border transition-all duration-200 ${selectedTags.includes(tag) ? 'bg-primary/8 border-primary/20 text-primary ring-1 ring-primary/10' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'}`} style={{ fontWeight: 500 }}>{tag}</button>
            ))}
          </div>
        </div>
        <div>
          <Label>Duration (hours)</Label>
          <div className="grid grid-cols-4 gap-2">
            <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="2.5" className="tabular-nums col-span-1" />
            <div className="col-span-3 flex gap-1.5">
              {[0.5, 1, 1.5, 2, 3, 4].map(preset => (
                <button key={preset} onClick={() => setDuration(String(preset))} className={`flex-1 py-2 text-[12px] rounded-lg border transition-all duration-200 tabular-nums ${duration === String(preset) ? 'bg-primary/8 border-primary/20 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'}`} style={{ fontWeight: 500 }}>{preset}h</button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <Label hint="optional">Session notes</Label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Key decisions, blockers, next steps..." rows={2} className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none" />
        </div>

        <SectionDivider icon={DollarSign} label="Billing" />
        <Toggle checked={billable} onChange={setBillable} label="Billable time" description={billable ? 'This session will count toward client revenue' : 'Non-billable — internal or pro-bono work'} />

        {selectedClient && durationNum > 0 && (
          <div className="bg-accent/30 rounded-lg px-3.5 py-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">{billable ? 'Estimated revenue' : 'Time value'}{selectedClient.rate ? ` @ $${selectedClient.rate}/hr` : ''}</span>
              <span className={`tabular-nums ${billable ? 'text-primary' : 'text-muted-foreground'}`} style={{ fontWeight: 600 }}>{billable ? `$${revenue.toLocaleString()}` : '$0 (non-billable)'}</span>
            </div>
            {allocationType === 'retainer' && billable && selectedClient.model === 'Retainer' && selectedClient.retainerTotal > 0 && (
              <div className="mt-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                  <span>Retainer after this session</span>
                  <span className="tabular-nums" style={{ fontWeight: 500 }}>{Math.max(0, (selectedClient.retainerRemaining || 0) - durationNum).toFixed(1)}h of {selectedClient.retainerTotal}h remaining</span>
                </div>
                <div className="h-1.5 bg-accent/60 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, ((selectedClient.retainerTotal - Math.max(0, (selectedClient.retainerRemaining || 0) - durationNum)) / selectedClient.retainerTotal) * 100))}%` }} />
                </div>
              </div>
            )}
            {allocationType === 'project' && selectedProject && (
              <div className="mt-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                  <span>"{selectedProject.name}" after this session</span>
                  <span className="tabular-nums" style={{ fontWeight: 500 }}>{((selectedProject.hours || 0) + durationNum).toFixed(1)}h{selectedProject.estimatedHours > 0 ? ` of ${selectedProject.estimatedHours}h` : ''}</span>
                </div>
                {selectedProject.estimatedHours > 0 && (
                  <div className="h-1.5 bg-accent/60 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${Math.min(100, (((selectedProject.hours || 0) + durationNum) / selectedProject.estimatedHours) * 100)}%` }} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="text-[12px] text-muted-foreground">
            {canSave ? `${durationNum}h ${billable ? 'billable' : 'non-billable'} · ${allocationLabel} · ${dateGroupLabel}` : allocationType === 'project' && !selectedProjectId ? 'Select a project to apply this time to' : 'Fill in client, description, and duration'}
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
  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(), description: description.trim(), status,
        estimatedHours: hoursNum, totalValue: valueNum, hours: 0, revenue: 0,
        startDate: startDate || undefined, endDate: endDate || undefined,
      }, clientId || preSelectedClientId || undefined);
      reset(); onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Add project" subtitle="Create a new project" wide>
      <div className="space-y-5">
        <SectionDivider icon={FolderKanban} label="Project details" />
        <div>
          <Label>Project name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Brand Refresh" autoFocus />
        </div>
        <div>
          <Label hint="optional">Description</Label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief project scope..." rows={2} className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none" />
        </div>

        {showClientSelector && (
          <div>
            <Label>Client</Label>
            <Select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Select a client</option>
              {activeClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        )}

        <div>
          <Label>Status</Label>
          <div className="flex gap-2 flex-wrap">
            <StatusPill active={status === 'Not Started'} onClick={() => setStatus('Not Started')} label="Not Started" dot="bg-muted-foreground" />
            <StatusPill active={status === 'In Progress'} onClick={() => setStatus('In Progress')} label="In Progress" dot="bg-primary" />
            <StatusPill active={status === 'On Hold'} onClick={() => setStatus('On Hold')} label="On Hold" dot="bg-yellow-500" />
            <StatusPill active={status === 'Complete'} onClick={() => setStatus('Complete')} label="Complete" dot="bg-green-500" />
          </div>
        </div>

        <SectionDivider icon={DollarSign} label="Budget & timeline" />
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
        {effectiveRate > 0 && (
          <div className="flex items-center justify-between text-[13px] px-3 py-2 bg-accent/30 rounded-lg">
            <span className="text-muted-foreground">Effective rate</span>
            <span className="tabular-nums" style={{ fontWeight: 600 }}>${effectiveRate}/hr</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start date</Label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all tabular-nums" />
          </div>
          <div>
            <Label hint="optional">End date</Label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all tabular-nums" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="text-[12px] text-muted-foreground">{canSave ? `${status} · ${hoursNum > 0 ? `${hoursNum}h estimated` : 'No estimate'}` : 'Enter a project name'}</div>
          <div className="flex gap-2">
            <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-[13px] rounded-lg border border-border text-muted-foreground hover:bg-accent/40 transition-all" style={{ fontWeight: 500 }}>Cancel</button>
            <PrimaryBtn onClick={handleSave} disabled={saving || !canSave}>{saving ? 'Creating...' : 'Add project'}</PrimaryBtn>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
