import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  ChevronLeft, User, FolderKanban, DollarSign, Eye, Clock, Repeat,
  MapPin, Phone, MessageSquare, Flag, ShieldAlert, Plus, Trash2,
  ChevronDown, X, Info, Loader2, GripVertical, Globe,
} from 'lucide-react';
import { useData } from '../data/DataContext';
import { usePlan } from '@/data/PlanContext';
import { useRoleAccess } from '@/data/useRoleAccess';
import { supabase } from '@/integrations/supabase/client';
import { SettingsSaveBar, UnsavedChangesDialog } from '@/components/SettingsSaveBar';
import * as settingsApi from '@/data/settingsApi';

// ── Types ───────────────────────────────────────────────────────────

type FieldType = 'text' | 'textarea' | 'toggle' | 'checkbox' | 'select';

interface CustomField {
  id: string;
  label: string;
  type: FieldType;
  value: string | boolean;
  options?: string[];
}

// ── Shared primitives ───────────────────────────────────────────────

function SectionCard({ icon: Icon, title, description, children, badge }: {
  icon: any; title: string; description?: string; children: React.ReactNode; badge?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>{title}</span>
          {badge}
        </div>
        {description && <p className="text-[12px] text-muted-foreground mt-1 ml-[26px]">{description}</p>}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-[13px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground/60 ml-1">({hint})</span>}
    </label>
  );
}

function FieldInput({ value, onChange, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
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

function FieldTextarea({ value, onChange, rows = 3, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none"
      {...props}
    />
  );
}

function ToggleSwitch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-[13px]" style={{ fontWeight: 500 }}>{label}</div>
        <div className="text-[12px] text-muted-foreground">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-primary' : 'bg-[var(--switch-background)]'}`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`}
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
        />
      </button>
    </div>
  );
}

function ModelButton({ active, onClick, icon: Icon, label, description }: {
  active: boolean; onClick: () => void; icon: any; label: string; description: string;
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

// ── Level Selectors ─────────────────────────────────────────────────

const LEVELS = ['Low', 'Medium', 'High'] as const;

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  Low: { color: 'var(--muted-foreground)', bg: 'var(--accent)', icon: '○' },
  Medium: { color: 'hsl(45 60% 50%)', bg: 'hsl(45 60% 50% / 0.1)', icon: '◑' },
  High: { color: 'var(--destructive)', bg: 'color-mix(in srgb, var(--destructive) 12%, transparent)', icon: '●' },
};

const RISK_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  Low: { color: 'hsl(142 71% 45%)', bg: 'hsl(142 71% 45% / 0.1)', icon: '✓' },
  Medium: { color: 'hsl(45 60% 50%)', bg: 'hsl(45 60% 50% / 0.1)', icon: '⚠' },
  High: { color: 'var(--destructive)', bg: 'color-mix(in srgb, var(--destructive) 12%, transparent)', icon: '✕' },
};

function LevelSelector({ value, onChange, config, label }: {
  value: string; onChange: (v: string) => void;
  config: Record<string, { color: string; bg: string; icon: string }>;
  label: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-1.5">
        {LEVELS.map(level => {
          const c = config[level];
          const active = value === level.toLowerCase() || value === level;
          return (
            <button
              key={level}
              onClick={() => onChange(level.toLowerCase())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-all"
              style={{
                fontWeight: 500,
                borderColor: active ? c.color : 'hsl(var(--border))',
                background: active ? c.bg : 'transparent',
                color: active ? c.color : 'hsl(var(--muted-foreground))',
              }}
            >
              <span className="text-[11px]">{c.icon}</span>
              {level}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Custom Field Editor ─────────────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'toggle', label: 'Toggle' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Select' },
];

function CustomFieldEditor({ field, onChange, onRemove }: {
  field: CustomField; onChange: (f: CustomField) => void; onRemove: () => void;
}) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="border border-border rounded-lg p-3 bg-accent/20 space-y-2.5">
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 mt-2 flex-shrink-0" />
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
          <FieldInput
            value={field.label}
            onChange={e => onChange({ ...field, label: e.target.value })}
            placeholder="Label (e.g. Industry)"
            maxLength={50}
          />
          <div className="relative">
            <select
              value={field.type}
              onChange={e => {
                const newType = e.target.value as FieldType;
                const newField: CustomField = { ...field, type: newType };
                if (newType === 'toggle' || newType === 'checkbox') newField.value = false;
                else if (newType === 'select') { newField.value = ''; newField.options = newField.options?.length ? newField.options : ['']; }
                else newField.value = typeof field.value === 'string' ? field.value : '';
                onChange(newField);
              }}
              className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all appearance-none pr-7"
            >
              {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive transition-colors mt-1 flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Value input based on type */}
      <div className="ml-[22px]">
        {field.type === 'text' && (
          <FieldInput
            value={typeof field.value === 'string' ? field.value : ''}
            onChange={e => onChange({ ...field, value: e.target.value })}
            placeholder="Value"
            maxLength={200}
          />
        )}
        {field.type === 'textarea' && (
          <FieldTextarea
            value={typeof field.value === 'string' ? field.value : ''}
            onChange={e => onChange({ ...field, value: e.target.value })}
            placeholder="Value"
            maxLength={1000}
          />
        )}
        {field.type === 'toggle' && (
          <button
            onClick={() => onChange({ ...field, value: !field.value })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${field.value ? 'bg-primary' : 'bg-[var(--switch-background)]'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${field.value ? 'translate-x-4' : 'translate-x-0.5'}`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }} />
          </button>
        )}
        {field.type === 'checkbox' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!field.value}
              onChange={e => onChange({ ...field, value: e.target.checked })}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-[13px] text-muted-foreground">Enabled</span>
          </label>
        )}
        {field.type === 'select' && (
          <div className="space-y-2">
            <div className="relative">
              <select
                value={typeof field.value === 'string' ? field.value : ''}
                onChange={e => onChange({ ...field, value: e.target.value })}
                className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all appearance-none pr-7"
              >
                <option value="">Select…</option>
                {(field.options || []).filter(Boolean).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="text-[11px] text-primary hover:text-primary/80 transition-colors"
              style={{ fontWeight: 500 }}
            >
              {showOptions ? 'Hide options' : 'Edit options'}
            </button>
            <AnimatePresence>
              {showOptions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-1.5"
                >
                  {(field.options || []).map((opt, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <FieldInput
                        value={opt}
                        onChange={e => {
                          const newOpts = [...(field.options || [])];
                          newOpts[i] = e.target.value;
                          onChange({ ...field, options: newOpts });
                        }}
                        placeholder={`Option ${i + 1}`}
                        maxLength={50}
                      />
                      <button
                        onClick={() => {
                          const newOpts = (field.options || []).filter((_, j) => j !== i);
                          onChange({ ...field, options: newOpts, value: field.value === opt ? '' : field.value });
                        }}
                        className="p-0.5 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(field.options || []).length < 8 && (
                    <button
                      onClick={() => onChange({ ...field, options: [...(field.options || []), ''] })}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      style={{ fontWeight: 500 }}
                    >
                      <Plus className="w-3 h-3" /> Add option
                    </button>
                  )}
                  <div className="text-[10px] text-muted-foreground/60">{(field.options || []).length}/8 options</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pro badge ───────────────────────────────────────────────────────

function PlanBadge({ label }: { label: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary" style={{ fontWeight: 600 }}>
      {label}
    </span>
  );
}

// ── Main Page ───────────────────────────────────────────────────────

export default function ClientEdit() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { clients, updateClient, workspaceId } = useData();
  const { isAtLeast } = usePlan();
  const { canEditClients } = useRoleAccess();

  const isPro = isAtLeast('pro');
  const isStudio = isAtLeast('studio');

  const client = clients.find(c => c.id === clientId);

  // ── Identity fields
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');

  // ── Contact & Location (Pro)
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  // ── Engagement
  const [model, setModel] = useState<'Hourly' | 'Retainer' | 'Project'>('Hourly');
  const [status, setStatus] = useState<'Active' | 'Prospect' | 'Archived'>('Active');

  // ── Financial
  const [rate, setRate] = useState('');
  const [retainerTotal, setRetainerTotal] = useState('');
  const [retainerRemaining, setRetainerRemaining] = useState('');

  // ── Portal & Visibility
  const [showPortalCosts, setShowPortalCosts] = useState(true);
  const [portalGreeting, setPortalGreeting] = useState('');

  // ── Flags (Pro)
  const [priorityLevel, setPriorityLevel] = useState('medium');
  const [riskLevel, setRiskLevel] = useState('low');

  // ── Custom Fields (Studio) — split: workspace-level values + client-specific fields
  interface WsFieldSchema { id: string; label: string; type: FieldType; options?: string[]; }
  const [wsFieldSchemas, setWsFieldSchemas] = useState<WsFieldSchema[]>([]);
  const [wsFieldValues, setWsFieldValues] = useState<Record<string, string | boolean>>({});
  const [clientFields, setClientFields] = useState<CustomField[]>([]);

  // ── Branding (Studio)
  const [clientFaviconUrl, setClientFaviconUrl] = useState<string | null>(null);
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Populate fields from client
  useEffect(() => {
    if (!client) return;
    setName(client.name || '');
    setContactName(client.contactName || '');
    setContactEmail(client.contactEmail || '');
    setWebsite(client.website || '');
    setAddress(client.address || '');
    setPhone(client.phone || '');
    setModel(client.model || 'Hourly');
    setStatus(client.status || 'Active');
    setRate(String(client.rate || ''));
    setRetainerTotal(String(client.retainerTotal || ''));
    setRetainerRemaining(String(client.retainerRemaining || ''));
    setShowPortalCosts(client.showPortalCosts !== false);
    setPortalGreeting(client.portalGreeting || '');
    setPriorityLevel(client.priorityLevel || 'medium');
    setRiskLevel(client.riskLevel || 'low');
    // Parse custom fields — new format: { workspace: {id: value}, client: [CustomField] }
    const cf = client.customFields;
    if (cf && typeof cf === 'object' && !Array.isArray(cf) && 'workspace' in cf) {
      setWsFieldValues((cf as any).workspace || {});
      setClientFields(Array.isArray((cf as any).client) ? (cf as any).client : []);
    } else if (Array.isArray(cf)) {
      // Legacy: all fields were client-specific, migrate first 3 only
      setClientFields(cf.slice(0, 3));
      setWsFieldValues({});
    } else {
      setWsFieldValues({});
      setClientFields([]);
    }
    setInitialized(true);
  }, [client]);

  // Load workspace-level field schemas
  useEffect(() => {
    if (!isStudio) return;
    settingsApi.loadSetting('custom_fields_schema').then((schemas) => {
      if (Array.isArray(schemas)) setWsFieldSchemas(schemas);
    });
  }, [isStudio]);

  // Load client logos
  useEffect(() => {
    if (!clientId || !workspaceId || !isStudio) return;
    supabase.storage.from('logos').list(workspaceId, { limit: 30 }).then(({ data: files }) => {
      const fav = files?.find((f: any) => f.name.startsWith(`client-${clientId}-favicon.`));
      if (fav) setClientFaviconUrl(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${workspaceId}/${fav.name}`);
      const logo = files?.find((f: any) => f.name.startsWith(`client-${clientId}.`) && !f.name.includes('-favicon'));
      if (logo) setClientLogoUrl(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${workspaceId}/${logo.name}`);
    });
  }, [clientId, workspaceId, isStudio]);

  // Dirty check
  const isDirty = initialized && client && (
    name !== (client.name || '') ||
    contactName !== (client.contactName || '') ||
    contactEmail !== (client.contactEmail || '') ||
    website !== (client.website || '') ||
    address !== (client.address || '') ||
    phone !== (client.phone || '') ||
    model !== (client.model || 'Hourly') ||
    status !== (client.status || 'Active') ||
    rate !== String(client.rate || '') ||
    retainerTotal !== String(client.retainerTotal || '') ||
    retainerRemaining !== String(client.retainerRemaining || '') ||
    showPortalCosts !== (client.showPortalCosts !== false) ||
    portalGreeting !== (client.portalGreeting || '') ||
    priorityLevel !== (client.priorityLevel || 'medium') ||
    riskLevel !== (client.riskLevel || 'low') ||
    JSON.stringify({ workspace: wsFieldValues, client: clientFields }) !== JSON.stringify(
      (() => {
        const cf = client.customFields;
        if (cf && typeof cf === 'object' && !Array.isArray(cf) && 'workspace' in cf) return { workspace: (cf as any).workspace || {}, client: (cf as any).client || [] };
        if (Array.isArray(cf)) return { workspace: {}, client: cf.slice(0, 3) };
        return { workspace: {}, client: [] };
      })()
    )
  );

  // ── Navigation guard ──────────────────────────────────────────────
  // Warn on browser close/reload
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Block react-router navigation
  const blocker = useBlocker(isDirty || false);
  const [showNavGuard, setShowNavGuard] = useState(false);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowNavGuard(true);
    }
  }, [blocker.state]);

  const rateNum = Number(rate) || 0;
  const retainerTotalNum = Number(retainerTotal) || 0;
  const retainerRemainingNum = Number(retainerRemaining) || 0;
  const retainerMonthlyValue = rateNum * retainerTotalNum;
  const retainerUsedPct = retainerTotalNum > 0 ? Math.round(((retainerTotalNum - retainerRemainingNum) / retainerTotalNum) * 100) : 0;

  const handleSave = async () => {
    if (!client) return;
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

      if (isPro) {
        updates.address = address.trim();
        updates.phone = phone.trim();
        updates.portalGreeting = portalGreeting.trim();
        updates.priorityLevel = priorityLevel;
        updates.riskLevel = riskLevel;
      }

      if (isStudio) {
        updates.customFields = { workspace: wsFieldValues, client: clientFields };
      }

      await updateClient(client.id, updates);
      toast.success('Client saved');
      navigate(`/clients/${clientId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    navigate(`/clients/${clientId}`);
  };

  const addClientField = () => {
    if (clientFields.length >= 3) return;
    setClientFields(prev => [...prev, { id: crypto.randomUUID(), label: '', type: 'text', value: '' }]);
  };

  // Logo upload handlers
  const handleFaviconUpload = async (file: File) => {
    if (!workspaceId || !clientId) return;
    setUploadingFavicon(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${workspaceId}/client-${clientId}-favicon.${ext}`;
      const { data: existing } = await supabase.storage.from('logos').list(workspaceId, { limit: 30 });
      const old = existing?.find((f: any) => f.name.startsWith(`client-${clientId}-favicon.`));
      if (old) await supabase.storage.from('logos').remove([`${workspaceId}/${old.name}`]);
      const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
      if (error) throw new Error(error.message);
      setClientFaviconUrl(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${path}`);
      toast.success('Favicon uploaded');
    } catch (err: any) { toast.error(err.message || 'Upload failed'); }
    finally { setUploadingFavicon(false); }
  };

  const handleLogoUpload = async (file: File) => {
    if (!workspaceId || !clientId) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${workspaceId}/client-${clientId}.${ext}`;
      const { data: existing } = await supabase.storage.from('logos').list(workspaceId, { limit: 30 });
      const old = existing?.find((f: any) => f.name.startsWith(`client-${clientId}.`) && !f.name.includes('-favicon'));
      if (old) await supabase.storage.from('logos').remove([`${workspaceId}/${old.name}`]);
      const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
      if (error) throw new Error(error.message);
      setClientLogoUrl(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${path}`);
      toast.success('Logo uploaded');
    } catch (err: any) { toast.error(err.message || 'Upload failed'); }
    finally { setUploadingLogo(false); }
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto px-4 md:px-0 pb-28"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button
          onClick={() => navigate(`/clients/${clientId}`)}
          className="p-1.5 rounded-lg hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[20px] text-foreground" style={{ fontWeight: 600 }}>Edit client</h1>
          <p className="text-[13px] text-muted-foreground">{client.name}</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* ── Identity ──────────────────────────── */}
        <SectionCard icon={User} title="Identity">
          <div>
            <FieldLabel>Client or company name</FieldLabel>
            <FieldInput value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Primary contact</FieldLabel>
              <FieldInput value={contactName} onChange={e => setContactName(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <FieldInput value={contactEmail} onChange={e => setContactEmail(e.target.value)} type="email" />
            </div>
          </div>
          <div>
            <FieldLabel hint="no https needed">Website</FieldLabel>
            <FieldInput value={website} onChange={e => setWebsite(e.target.value)} />
          </div>
        </SectionCard>

        {/* ── Contact & Location (Pro) ──────────── */}
        {isPro && (
          <SectionCard icon={MapPin} title="Contact & Location" badge={<PlanBadge label="Pro" />}>
            <div>
              <FieldLabel>Address</FieldLabel>
              <FieldTextarea value={address} onChange={e => setAddress(e.target.value)} rows={2} placeholder="Street, city, state, zip" />
            </div>
            <div>
              <FieldLabel>Phone number</FieldLabel>
              <FieldInput value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+1 (555) 000-0000" />
            </div>
          </SectionCard>
        )}

        {/* ── Engagement ────────────────────────── */}
        <SectionCard icon={FolderKanban} title="Engagement">
          <div>
            <FieldLabel>Status</FieldLabel>
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
            <FieldLabel>Billing model</FieldLabel>
            <div className="flex gap-2">
              <ModelButton active={model === 'Hourly'} onClick={() => setModel('Hourly')} icon={Clock} label="Hourly" description="Bill per hour tracked" />
              <ModelButton active={model === 'Retainer'} onClick={() => setModel('Retainer')} icon={Repeat} label="Retainer" description="Fixed monthly hours" />
              <ModelButton active={model === 'Project'} onClick={() => setModel('Project')} icon={FolderKanban} label="Project" description="Fixed scope & price" />
            </div>
          </div>
        </SectionCard>

        {/* ── Financial Terms ───────────────────── */}
        <SectionCard icon={DollarSign} title="Financial terms">
          <div>
            <FieldLabel>{model === 'Project' ? 'Effective rate' : 'Hourly rate'} ($/hr)</FieldLabel>
            <FieldInput value={rate} onChange={e => setRate(e.target.value)} className="tabular-nums" />
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
                  <FieldLabel>Hours per month</FieldLabel>
                  <FieldInput value={retainerTotal} onChange={e => setRetainerTotal(e.target.value)} className="tabular-nums" />
                </div>
                <div>
                  <FieldLabel hint="adjust manually if needed">Remaining this month</FieldLabel>
                  <FieldInput value={retainerRemaining} onChange={e => setRetainerRemaining(e.target.value)} className="tabular-nums" />
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
                        background: retainerUsedPct > 85 ? '#c27272' : retainerUsedPct > 70 ? '#bfa044' : 'linear-gradient(90deg, #5ea1bf, #7fb8d1)',
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
        </SectionCard>

        {/* ── Portal & Visibility ───────────────── */}
        <SectionCard icon={Eye} title="Portal & Visibility">
          <ToggleSwitch
            checked={showPortalCosts}
            onChange={setShowPortalCosts}
            label="Show costs in client portal"
            description="When off, the client sees hours and activity but not dollar amounts"
          />
          {isPro && (
            <div>
              <FieldLabel hint="shown on their portal page">Custom portal greeting</FieldLabel>
              <FieldTextarea
                value={portalGreeting}
                onChange={e => setPortalGreeting(e.target.value)}
                rows={2}
                placeholder="Welcome! Here's an overview of our work together…"
                maxLength={500}
              />
            </div>
          )}
        </SectionCard>

        {/* ── Client Flags (Pro) ────────────────── */}
        {isPro && (
          <SectionCard icon={Flag} title="Client Flags" badge={<PlanBadge label="Pro" />} description="Quick visual indicators for priority and risk assessment">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <LevelSelector value={priorityLevel} onChange={setPriorityLevel} config={PRIORITY_CONFIG} label="Priority level" />
              <LevelSelector value={riskLevel} onChange={setRiskLevel} config={RISK_CONFIG} label="Risk level" />
            </div>
          </SectionCard>
        )}

        {/* ── Custom Fields (Studio) ────────────── */}
        {isStudio && (
          <SectionCard icon={Plus} title="Custom Fields" badge={<PlanBadge label="Studio" />} description="Workspace fields apply to all clients. You can also add fields unique to this client.">

            {/* Workspace-level fields (schema from Settings) */}
            {wsFieldSchemas.filter(s => s.label).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Globe className="w-3 h-3 text-muted-foreground/60" />
                  <span className="text-[11px] text-muted-foreground" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workspace fields</span>
                  <span className="text-[10px] text-muted-foreground/50">· Managed in Settings</span>
                </div>
                {wsFieldSchemas.filter(s => s.label).map(schema => {
                  const val = wsFieldValues[schema.id];
                  return (
                    <div key={schema.id} className="border border-border/60 rounded-lg p-3 bg-accent/10">
                      <FieldLabel>{schema.label}</FieldLabel>
                      {schema.type === 'text' && (
                        <FieldInput
                          value={typeof val === 'string' ? val : ''}
                          onChange={e => setWsFieldValues(prev => ({ ...prev, [schema.id]: e.target.value }))}
                          placeholder="Enter value…"
                          maxLength={200}
                        />
                      )}
                      {schema.type === 'textarea' && (
                        <FieldTextarea
                          value={typeof val === 'string' ? val : ''}
                          onChange={e => setWsFieldValues(prev => ({ ...prev, [schema.id]: e.target.value }))}
                          placeholder="Enter value…"
                          maxLength={1000}
                        />
                      )}
                      {schema.type === 'toggle' && (
                        <button
                          onClick={() => setWsFieldValues(prev => ({ ...prev, [schema.id]: !prev[schema.id] }))}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${val ? 'bg-primary' : 'bg-[var(--switch-background)]'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${val ? 'translate-x-4' : 'translate-x-0.5'}`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }} />
                        </button>
                      )}
                      {schema.type === 'checkbox' && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!val}
                            onChange={e => setWsFieldValues(prev => ({ ...prev, [schema.id]: e.target.checked }))}
                            className="w-4 h-4 rounded border-border accent-primary"
                          />
                          <span className="text-[13px] text-muted-foreground">Enabled</span>
                        </label>
                      )}
                      {schema.type === 'select' && (
                        <div className="relative">
                          <select
                            value={typeof val === 'string' ? val : ''}
                            onChange={e => setWsFieldValues(prev => ({ ...prev, [schema.id]: e.target.value }))}
                            className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all appearance-none pr-7"
                          >
                            <option value="">Select…</option>
                            {(schema.options || []).filter(Boolean).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Divider between workspace and client fields */}
            {wsFieldSchemas.filter(s => s.label).length > 0 && (
              <div className="border-t border-border my-4" />
            )}

            {/* Client-specific fields */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 mb-1">
                <User className="w-3 h-3 text-muted-foreground/60" />
                <span className="text-[11px] text-muted-foreground" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client-specific fields</span>
                <span className="text-[10px] text-muted-foreground/50">· Unique to this client</span>
              </div>
              {clientFields.map((field, idx) => (
                <CustomFieldEditor
                  key={field.id}
                  field={field}
                  onChange={f => setClientFields(prev => prev.map((existing, i) => i === idx ? f : existing))}
                  onRemove={() => setClientFields(prev => prev.filter((_, i) => i !== idx))}
                />
              ))}
            </div>
            {clientFields.length < 3 && (
              <button
                onClick={addClientField}
                className="flex items-center gap-2 px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:bg-accent/30 transition-all w-full justify-center"
                style={{ fontWeight: 500 }}
              >
                <Plus className="w-3.5 h-3.5" /> Add client field
                <span className="text-[11px] text-muted-foreground/60 ml-1">{clientFields.length}/3</span>
              </button>
            )}
          </SectionCard>
        )}

        {/* ── Client Branding (Studio) ──────────── */}
        {isStudio && workspaceId && (
          <SectionCard icon={User} title="Client Branding" badge={<PlanBadge label="Studio" />} description="Logos appear on this client's portal and detail view">
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
                      const { data: existing } = await supabase.storage.from('logos').list(workspaceId, { limit: 30 });
                      const match = existing?.find((f: any) => f.name.startsWith(`client-${clientId}-favicon.`));
                      if (match) await supabase.storage.from('logos').remove([`${workspaceId}/${match.name}`]);
                      setClientFaviconUrl(null);
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
            <input ref={faviconInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
              const file = e.target.files?.[0]; e.target.value = '';
              if (file) handleFaviconUpload(file);
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
                      const { data: existing } = await supabase.storage.from('logos').list(workspaceId, { limit: 30 });
                      const match = existing?.find((f: any) => f.name.startsWith(`client-${clientId}.`) && !f.name.includes('-favicon'));
                      if (match) await supabase.storage.from('logos').remove([`${workspaceId}/${match.name}`]);
                      setClientLogoUrl(null);
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
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
              const file = e.target.files?.[0]; e.target.value = '';
              if (file) handleLogoUpload(file);
            }} />
          </SectionCard>
        )}
      </div>

      {/* Sticky save bar */}
      <SettingsSaveBar
        isDirty={!!isDirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      {/* Navigation guard dialog */}
      <UnsavedChangesDialog
        open={showNavGuard}
        onDiscard={() => {
          setShowNavGuard(false);
          blocker.proceed?.();
        }}
        onSave={async () => {
          await handleSave();
          setShowNavGuard(false);
          blocker.proceed?.();
        }}
        onCancel={() => {
          setShowNavGuard(false);
          blocker.reset?.();
        }}
        saving={saving}
      />
    </motion.div>
  );
}
