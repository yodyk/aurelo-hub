import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown, MapPin, Phone, MessageSquare, Flag, ShieldAlert,
  Plus, Trash2, Save, X, GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePlan } from '@/data/PlanContext';
import { FeatureGate } from './FeatureGate';

// ── Types ───────────────────────────────────────────────────────────

type FieldType = 'text' | 'textarea' | 'toggle' | 'checkbox' | 'select';

interface CustomField {
  id: string;
  label: string;
  type: FieldType;
  value: string | boolean;
  options?: string[]; // for select type
}

interface ClientDetailsData {
  address?: string;
  phone?: string;
  portalGreeting?: string;
  priorityLevel?: string;
  riskLevel?: string;
  customFields?: CustomField[];
}

interface ClientDetailsPanelProps {
  client: any;
  onSave: (updates: any) => Promise<void>;
}

// ── Priority / Risk helpers ─────────────────────────────────────────

const LEVELS = ['Low', 'Medium', 'High'] as const;

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  Low: { color: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--accent))', icon: '○' },
  Medium: { color: 'hsl(45 60% 50%)', bg: 'hsl(45 60% 50% / 0.1)', icon: '◑' },
  High: { color: 'hsl(var(--destructive))', bg: 'hsl(var(--destructive) / 0.1)', icon: '●' },
};

const RISK_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  Low: { color: 'hsl(142 71% 45%)', bg: 'hsl(142 71% 45% / 0.1)', icon: '✓' },
  Medium: { color: 'hsl(45 60% 50%)', bg: 'hsl(45 60% 50% / 0.1)', icon: '⚠' },
  High: { color: 'hsl(var(--destructive))', bg: 'hsl(var(--destructive) / 0.1)', icon: '✕' },
};

