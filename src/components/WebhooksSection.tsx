// ── Webhooks Settings Section ────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Eye, EyeOff, Copy, Check, RefreshCw,
  Loader2, Globe, Zap, ChevronDown, ChevronUp, X,
  CheckCircle2, XCircle, Clock, AlertTriangle, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import * as webhooksApi from '../data/webhooksApi';
import { WEBHOOK_EVENT_TYPES, type Webhook, type WebhookDelivery } from '../data/webhooksApi';

// ── Main component ──────────────────────────────────────────────────

export default function WebhooksSection() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'endpoints' | 'log'>('endpoints');

  const load = useCallback(async () => {
    try {
      const [wh, del] = await Promise.all([
        webhooksApi.listWebhooks(),
        webhooksApi.listDeliveries(),
      ]);
      setWebhooks(wh);
      setDeliveries(del);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 p-1 bg-accent/30 rounded-lg w-fit">
        <button
          onClick={() => setActiveView('endpoints')}
          className={`px-3 py-1.5 text-[12px] rounded-md transition-all ${
            activeView === 'endpoints'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          style={{ fontWeight: 500 }}
        >
          Endpoints
        </button>
        <button
          onClick={() => setActiveView('log')}
          className={`px-3 py-1.5 text-[12px] rounded-md transition-all ${
            activeView === 'log'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          style={{ fontWeight: 500 }}
        >
          Delivery log
          {deliveries.filter(d => !d.success).length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[9px] rounded-full bg-destructive/10 text-destructive" style={{ fontWeight: 600 }}>
              {deliveries.filter(d => !d.success).length}
            </span>
          )}
        </button>
      </div>

      {activeView === 'endpoints' ? (
        <EndpointsList
          webhooks={webhooks}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          showCreate={showCreate}
          setShowCreate={setShowCreate}
          onRefresh={load}
        />
      ) : (
        <DeliveryLog deliveries={deliveries} webhooks={webhooks} />
      )}
    </div>
  );
}

// ── Endpoints list ──────────────────────────────────────────────────

function EndpointsList({
  webhooks, expandedId, setExpandedId, showCreate, setShowCreate, onRefresh,
}: {
  webhooks: Webhook[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">
          {webhooks.length} endpoint{webhooks.length !== 1 ? 's' : ''} registered
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all"
          style={{ fontWeight: 500 }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add endpoint
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateWebhookForm
            onCreated={() => { setShowCreate(false); onRefresh(); }}
            onCancel={() => setShowCreate(false)}
          />
        )}
      </AnimatePresence>

      {webhooks.length === 0 && !showCreate ? (
        <div className="text-center py-10">
          <div className="w-10 h-10 rounded-xl bg-accent/50 flex items-center justify-center mx-auto mb-3">
            <Globe className="w-4.5 h-4.5 text-muted-foreground" />
          </div>
          <p className="text-[13px] text-muted-foreground">No webhook endpoints configured</p>
          <p className="text-[12px] text-muted-foreground/70 mt-1">Add an endpoint to receive real-time event notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <WebhookCard
              key={wh.id}
              webhook={wh}
              expanded={expandedId === wh.id}
              onToggle={() => setExpandedId(expandedId === wh.id ? null : wh.id)}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Create form ─────────────────────────────────────────────────────

function CreateWebhookForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event],
    );
  };

  const toggleGroup = (group: string) => {
    const groupEvents = WEBHOOK_EVENT_TYPES.filter(e => e.group === group).map(e => e.value);
    const allSelected = groupEvents.every(e => selectedEvents.includes(e));
    if (allSelected) {
      setSelectedEvents(prev => prev.filter(e => !groupEvents.includes(e as any)));
    } else {
      setSelectedEvents(prev => [...new Set([...prev, ...groupEvents])]);
    }
  };

  const handleSubmit = async () => {
    if (!url.trim()) { toast.error('URL is required'); return; }
    if (selectedEvents.length === 0) { toast.error('Select at least one event'); return; }
    try {
      new URL(url);
    } catch {
      toast.error('Enter a valid URL'); return;
    }

    setSaving(true);
    try {
      await webhooksApi.createWebhook({ url: url.trim(), events: selectedEvents, description: description.trim() || undefined });
      toast.success('Webhook endpoint created');
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create webhook');
    } finally {
      setSaving(false);
    }
  };

  const groups = [...new Set(WEBHOOK_EVENT_TYPES.map(e => e.group))];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border border-border rounded-xl bg-card overflow-hidden"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>New webhook endpoint</h4>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Endpoint URL</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://your-server.com/webhooks"
            className="w-full px-3 py-2 bg-accent/30 border border-border rounded-lg text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Production CRM sync"
            className="w-full px-3 py-2 bg-accent/30 border border-border rounded-lg text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <div className="space-y-2.5">
          <label className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Events to subscribe</label>
          {groups.map(group => {
            const events = WEBHOOK_EVENT_TYPES.filter(e => e.group === group);
            const allSelected = events.every(e => selectedEvents.includes(e.value));
            const someSelected = events.some(e => selectedEvents.includes(e.value));
            return (
              <div key={group}>
                <button
                  onClick={() => toggleGroup(group)}
                  className="flex items-center gap-2 text-[12px] mb-1.5"
                  style={{ fontWeight: 600 }}
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                    allSelected ? 'bg-foreground border-foreground' : someSelected ? 'border-foreground/50 bg-foreground/20' : 'border-border'
                  }`}>
                    {allSelected && <Check className="w-2.5 h-2.5 text-background" />}
                  </div>
                  <span className="text-foreground">{group}</span>
                </button>
                <div className="grid grid-cols-2 gap-1 pl-5">
                  {events.map(event => (
                    <button
                      key={event.value}
                      onClick={() => toggleEvent(event.value)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] text-left transition-colors ${
                        selectedEvents.includes(event.value)
                          ? 'bg-primary/8 text-primary'
                          : 'text-muted-foreground hover:bg-accent/40'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${
                        selectedEvents.includes(event.value) ? 'bg-primary border-primary' : 'border-border'
                      }`}>
                        {selectedEvents.includes(event.value) && <Check className="w-2 h-2 text-primary-foreground" />}
                      </div>
                      {event.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[12px] rounded-lg border border-border text-muted-foreground hover:text-foreground transition-all"
            style={{ fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-60"
            style={{ fontWeight: 500 }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {saving ? 'Creating...' : 'Create endpoint'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Webhook card ────────────────────────────────────────────────────

function WebhookCard({ webhook, expanded, onToggle, onRefresh }: {
  webhook: Webhook;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const [secretVisible, setSecretVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [currentSecret, setCurrentSecret] = useState(webhook.signing_secret);

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      await webhooksApi.updateWebhook(webhook.id, { active: !webhook.active });
      toast.success(webhook.active ? 'Webhook paused' : 'Webhook activated');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await webhooksApi.deleteWebhook(webhook.id);
      toast.success('Webhook deleted');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleRegenerateSecret = async () => {
    setRegenerating(true);
    try {
      const newSecret = await webhooksApi.regenerateWebhookSecret(webhook.id);
      setCurrentSecret(newSecret);
      setSecretVisible(true);
      toast.success('Signing secret regenerated');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(currentSecret).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border rounded-xl transition-colors ${webhook.active ? 'border-border bg-card' : 'border-border/50 bg-accent/20'}`}>
      {/* Header row */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <div className={`w-2 h-2 rounded-circle flex-shrink-0 ${webhook.active ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-foreground truncate" style={{ fontWeight: 500, fontFamily: 'ui-monospace, monospace' }}>
            {webhook.url}
          </div>
          {webhook.description && (
            <div className="text-[11px] text-muted-foreground mt-0.5">{webhook.description}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-accent/50 rounded" style={{ fontWeight: 500 }}>
            {webhook.events.length} event{webhook.events.length !== 1 ? 's' : ''}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
              {/* Events */}
              <div>
                <label className="text-[11px] text-muted-foreground mb-1.5 block" style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
                  SUBSCRIBED EVENTS
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {webhook.events.map(event => (
                    <span
                      key={event}
                      className="inline-flex px-2 py-0.5 text-[11px] rounded-md bg-primary/8 text-primary"
                      style={{ fontWeight: 500 }}
                    >
                      {event}
                    </span>
                  ))}
                </div>
              </div>

              {/* Signing secret */}
              <div>
                <label className="text-[11px] text-muted-foreground mb-1.5 block" style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
                  SIGNING SECRET
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 px-3 py-1.5 bg-accent/30 border border-border rounded-lg text-[12px] truncate"
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    {secretVisible ? currentSecret : '••••••••••••••••••••••••'}
                  </div>
                  <button
                    onClick={() => setSecretVisible(v => !v)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
                  >
                    {secretVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={copySecret}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleRegenerateSecret}
                    disabled={regenerating}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Use this secret to verify webhook signatures (HMAC-SHA256)
                </p>
              </div>

              {/* Created */}
              <div className="text-[11px] text-muted-foreground">
                Created {formatDistanceToNow(new Date(webhook.created_at), { addSuffix: true })}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={async () => {
                    setTesting(true);
                    try {
                      const result = await webhooksApi.testWebhook(webhook.id);
                      if (result.success) {
                        toast.success(`Ping successful — ${result.statusCode}`);
                      } else {
                        toast.error(`Ping failed — ${result.statusCode || result.error || 'No response'}`);
                      }
                      onRefresh();
                    } catch (err: any) {
                      toast.error(err.message || 'Test failed');
                    } finally {
                      setTesting(false);
                    }
                  }}
                  disabled={testing}
                  className="px-3 py-1.5 text-[12px] rounded-lg border border-primary/20 bg-primary/8 text-primary hover:bg-primary/12 transition-all disabled:opacity-50"
                  style={{ fontWeight: 500 }}
                >
                  {testing ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : <Send className="w-3 h-3 inline mr-1" />}
                  Test
                </button>
                <button
                  onClick={handleToggleActive}
                  disabled={toggling}
                  className={`px-3 py-1.5 text-[12px] rounded-lg border transition-all disabled:opacity-50 ${
                    webhook.active
                      ? 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
                      : 'border-primary/20 bg-primary/8 text-primary hover:bg-primary/12'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  {toggling ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                  {webhook.active ? 'Pause' : 'Activate'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 text-[12px] rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/5 transition-all disabled:opacity-50"
                  style={{ fontWeight: 500 }}
                >
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : <Trash2 className="w-3 h-3 inline mr-1" />}
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Delivery log ────────────────────────────────────────────────────

function DeliveryLog({ deliveries, webhooks }: { deliveries: WebhookDelivery[]; webhooks: Webhook[] }) {
  const webhookMap = Object.fromEntries(webhooks.map(w => [w.id, w]));

  if (deliveries.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-10 h-10 rounded-xl bg-accent/50 flex items-center justify-center mx-auto mb-3">
          <Clock className="w-4.5 h-4.5 text-muted-foreground" />
        </div>
        <p className="text-[13px] text-muted-foreground">No deliveries yet</p>
        <p className="text-[12px] text-muted-foreground/70 mt-1">Deliveries will appear here when events are triggered</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {deliveries.map(d => {
        const wh = webhookMap[d.webhook_id];
        return (
          <div
            key={d.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/30 transition-colors"
          >
            <div className="flex-shrink-0">
              {d.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-foreground" style={{ fontWeight: 500 }}>{d.event_type}</span>
                {d.status_code && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    d.success ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
                  }`} style={{ fontWeight: 600 }}>
                    {d.status_code}
                  </span>
                )}
                {d.attempt > 1 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600" style={{ fontWeight: 500 }}>
                    attempt {d.attempt}
                  </span>
                )}
              </div>
              {wh && (
                <div className="text-[11px] text-muted-foreground truncate" style={{ fontFamily: 'ui-monospace, monospace' }}>
                  {wh.url}
                </div>
              )}
              {d.error_message && (
                <div className="text-[11px] text-destructive/80 mt-0.5">{d.error_message}</div>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
