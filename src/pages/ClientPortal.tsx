import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { useParams, useSearchParams } from "react-router";
import AureloLogo from "@/components/AureloLogo";
import {
  Clock,
  FileText,
  FolderOpen,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Plus,
  Tag,
  Check,
  Inbox,
  Receipt,
  Mail,
  Activity as ActivityIcon,
  Link2,
} from "lucide-react";
import { format } from "date-fns";
import { formatMoney, formatDuration, formatDate as formatDateFn } from "@/lib/format";

// ── Types ───────────────────────────────────────────────────────────

interface PortalBranding {
  isWhiteLabel: boolean;
  workspaceName: string | null;
  brandColor: string | null;
  logoUrl: string | null;
  clientLogoUrl: string | null;
  clientFaviconUrl: string | null;
}

interface PortalClient {
  name: string;
  model: string;
  status: string;
  portalGreeting?: string | null;
  rate?: number;
  retainerTotal?: number;
  retainerRemaining?: number;
  lifetimeRevenue?: number;
  monthlyEarnings?: number;
  hoursLogged?: number;
}

interface PortalProject {
  id: string;
  name: string;
  status: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  hours?: number;
  estimated_hours?: number;
  revenue?: number;
  total_value?: number;
  budget_amount?: number;
  budget_type?: string;
  next_milestone?: { title: string; status: string; due_date?: string | null } | null;
}

interface PortalInvoice {
  id: string;
  number: string;
  status: string;
  issued_date?: string;
  due_date?: string;
  paid_date?: string;
  total: number;
  currency: string;
}

interface PortalTask {
  id: string;
  text: string;
  description?: string | null;
  status: 'to_do' | 'in_progress' | 'in_review' | 'on_hold' | 'complete';
  completed: boolean;
  work_tags?: string[];
  due_date?: string | null;
  estimated_hours?: number | null;
  priority?: string | null;
  sort_order: number;
  added_by: string;
}

interface PortalChecklist {
  id: string;
  title: string;
  project_id?: string;
  items: PortalTask[];
}

interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  at: string;
}

interface WaitingItem {
  id: string;
  kind: 'invoice.pay' | 'task.action' | 'resource.approve' | string;
  title: string;
  amount?: number;
  currency?: string;
  due_date?: string | null;
}

interface PortalUpdatePayload {
  id: string;
  thisWeek: string | null;
  nextWeek: string | null;
  waitingOnYou: string | null;
  postedAt: string;
}

interface PortalResource {
  id: string;
  kind: 'link' | 'file';
  provider: string | null;
  url: string | null;
  title: string;
  description: string | null;
  status: 'shared' | 'for_review' | 'approved' | 'final';
  needs_approval: boolean;
  project_id: string | null;
  created_at: string;
  last_decision: { decision: 'approved' | 'changes_requested' | 'rejected'; comment: string | null; at: string } | null;
}

interface PortalData {
  client: PortalClient;
  projects: PortalProject[];
  invoices: PortalInvoice[];
  checklists: PortalChecklist[];
  resources: PortalResource[];
  activity: ActivityEvent[];
  waitingOnYou: WaitingItem[];
  portalUpdate: PortalUpdatePayload | null;
  workspaceOwner: { name: string | null; email: string | null };
  showCosts: boolean;
  branding: PortalBranding;
}

// ── Helpers ─────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const fmt$ = (amount: number, currency = "USD") =>
  formatMoney(amount, { currency, precision: "compact" });
const fmtHours = (h: number) =>
  formatDuration(h, { variant: "display" }).replace(' hrs', 'h');
const fmtDate = (d?: string | null) => formatDateFn(d, "medium");

function dueLabel(due?: string | null) {
  if (!due) return null;
  try {
    const d = new Date(due);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Due today";
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff <= 3) return `Due in ${diff}d`;
    return `Due ${format(d, 'MMM d')}`;
  } catch { return null; }
}

function relTime(iso: string) {
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
    return format(d, 'MMM d');
  } catch { return ''; }
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "paid") return { color: "#15803d", bg: "#dcfce7" };
  if (s === "sent" || s === "issued") return { color: "#0369a1", bg: "#e0f2fe" };
  if (s === "overdue") return { color: "#b91c1c", bg: "#fee2e2" };
  if (s === "draft") return { color: "#6b7280", bg: "#f3f4f6" };
  if (s === "in progress" || s === "active") return { color: "#0369a1", bg: "#e0f2fe" };
  if (s === "completed" || s === "complete") return { color: "#15803d", bg: "#dcfce7" };
  if (s === "on hold" || s === "paused") return { color: "#b45309", bg: "#fef3c7" };
  return { color: "#6b7280", bg: "#f3f4f6" };
}