function LevelSelector({ value, onChange, config, label }: {
  value: string; onChange: (v: string) => void;
  config: Record<string, { color: string; bg: string; icon: string }>;
  label: string;
}) {
  return (
    <div>
      <div className="text-[12px] text-muted-foreground mb-2" style={{ fontWeight: 500 }}>{label}</div>
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

// ── Field Type Selector ─────────────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'toggle', label: 'Toggle' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Select' },
];

// ── Custom Field Row ────────────────────────────────────────────────

function CustomFieldEditor({ field, onChange, onRemove }: {
  field: CustomField;
  onChange: (f: CustomField) => void;
  onRemove: () => void;
}) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="border border-border rounded-lg p-3 bg-card space-y-2.5">
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 mt-2 flex-shrink-0" />
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
          <input
            type="text"
            value={field.label}
            onChange={e => onChange({ ...field, label: e.target.value })}
            placeholder="Label (e.g. Industry)"
            className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
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
              className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-transparent focus:outline-none focus:ring-1 focus:ring-ring appearance-none pr-7"
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
      <div className="pl-5.5 ml-[14px]">
        {field.type === 'text' && (
          <input
            type="text"
            value={typeof field.value === 'string' ? field.value : ''}
            onChange={e => onChange({ ...field, value: e.target.value })}
            placeholder="Value"
            className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
            maxLength={200}
          />
        )}
        {field.type === 'textarea' && (
          <textarea
            value={typeof field.value === 'string' ? field.value : ''}
            onChange={e => onChange({ ...field, value: e.target.value })}
            placeholder="Value"
            rows={3}
            className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-transparent focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            maxLength={1000}
          />
        )}
        {field.type === 'toggle' && (
          <button
            onClick={() => onChange({ ...field, value: !field.value })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${field.value ? 'bg-primary' : 'bg-accent'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${field.value ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
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
                className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-transparent focus:outline-none focus:ring-1 focus:ring-ring appearance-none pr-7"
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
                      <input
                        type="text"
                        value={opt}
                        onChange={e => {
                          const newOpts = [...(field.options || [])];
                          newOpts[i] = e.target.value;
                          onChange({ ...field, options: newOpts });
                        }}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 px-2.5 py-1 text-[12px] rounded-md border border-border bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
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

// ── Read-only field display ─────────────────────────────────────────

function CustomFieldDisplay({ field }: { field: CustomField }) {
  if (!field.label) return null;
  let displayValue: React.ReactNode = '—';

  if (field.type === 'toggle' || field.type === 'checkbox') {
    displayValue = field.value ? (
      <span className="text-primary text-[12px]" style={{ fontWeight: 500 }}>Yes</span>
    ) : (
      <span className="text-muted-foreground text-[12px]">No</span>
    );
  } else if (typeof field.value === 'string' && field.value) {
    displayValue = <span className="text-[13px] text-foreground">{field.value}</span>;
  }

  return (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>{field.label}</span>
      <div className="text-right max-w-[60%]">{displayValue}</div>
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────

export default function ClientDetailsPanel({ client, onSave }: ClientDetailsPanelProps) {
  const { isAtLeast } = usePlan();
  const isPro = isAtLeast('pro');
  const isStudio = isAtLeast('studio');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  // Pro fields
  const [address, setAddress] = useState(client.address || '');
  const [phone, setPhone] = useState(client.phone || '');
  const [portalGreeting, setPortalGreeting] = useState(client.portalGreeting || '');
  const [priorityLevel, setPriorityLevel] = useState(client.priorityLevel || 'medium');
  const [riskLevel, setRiskLevel] = useState(client.riskLevel || 'low');

  // Studio custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>(
    Array.isArray(client.customFields) ? client.customFields : []
  );

  const [saving, setSaving] = useState(false);

  // Sync from client prop
  useEffect(() => {
    setAddress(client.address || '');
    setPhone(client.phone || '');
    setPortalGreeting(client.portalGreeting || '');
    setPriorityLevel(client.priorityLevel || 'medium');
    setRiskLevel(client.riskLevel || 'low');
    setCustomFields(Array.isArray(client.customFields) ? client.customFields : []);
  }, [client]);

  if (!isPro) return null;

  const hasProData = address || phone || portalGreeting || priorityLevel !== 'medium' || riskLevel !== 'low';
  const hasCustomData = customFields.some(f => f.label);
  const hasAnyData = hasProData || hasCustomData;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        address: address.trim(),
        phone: phone.trim(),
        portalGreeting: portalGreeting.trim(),
        priorityLevel,
        riskLevel,
        customFields: isStudio ? customFields : undefined,
      });
      setEditing(false);
      toast.success('Client details saved');
    } catch {
      toast.error('Failed to save details');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setAddress(client.address || '');
    setPhone(client.phone || '');
    setPortalGreeting(client.portalGreeting || '');
    setPriorityLevel(client.priorityLevel || 'medium');
    setRiskLevel(client.riskLevel || 'low');
    setCustomFields(Array.isArray(client.customFields) ? client.customFields : []);
    setEditing(false);
  };

  const addCustomField = () => {
    if (customFields.length >= 10) return;
    setCustomFields(prev => [...prev, { id: crypto.randomUUID(), label: '', type: 'text', value: '' }]);
  };

  const updateCustomField = (idx: number, updated: CustomField) => {
    setCustomFields(prev => prev.map((f, i) => i === idx ? updated : f));
  };

  const removeCustomField = (idx: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== idx));
  };

  const priorityCfg = PRIORITY_CONFIG[priorityLevel.charAt(0).toUpperCase() + priorityLevel.slice(1)] || PRIORITY_CONFIG.Medium;
  const riskCfg = RISK_CONFIG[riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)] || RISK_CONFIG.Low;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}
    >
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>Client Details</span>
          {/* Inline flag badges when collapsed */}
          {!open && hasAnyData && (
            <div className="flex items-center gap-2">
              {priorityLevel !== 'medium' && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px]"
                  style={{ fontWeight: 600, color: priorityCfg.color, background: priorityCfg.bg }}
                >
                  <Flag className="w-2.5 h-2.5" /> {priorityLevel.charAt(0).toUpperCase() + priorityLevel.slice(1)}
                </span>
              )}
              {riskLevel !== 'low' && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px]"
                  style={{ fontWeight: 600, color: riskCfg.color, background: riskCfg.bg }}
                >
                  <ShieldAlert className="w-2.5 h-2.5" /> {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border pt-4">
              {/* Edit toggle */}
              <div className="flex justify-end mb-3">
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-[12px] text-primary hover:text-primary/80 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    Edit details
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1 text-[12px] rounded-lg border border-border text-muted-foreground hover:bg-accent/40 transition-all"
                      style={{ fontWeight: 500 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3 py-1 text-[12px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all flex items-center gap-1.5"
                      style={{ fontWeight: 500 }}
                    >
                      <Save className="w-3 h-3" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Pro Fields ──────────────────────── */}
              <div className="space-y-4">
                {/* Contact info row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {editing ? (
                    <>
                      <div>
                        <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
                          <MapPin className="w-3 h-3" /> Address
                        </label>
                        <input
                          value={address}
                          onChange={e => setAddress(e.target.value)}
                          placeholder="123 Main St, City, ST 12345"
                          className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                          maxLength={200}
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
                          <Phone className="w-3 h-3" /> Phone
                        </label>
                        <input
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                          maxLength={30}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-[13px] text-foreground">{address}</span>
                        </div>
                      )}
                      {phone && (
                        <div className="flex items-start gap-2">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-[13px] text-foreground">{phone}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Portal greeting */}
                {editing ? (
                  <div>
                    <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
                      <MessageSquare className="w-3 h-3" /> Portal greeting
                    </label>
                    <textarea
                      value={portalGreeting}
                      onChange={e => setPortalGreeting(e.target.value)}
                      placeholder="Welcome! Here's your project dashboard…"
                      rows={2}
                      className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-border bg-transparent focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      maxLength={500}
                    />
                    <div className="text-[10px] text-muted-foreground/60 mt-1">{portalGreeting.length}/500 characters</div>
                  </div>
                ) : portalGreeting ? (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-[13px] text-foreground italic">&ldquo;{portalGreeting}&rdquo;</span>
                  </div>
                ) : null}

                {/* Flags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {editing ? (
                    <>
                      <LevelSelector value={priorityLevel} onChange={setPriorityLevel} config={PRIORITY_CONFIG} label="Priority Level" />
                      <LevelSelector value={riskLevel} onChange={setRiskLevel} config={RISK_CONFIG} label="Risk Level" />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Flag className="w-3.5 h-3.5" style={{ color: priorityCfg.color }} />
                          <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Priority</span>
                        </div>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]"
                          style={{ fontWeight: 600, color: priorityCfg.color, background: priorityCfg.bg }}
                        >
                          {priorityCfg.icon} {priorityLevel.charAt(0).toUpperCase() + priorityLevel.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" style={{ color: riskCfg.color }} />
                          <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Risk</span>
                        </div>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]"
                          style={{ fontWeight: 600, color: riskCfg.color, background: riskCfg.bg }}
                        >
                          {riskCfg.icon} {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Studio: Custom Fields ────────── */}
                {isStudio && (
                  <div className="pt-3 mt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] text-foreground" style={{ fontWeight: 600 }}>Custom Fields</span>
                      <span className="text-[11px] text-muted-foreground">{customFields.length}/10</span>
                    </div>

                    {editing ? (
                      <div className="space-y-2.5">
                        {customFields.map((field, i) => (
                          <CustomFieldEditor
                            key={field.id}
                            field={field}
                            onChange={f => updateCustomField(i, f)}
                            onRemove={() => removeCustomField(i)}
                          />
                        ))}
                        {customFields.length < 10 && (
                          <button
                            onClick={addCustomField}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-border rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                            style={{ fontWeight: 500 }}
                          >
                            <Plus className="w-3.5 h-3.5" /> Add custom field
                          </button>
                        )}
                      </div>
                    ) : customFields.length > 0 ? (
                      <div className="space-y-0.5">
                        {customFields.filter(f => f.label).map(field => (
                          <CustomFieldDisplay key={field.id} field={field} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-[12px] text-muted-foreground/60 text-center py-3">
                        No custom fields yet. Click &ldquo;Edit details&rdquo; to add up to 10.
                      </div>
                    )}
                  </div>
                )}

                {!isStudio && (
                  <FeatureGate feature="apiAccess" hideIfLocked={false}>
                    <></>
                  </FeatureGate>
                )}

                {/* Empty state */}
                {!editing && !hasAnyData && !isStudio && (
                  <div className="text-[12px] text-muted-foreground/60 text-center py-3">
                    No additional details yet. Click &ldquo;Edit details&rdquo; to add info.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