function activityIcon(type: string) {
  if (type.startsWith('invoice')) return Receipt;
  if (type.startsWith('task')) return CheckCircle2;
  if (type.startsWith('resource')) return Link2;
  if (type.startsWith('update')) return ActivityIcon;
  return ActivityIcon;
}

// ── Portal Page ─────────────────────────────────────────────────────

type PortalTabId = 'home' | 'resources' | 'tasks' | 'billing';

export default function ClientPortal() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PortalTabId>('home');

  // Force light mode for portal
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => { if (wasDark) root.classList.add("dark"); };
  }, []);

  useEffect(() => {
    if (!token) { setError("No portal token"); setLoading(false); return; }
    fetch(`${SUPABASE_URL}/functions/v1/portal-view?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        setData(json.data);
      })
      .catch(e => setError(e.message || "Failed to load portal"))
      .finally(() => setLoading(false));
  }, [token]);

  // Deep-link focus highlight
  const focus = searchParams.get('focus');
  useEffect(() => {
    if (!data || !focus) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`focus-${focus}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('portal-focus-ring');
        setTimeout(() => el.classList.remove('portal-focus-ring'), 1400);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [data, focus]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--portal-bg)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--portal-accent)' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--portal-bg)' }}>
        <div className="text-center max-w-md px-6">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-display font-semibold" style={{ color: 'var(--portal-ink)' }}>Portal unavailable</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--portal-muted)' }}>
            {error || "This portal link is invalid or has been deactivated."}
          </p>
        </div>
      </div>
    );
  }

  const { client, projects, invoices, checklists, resources, activity, waitingOnYou, portalUpdate, workspaceOwner, showCosts, branding } = data;
  const accent = branding.isWhiteLabel && branding.brandColor ? branding.brandColor : "#3B66F0";
  const isRetainer = client.model === 'Retainer' && (client.retainerTotal ?? 0) > 0;

  const pendingResources = resources.filter(r => r.needs_approval).length;
  const tabs: { id: PortalTabId; label: string; count?: number }[] = [
    { id: 'home', label: 'Home', count: waitingOnYou.length || undefined },
    { id: 'resources', label: 'Resources', count: pendingResources || resources.length || undefined },
    { id: 'tasks', label: 'Tasks', count: checklists.reduce((a, c) => a + c.items.filter(i => i.status !== 'complete').length, 0) || undefined },
    { id: 'billing', label: 'Billing', count: invoices.filter(i => ['sent','issued','overdue'].includes(i.status.toLowerCase())).length || undefined },
  ];

  return (
    <div
      className="portal-light min-h-screen"
      style={{
        // Scoped tokens: light-locked, hairline-driven, accent injected per-workspace
        ['--portal-bg' as any]: '#f7f7f9',
        ['--portal-surface' as any]: '#ffffff',
        ['--portal-ink' as any]: '#0f1115',
        ['--portal-muted' as any]: '#6b7280',
        ['--portal-subtle' as any]: '#9ca3af',
        ['--portal-hairline' as any]: '#e7e8ec',
        ['--portal-soft' as any]: '#f1f2f5',
        ['--portal-accent' as any]: accent,
        backgroundColor: 'var(--portal-bg)',
        color: 'var(--portal-ink)',
      } as any}
    >
      <style>{`
        .portal-focus-ring { box-shadow: 0 0 0 2px var(--portal-accent), 0 0 0 6px color-mix(in srgb, var(--portal-accent) 18%, transparent); transition: box-shadow .25s ease; }
      `}</style>

      <PortalHeader branding={branding} accent={accent} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
        <motion.div initial="hidden" animate="show" variants={containerVariants}>
          {/* Client identity strip */}
          <motion.div variants={itemVariants} className="mb-6 lg:mb-8">
            <div className="flex items-center gap-3">
              {branding.clientFaviconUrl ? (
                <img src={branding.clientFaviconUrl} alt={client.name} className="h-10 w-10 rounded object-cover" />
              ) : (
                <div
                  className="h-10 w-10 rounded flex items-center justify-center font-display font-semibold text-base"
                  style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}
                >
                  {client.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-xl lg:text-2xl font-display font-semibold tracking-tight truncate" style={{ color: 'var(--portal-ink)' }}>
                  {client.name}
                </h1>
                <div className="flex items-center gap-2 mt-0.5 text-[12px]" style={{ color: 'var(--portal-muted)' }}>
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-circle"
                    style={{ backgroundColor: client.status?.toLowerCase() === 'active' ? '#22c55e' : '#9ca3af' }}
                  />
                  <span>{client.status}</span>
                  <span style={{ color: 'var(--portal-subtle)' }}>·</span>
                  <span>{client.model}</span>
                </div>
              </div>
              {branding.clientLogoUrl && (
                <img src={branding.clientLogoUrl} alt="" className="h-8 w-auto max-w-[140px] object-contain hidden md:block opacity-90" />
              )}
            </div>
            {client.portalGreeting && (
              <p className="mt-4 text-[14px] leading-relaxed max-w-2xl" style={{ color: 'var(--portal-muted)' }}>
                {client.portalGreeting}
              </p>
            )}
          </motion.div>

          {/* Tabs */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="inline-flex items-center gap-1 p-0.5 rounded border" style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}>
              {tabs.map(t => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] rounded transition-colors cursor-pointer"
                    style={{
                      fontWeight: active ? 600 : 500,
                      color: active ? '#fff' : 'var(--portal-muted)',
                      backgroundColor: active ? accent : 'transparent',
                    }}
                  >
                    {t.label}
                    {t.count != null && (
                      <span
                        className="text-[10.5px] px-1.5 py-0.5 rounded tabular-nums"
                        style={{
                          backgroundColor: active ? 'rgba(255,255,255,0.18)' : 'var(--portal-soft)',
                          color: active ? '#fff' : 'var(--portal-subtle)',
                        }}
                      >
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <AnimatePresence>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              {tab === 'home' && (
                <div className="space-y-6">
                  <WaitingOnYou items={waitingOnYou} accent={accent} onTabChange={setTab} token={token!} />
                  {portalUpdate && <ThisWeekCard update={portalUpdate} accent={accent} />}
                  <RecentActivity events={activity} accent={accent} />
                  <Engagements projects={projects} accent={accent} />
                  {isRetainer && (
                    <RetainerCard total={client.retainerTotal!} remaining={client.retainerRemaining || 0} accent={accent} />
                  )}
                  <ContactCard owner={workspaceOwner} accent={accent} />
                </div>
              )}

              {tab === 'resources' && <ResourcesTab resources={resources} accent={accent} token={token!} />}

              {tab === 'tasks' && (
                <TasksTab checklists={checklists} accent={accent} token={token!} />
              )}

              {tab === 'billing' && (
                <BillingTab
                  invoices={invoices}
                  showCosts={showCosts}
                  accent={accent}
                  isRetainer={isRetainer}
                  retainerTotal={client.retainerTotal}
                  retainerRemaining={client.retainerRemaining}
                  token={token!}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {!branding.isWhiteLabel && (
          <div className="mt-16 pb-8 text-center">
            <p className="text-[11px]" style={{ color: 'var(--portal-subtle)' }}>
              Powered by{" "}
              <a href="https://getaurelo.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
                Aurelo
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────

function PortalHeader({ branding, accent }: { branding: PortalBranding; accent: string }) {
  return (
    <header
      className="border-b px-4 sm:px-6 lg:px-10 py-3.5"
      style={{
        backgroundColor: 'var(--portal-surface)',
        borderColor: 'var(--portal-hairline)',
      }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {branding.isWhiteLabel && branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.workspaceName || ""} className="h-6 w-auto max-w-[160px] object-contain" />
          ) : (
            <AureloLogo className="h-4" />
          )}
        </div>
        <span
          className="text-[10.5px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded"
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`, color: accent }}
        >
          Client Portal
        </span>
      </div>
    </header>
  );
}

// ── Waiting on you ──────────────────────────────────────────────────

function WaitingOnYou({ items, accent, onTabChange, token }: { items: WaitingItem[]; accent: string; onTabChange: (t: PortalTabId) => void; token: string }) {
  const [paying, setPaying] = useState<string | null>(null);

  const handleAction = async (item: WaitingItem) => {
    if (item.kind === 'invoice.pay') {
      const invoiceId = item.id.replace('pay-', '');
      setPaying(invoiceId);
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/portal-pay-invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, invoice_id: invoiceId }),
        });
        const json = await res.json();
        if (json.url) { window.location.href = json.url; return; }
        alert(json.error || 'Unable to start payment.');
      } catch {
        alert('Network error. Please try again.');
      } finally {
        setPaying(null);
      }
    } else if (item.kind === 'resource.approve') {
      onTabChange('resources');
    } else {
      onTabChange('tasks');
    }
  };

  if (items.length === 0) {
    return (
      <section>
        <SectionTitle icon={Inbox} title="Waiting on you" accent={accent} />
        <div
          className="rounded border p-6 text-center"
          style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
        >
          <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: '#22c55e' }} />
          <p className="text-[13.5px] font-display font-semibold" style={{ color: 'var(--portal-ink)' }}>You're all caught up</p>
          <p className="text-[12px] mt-1" style={{ color: 'var(--portal-muted)' }}>Nothing needs your attention right now.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionTitle icon={Inbox} title="Waiting on you" count={items.length} accent={accent} />
      <div
        className="rounded border divide-y"
        style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
      >
        {items.map(item => {
          const invoiceId = item.kind === 'invoice.pay' ? item.id.replace('pay-', '') : null;
          const isPaying = invoiceId && paying === invoiceId;
          return (
            <div
              key={item.id}
              id={item.kind === 'invoice.pay' ? `focus-invoice:${invoiceId}` : `focus-task:${item.id.replace('task-', '')}`}
              className="flex items-center gap-3 p-4"
            >
              <div
                className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)` }}
              >
                {item.kind === 'invoice.pay' ? (
                  <Receipt className="w-4 h-4" style={{ color: accent }} />
                ) : item.kind === 'resource.approve' ? (
                  <Link2 className="w-4 h-4" style={{ color: accent }} />
                ) : (
                  <CheckSquare className="w-4 h-4" style={{ color: accent }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-display font-semibold truncate" style={{ color: 'var(--portal-ink)' }}>
                  {item.title}
                </div>
                <div className="text-[11.5px] mt-0.5 flex items-center gap-2" style={{ color: 'var(--portal-muted)' }}>
                  {item.amount != null && (
                    <span className="tabular-nums">{fmt$(item.amount, item.currency || 'USD')}</span>
                  )}
                  {item.due_date && <span>· {dueLabel(item.due_date)}</span>}
                </div>
              </div>
              <button
                onClick={() => handleAction(item)}
                disabled={!!isPaying}
                className="text-[12px] font-semibold px-3 py-1.5 rounded text-white cursor-pointer disabled:opacity-60"
                style={{ backgroundColor: accent }}
              >
                {isPaying ? 'Opening…' : item.kind === 'invoice.pay' ? 'Pay' : item.kind === 'resource.approve' ? 'Review' : 'Open'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Recent Activity ─────────────────────────────────────────────────

function ThisWeekCard({ update, accent }: { update: PortalUpdatePayload; accent: string }) {
  const blocks: { label: string; body: string }[] = [];
  if (update.thisWeek) blocks.push({ label: 'This week', body: update.thisWeek });
  if (update.nextWeek) blocks.push({ label: 'Next week', body: update.nextWeek });
  if (update.waitingOnYou) blocks.push({ label: 'Waiting on you', body: update.waitingOnYou });
  if (blocks.length === 0) return null;
  return (
    <section>
      <SectionTitle icon={ActivityIcon} title="This week" accent={accent} />
      <div
        className="rounded border p-5 space-y-4"
        style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
      >
        {blocks.map(b => (
          <div key={b.label}>
            <div className="text-[10.5px] uppercase tracking-wide font-semibold mb-1" style={{ color: accent, letterSpacing: '0.08em' }}>{b.label}</div>
            <div className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--portal-ink)' }}>{b.body}</div>
          </div>
        ))}
        <div className="text-[11px] pt-1" style={{ color: 'var(--portal-subtle)' }}>Posted {relTime(update.postedAt)}</div>
      </div>
    </section>
  );
}

function RecentActivity({ events, accent }: { events: ActivityEvent[]; accent: string }) {
  if (events.length === 0) return null;
  return (
    <section>
      <SectionTitle icon={ActivityIcon} title="Recent activity" accent={accent} />
      <div
        className="rounded border divide-y"
        style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
      >
        {events.slice(0, 8).map(ev => {
          const Icon = activityIcon(ev.type);
          return (
            <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--portal-subtle)' }} />
              <div className="flex-1 min-w-0 text-[13px] truncate" style={{ color: 'var(--portal-ink)' }}>
                {ev.title}
              </div>
              <span className="text-[11px] tabular-nums" style={{ color: 'var(--portal-subtle)' }}>{relTime(ev.at)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Engagements (simplified projects) ───────────────────────────────

function Engagements({ projects, accent }: { projects: PortalProject[]; accent: string }) {
  if (projects.length === 0) return null;
  const visible = projects.filter(p => p.status.toLowerCase() !== 'archived').slice(0, 6);
  if (visible.length === 0) return null;
  return (
    <section>
      <SectionTitle icon={FolderOpen} title="Engagements" count={visible.length} accent={accent} />
      <div
        className="rounded border divide-y"
        style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
      >
        {visible.map(p => {
          const b = statusBadge(p.status);
          return (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-display font-semibold truncate" style={{ color: 'var(--portal-ink)' }}>{p.name}</div>
                {p.next_milestone ? (
                  <div className="text-[11.5px] mt-0.5 truncate" style={{ color: 'var(--portal-muted)' }}>
                    Next: {p.next_milestone.title}
                    {p.next_milestone.due_date && <span style={{ color: 'var(--portal-subtle)' }}> · {dueLabel(p.next_milestone.due_date)}</span>}
                  </div>
                ) : p.description ? (
                  <div className="text-[11.5px] mt-0.5 line-clamp-1" style={{ color: 'var(--portal-muted)' }}>{p.description}</div>
                ) : null}
              </div>
              <span
                className="text-[10.5px] font-semibold px-2 py-0.5 rounded tabular-nums"
                style={{ color: b.color, backgroundColor: b.bg }}
              >
                {p.status}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Retainer Card ───────────────────────────────────────────────────

function RetainerCard({ total, remaining, accent }: { total: number; remaining: number; accent: string }) {
  const used = Math.max(0, total - remaining);
  const pct = Math.min(100, Math.round((used / total) * 100));
  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : accent;
  return (
    <section>
      <SectionTitle icon={Clock} title="Retainer" accent={accent} />
      <div
        className="rounded border p-5"
        style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12.5px] font-display font-semibold" style={{ color: 'var(--portal-ink)' }}>
            {fmtHours(used)} used of {fmtHours(total)}
          </span>
          <span className="text-[13px] font-display font-semibold tabular-nums" style={{ color: barColor }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-circle overflow-hidden" style={{ backgroundColor: 'var(--portal-soft)' }}>
          <div className="h-full rounded-circle transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>
        <div className="mt-2 text-[11.5px]" style={{ color: 'var(--portal-muted)' }}>
          {fmtHours(remaining)} remaining this cycle
        </div>
      </div>
    </section>
  );
}

// ── Contact Card ────────────────────────────────────────────────────

function ContactCard({ owner, accent }: { owner: { name: string | null; email: string | null }; accent: string }) {
  if (!owner.email) return null;
  return (
    <section>
      <SectionTitle icon={Mail} title="Your contact" accent={accent} />
      <div
        className="rounded border p-4 flex items-center gap-3"
        style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
      >
        <div
          className="w-9 h-9 rounded flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`, color: accent }}
        >
          <Mail className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          {owner.name && <div className="text-[13px] font-display font-semibold truncate" style={{ color: 'var(--portal-ink)' }}>{owner.name}</div>}
          <a
            href={`mailto:${owner.email}`}
            className="text-[12px] hover:underline truncate block"
            style={{ color: 'var(--portal-muted)' }}
          >
            {owner.email}
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Resources Stub ──────────────────────────────────────────────────

function ResourcesStub({ accent }: { accent: string }) {
  return (
    <div
      className="rounded border p-10 text-center"
      style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
    >
      <Link2 className="w-7 h-7 mx-auto mb-3" style={{ color: 'var(--portal-subtle)' }} />
      <p className="text-[14px] font-display font-semibold" style={{ color: 'var(--portal-ink)' }}>Shared resources coming soon</p>
      <p className="text-[12.5px] mt-1.5 max-w-md mx-auto" style={{ color: 'var(--portal-muted)' }}>
        Drive folders, Figma files, Loom walkthroughs, Notion docs — everything your project lives in, organized in one place.
      </p>
    </div>
  );
}

// ── Tasks Tab ───────────────────────────────────────────────────────

function TasksTab({ checklists, accent, token }: { checklists: PortalChecklist[]; accent: string; token: string }) {
  const [hideCompleted, setHideCompleted] = useState(true);
  if (checklists.length === 0) {
    return (
      <div
        className="rounded border p-10 text-center"
        style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
      >
        <CheckSquare className="w-7 h-7 mx-auto mb-3" style={{ color: 'var(--portal-subtle)' }} />
        <p className="text-[14px] font-display font-semibold" style={{ color: 'var(--portal-ink)' }}>No shared tasks yet</p>
        <p className="text-[12.5px] mt-1" style={{ color: 'var(--portal-muted)' }}>Tasks shared with you will appear here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer select-none" style={{ color: 'var(--portal-muted)' }}>
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
            style={{ accentColor: accent }}
          />
          Hide completed
        </label>
      </div>
      {checklists.map(cl => (
        <PortalChecklistCard key={cl.id} checklist={cl} accent={accent} token={token} hideCompleted={hideCompleted} />
      ))}
    </div>
  );
}

// ── Billing Tab ─────────────────────────────────────────────────────

function BillingTab({
  invoices, showCosts, accent, isRetainer, retainerTotal, retainerRemaining, token,
}: {
  invoices: PortalInvoice[];
  showCosts: boolean;
  accent: string;
  isRetainer: boolean;
  retainerTotal?: number;
  retainerRemaining?: number;
  token: string;
}) {
  if (!showCosts) {
    return (
      <div
        className="rounded border p-10 text-center"
        style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
      >
        <Receipt className="w-7 h-7 mx-auto mb-3" style={{ color: 'var(--portal-subtle)' }} />
        <p className="text-[14px] font-display font-semibold" style={{ color: 'var(--portal-ink)' }}>Billing is private</p>
        <p className="text-[12.5px] mt-1" style={{ color: 'var(--portal-muted)' }}>Invoices aren't shared on this portal.</p>
      </div>
    );
  }

  const outstanding = invoices.filter(i => ['sent','issued','overdue'].includes(i.status.toLowerCase()));
  const paid = invoices.filter(i => i.status.toLowerCase() === 'paid');
  const other = invoices.filter(i => !['sent','issued','overdue','paid'].includes(i.status.toLowerCase()));

  return (
    <div className="space-y-6">
      {isRetainer && retainerTotal != null && (
        <RetainerCard total={retainerTotal} remaining={retainerRemaining || 0} accent={accent} />
      )}
      {outstanding.length > 0 && (
        <section>
          <SectionTitle icon={Receipt} title="Outstanding" count={outstanding.length} accent={accent} />
          <div
            className="rounded border divide-y"
            style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
          >
            {outstanding.map(inv => <InvoiceRow key={inv.id} invoice={inv} accent={accent} token={token} payable />)}
          </div>
        </section>
      )}
      {paid.length > 0 && (
        <section>
          <SectionTitle icon={CheckCircle2} title="Paid" count={paid.length} accent={accent} />
          <div
            className="rounded border divide-y"
            style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
          >
            {paid.map(inv => <InvoiceRow key={inv.id} invoice={inv} accent={accent} />)}
          </div>
        </section>
      )}
      {other.length > 0 && (
        <section>
          <SectionTitle icon={FileText} title="Other" count={other.length} accent={accent} />
          <div
            className="rounded border divide-y"
            style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
          >
            {other.map(inv => <InvoiceRow key={inv.id} invoice={inv} accent={accent} />)}
          </div>
        </section>
      )}
      {invoices.length === 0 && (
        <div
          className="rounded border p-10 text-center"
          style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}
        >
          <Receipt className="w-7 h-7 mx-auto mb-3" style={{ color: 'var(--portal-subtle)' }} />
          <p className="text-[14px] font-display font-semibold" style={{ color: 'var(--portal-ink)' }}>No invoices yet</p>
        </div>
      )}
    </div>
  );
}

function InvoiceRow({ invoice: inv, accent, token, payable = false }: { invoice: PortalInvoice; accent: string; token?: string; payable?: boolean }) {
  const b = statusBadge(inv.status);
  const isPaid = inv.status.toLowerCase() === 'paid';
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/portal-pay-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, invoice_id: inv.id }),
      });
      const json = await res.json();
      if (json.url) { window.location.href = json.url; return; }
      alert(json.error || 'Unable to start payment.');
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id={`focus-invoice:${inv.id}`} className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-display font-semibold" style={{ color: 'var(--portal-ink)' }}>{inv.number}</span>
          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded" style={{ color: b.color, backgroundColor: b.bg }}>{inv.status}</span>
        </div>
        <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--portal-muted)' }}>
          {inv.issued_date && <>Issued {fmtDate(inv.issued_date)}</>}
          {inv.due_date && !isPaid && <> · Due {fmtDate(inv.due_date)}</>}
          {inv.paid_date && isPaid && <> · Paid {fmtDate(inv.paid_date)}</>}
        </div>
      </div>
      <div className="text-[14px] font-display font-semibold tabular-nums" style={{ color: 'var(--portal-ink)' }}>
        {fmt$(inv.total, inv.currency)}
      </div>
      {payable && !isPaid && (
        <button
          onClick={handlePay}
          disabled={loading}
          className="text-[12px] font-semibold px-3 py-1.5 rounded text-white cursor-pointer disabled:opacity-60"
          style={{ backgroundColor: accent }}
        >
          {loading ? 'Opening…' : 'Pay'}
        </button>
      )}
    </div>
  );
}

// ── Section Title ───────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title, count, accent }: { icon: any; title: string; count?: number; accent: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
      <h2 className="text-[11.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--portal-muted)' }}>{title}</h2>
      {count != null && (
        <span className="text-[10.5px] tabular-nums px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--portal-soft)', color: 'var(--portal-subtle)' }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ── Portal Task List Card (preserved from prior version) ────────────

const PORTAL_STATUSES: { value: PortalTask['status']; label: string; dot: string; text: string; bg: string }[] = [
  { value: 'to_do',       label: 'To Do',       dot: '#9ca3af', text: '#6b7280', bg: '#f3f4f6' },
  { value: 'in_progress', label: 'In Progress', dot: '#0ea5e9', text: '#0369a1', bg: '#e0f2fe' },
  { value: 'in_review',   label: 'In Review',   dot: '#f59e0b', text: '#b45309', bg: '#fef3c7' },
  { value: 'on_hold',     label: 'On Hold',     dot: '#94a3b8', text: '#475569', bg: '#f1f5f9' },
  { value: 'complete',    label: 'Complete',    dot: '#22c55e', text: '#15803d', bg: '#dcfce7' },
];

function portalDueChip(due?: string | null) {
  const label = dueLabel(due);
  if (!label) return null;
  const d = new Date(due!);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label, color: '#b91c1c', bg: '#fee2e2' };
  if (diff <= 3) return { label, color: '#b45309', bg: '#fef3c7' };
  return { label, color: '#6b7280', bg: '#f3f4f6' };
}

function PortalChecklistCard({ checklist, accent, token, hideCompleted = false }: { checklist: PortalChecklist; accent: string; token: string; hideCompleted?: boolean }) {
  const [items, setItems] = useState<PortalTask[]>(checklist.items);
  const [composerOpen, setComposerOpen] = useState(false);

  const completedCount = items.filter(i => i.status === 'complete').length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const visibleItems = hideCompleted ? items.filter(i => i.status !== 'complete') : items;

  const cycleStatus = async (item: PortalTask) => {
    const order: PortalTask['status'][] = ['to_do', 'in_progress', 'in_review', 'on_hold', 'complete'];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: next, completed: next === 'complete' } : i));
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/portal-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'update_status', checklist_id: checklist.id, item_id: item.id, status: next }),
      });
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
    }
  };

  const handleAdd = async (input: { text: string; due_date: string | null; estimated_hours: number | null; work_tags: string[] }) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/portal-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'add', checklist_id: checklist.id, ...input }),
      });
      const data = await res.json();
      if (data.item) {
        const it = data.item;
        setItems(prev => [...prev, {
          id: it.id,
          text: it.text,
          description: it.description ?? null,
          status: it.status || 'to_do',
          completed: !!it.completed,
          work_tags: it.work_tags || [],
          due_date: it.due_date ?? null,
          estimated_hours: it.estimated_hours ?? null,
          priority: it.priority ?? null,
          sort_order: it.sort_order,
          added_by: 'client',
        }]);
        setComposerOpen(false);
      }
    } catch { /* silent */ }
  };

  return (
    <div className="rounded border overflow-hidden" style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)' }}>
      <div className="h-1" style={{ backgroundColor: 'var(--portal-soft)' }}>
        <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: progress === 100 ? "#22c55e" : accent }} />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13.5px] font-display font-semibold" style={{ color: 'var(--portal-ink)' }}>{checklist.title}</span>
          <span className="text-[11.5px] tabular-nums" style={{ color: progress === 100 ? "#22c55e" : 'var(--portal-subtle)' }}>
            {completedCount}/{totalCount}
          </span>
        </div>

        <div className="space-y-1.5">
          {visibleItems.map(item => {
            const cfg = PORTAL_STATUSES.find(s => s.value === item.status) || PORTAL_STATUSES[0];
            const due = portalDueChip(item.due_date);
            return (
              <div key={item.id} className="border rounded p-2.5 transition-colors" style={{ borderColor: 'var(--portal-hairline)' }}>
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() => cycleStatus(item)}
                    title={`Status: ${cfg.label} — tap to advance`}
                    className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-circle border-2 flex items-center justify-center cursor-pointer"
                    style={{ borderColor: cfg.dot, backgroundColor: item.status === 'complete' ? cfg.dot : 'transparent' }}
                  >
                    {item.status === 'complete' && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <span className={`text-[13px] flex-1 ${item.status === 'complete' ? 'line-through' : ''}`} style={{ color: item.status === 'complete' ? 'var(--portal-subtle)' : 'var(--portal-ink)' }}>
                        {item.text}
                      </span>
                      {item.added_by === 'client' && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--portal-soft)', color: 'var(--portal-subtle)' }}>You</span>
                      )}
                    </div>
                    {item.description && (
                      <div className="text-[12px] mt-1 whitespace-pre-wrap" style={{ color: 'var(--portal-muted)' }}>{item.description}</div>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span
                        className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: cfg.bg, color: cfg.text, fontWeight: 600 }}
                      >
                        <span className="w-1.5 h-1.5 rounded-circle" style={{ backgroundColor: cfg.dot }} />
                        {cfg.label}
                      </span>
                      {(item.work_tags || []).map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--portal-soft)', color: 'var(--portal-muted)', fontWeight: 500 }}>
                          <Tag className="w-2.5 h-2.5" /> {tag}
                        </span>
                      ))}
                      {due && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded" style={{ backgroundColor: due.bg, color: due.color, fontWeight: 500 }}>
                          <Clock className="w-2.5 h-2.5" /> {due.label}
                        </span>
                      )}
                      {item.estimated_hours != null && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--portal-soft)', color: 'var(--portal-muted)', fontWeight: 500 }}>
                          <Clock className="w-2.5 h-2.5" /> {item.estimated_hours}h est
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {visibleItems.length === 0 && (
            <div className="text-center py-4 text-[12px]" style={{ color: 'var(--portal-subtle)' }}>
              {items.length === 0 ? 'No tasks yet.' : 'All tasks completed.'}
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--portal-hairline)' }}>
          {composerOpen ? (
            <PortalComposer accent={accent} onCancel={() => setComposerOpen(false)} onSubmit={handleAdd} />
          ) : (
            <button
              onClick={() => setComposerOpen(true)}
              className="inline-flex items-center gap-1.5 text-[12px] cursor-pointer"
              style={{ fontWeight: 500, color: 'var(--portal-muted)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Add task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PortalComposer({
  accent, onCancel, onSubmit,
}: {
  accent: string;
  onCancel: () => void;
  onSubmit: (input: { text: string; due_date: string | null; estimated_hours: number | null; work_tags: string[] }) => void;
}) {
  const [text, setText] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [hours, setHours] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    onSubmit({
      text: text.trim(),
      due_date: dueDate || null,
      estimated_hours: hours === '' ? null : Number(hours),
      work_tags: [],
    });
  };

  return (
    <div className="space-y-2">
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Task title…"
        className="w-full text-[13px] border rounded px-2.5 py-1.5 focus:outline-none"
        style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)', color: 'var(--portal-ink)' }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !showDetails) submit(); if (e.key === 'Escape') onCancel(); }}
      />
      {showDetails && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-[13px] border rounded px-2.5 py-1.5 focus:outline-none"
            style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)', color: 'var(--portal-ink)' }}
          />
          <input
            type="number"
            min={0}
            step={0.25}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Estimated hours"
            className="text-[13px] border rounded px-2.5 py-1.5 focus:outline-none tabular-nums"
            style={{ borderColor: 'var(--portal-hairline)', backgroundColor: 'var(--portal-surface)', color: 'var(--portal-ink)' }}
          />
        </div>
      )}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowDetails(v => !v)}
          className="text-[11.5px] cursor-pointer"
          style={{ fontWeight: 500, color: 'var(--portal-muted)' }}
        >
          {showDetails ? '− Hide details' : '+ Due date & estimate'}
        </button>
        <div className="flex items-center gap-1.5">
          <button onClick={onCancel} className="text-[12px] px-2.5 py-1 cursor-pointer" style={{ color: 'var(--portal-muted)' }}>Cancel</button>
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="text-[12px] font-semibold px-3 py-1.5 rounded text-white disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
