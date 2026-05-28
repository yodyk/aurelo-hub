import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { useParams } from "react-router";
import AureloLogo from "@/components/AureloLogo";
import {
  Clock,
  FileText,
  FolderOpen,
  DollarSign,
  Activity,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Timer,
  CheckSquare,
  Square,
  Plus,
  ChevronDown,
  ChevronRight,
  Tag,
  Check,
} from "lucide-react";
import { format } from "date-fns";

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
}

interface PortalSession {
  id: string;
  date: string;
  duration: number;
  task?: string;
  notes?: string;
  work_tags?: string[];
  billable: boolean;
  project_id?: string;
  revenue?: number;
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
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
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

interface PortalData {
  client: PortalClient;
  projects: PortalProject[];
  sessions: PortalSession[];
  invoices: PortalInvoice[];
  checklists: PortalChecklist[];
  showCosts: boolean;
  branding: PortalBranding;
}

// ── Helpers ─────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function fmt$(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function fmtHours(h: number) {
  return `${h.toFixed(1)}h`;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try { return format(new Date(d), "MMM d, yyyy"); } catch { return d; }
}

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s === "paid") return "text-emerald-600 bg-emerald-50";
  if (s === "sent" || s === "issued") return "text-sky-600 bg-sky-50";
  if (s === "overdue") return "text-red-500 bg-red-50";
  if (s === "draft") return "text-muted-foreground bg-muted/30";
  if (s === "in progress") return "text-sky-600 bg-sky-50";
  if (s === "completed") return "text-emerald-600 bg-emerald-50";
  return "text-muted-foreground bg-muted/30";
}

function statusDot(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "bg-emerald-500";
  if (s === "paused" || s === "on hold") return "bg-amber-400";
  return "bg-muted-foreground/40";
}

// ── Portal Page ─────────────────────────────────────────────────────

export default function ClientPortal() {
  const { token } = useParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#2e7d9a] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-1">Portal unavailable</h2>
          <p className="text-sm text-[#6b7280]">{error || "This portal link is invalid or has been deactivated."}</p>
        </div>
      </div>
    );
  }

  const { client, projects, sessions, invoices, checklists, showCosts, branding } = data;
  const accent = branding.isWhiteLabel && branding.brandColor ? branding.brandColor : "#2e7d9a";

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const paidInvoices = invoices.filter(i => i.status.toLowerCase() === "paid");
  const outstandingInvoices = invoices.filter(i => ["sent", "issued", "overdue"].includes(i.status.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-[#1a1a2e]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e7eb] px-6 lg:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.isWhiteLabel && branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.workspaceName || ""} className="h-7 w-auto max-w-[180px] object-contain" />
            ) : (
              <AureloLogo className="h-5" />
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-wide uppercase px-3 py-1.5 rounded-full" style={{ backgroundColor: `${accent}12`, color: accent }}>
            Client Portal
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 lg:py-12">
        <motion.div initial="hidden" animate="show" variants={containerVariants}>
          {/* Client hero */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {branding.clientFaviconUrl ? (
                  <img src={branding.clientFaviconUrl} alt={client.name} className="h-14 w-14 rounded-2xl object-cover shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}08)` }}>
                    <span className="text-2xl font-bold" style={{ color: accent }}>{client.name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#1a1a2e]">{client.name}</h1>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-circle ${statusDot(client.status)}`} />
                      <span className="text-sm text-[#6b7280]">{client.status}</span>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f3f4f6] text-[#6b7280]">{client.model}</span>
                  </div>
                </div>
              </div>
              {branding.clientLogoUrl && (
                <img src={branding.clientLogoUrl} alt={client.name} className="h-12 w-auto max-w-[180px] object-contain hidden md:block" />
              )}
            </div>
            {client.portalGreeting && (
              <p className="mt-4 text-[15px] text-[#6b7280] max-w-2xl leading-relaxed">{client.portalGreeting}</p>
            )}
          </motion.div>

          {/* Summary stats row */}
          <PortalSummary
            client={client}
            projects={projects}
            sessions={sessions}
            checklists={checklists}
            totalInvoiced={totalInvoiced}
            showCosts={showCosts}
            accent={accent}
          />

          {/* Tabbed content */}
          <PortalTabs
            client={client}
            projects={projects}
            sessions={sessions}
            invoices={invoices}
            checklists={checklists}
            showCosts={showCosts}
            accent={accent}
            token={token!}
          />
        </motion.div>


        {/* Footer */}
        {!branding.isWhiteLabel && (
          <div className="mt-20 pb-8 text-center">
            <p className="text-[11px] text-[#d1d5db]">
              Powered by{" "}
              <a href="https://getaurelo.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#9ca3af] transition-colors">
                Aurelo
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary stats (with Open Tasks) ────────────────────────────────

function PortalSummary({
  client, projects, sessions, checklists, totalInvoiced, showCosts, accent,
}: {
  client: PortalClient;
  projects: PortalProject[];
  sessions: PortalSession[];
  checklists: PortalChecklist[];
  totalInvoiced: number;
  showCosts: boolean;
  accent: string;
}) {
  const openTasks = useMemo(
    () => checklists.reduce((acc, cl) => acc + cl.items.filter(i => i.status !== 'done').length, 0),
    [checklists]
  );

  return (
    <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatCard icon={Clock} label="Hours Logged" value={fmtHours(client.hoursLogged || 0)} accent={accent} />
      <StatCard icon={CheckSquare} label="Open Tasks" value={String(openTasks)} accent={accent} />
      <StatCard icon={FolderOpen} label="Active Projects" value={String(projects.filter(p => p.status.toLowerCase() === "in progress").length)} accent={accent} />
      {showCosts ? (
        <StatCard icon={DollarSign} label="This Month" value={fmt$(client.monthlyEarnings || 0)} accent={accent} />
      ) : (
        <StatCard icon={Activity} label="Total Sessions" value={String(sessions.length)} accent={accent} />
      )}
    </motion.div>
  );
}

// ── Tabbed content ─────────────────────────────────────────────────

type PortalTabId = 'retainer' | 'activity' | 'tasks' | 'projects';

function PortalTabs({
  client, projects, sessions, invoices, checklists, showCosts, accent, token,
}: {
  client: PortalClient;
  projects: PortalProject[];
  sessions: PortalSession[];
  invoices: PortalInvoice[];
  checklists: PortalChecklist[];
  showCosts: boolean;
  accent: string;
  token: string;
}) {
  const isRetainer = client.model === 'Retainer';
  const openTaskCount = useMemo(
    () => checklists.reduce((acc, cl) => acc + cl.items.filter(i => i.status !== 'done').length, 0),
    [checklists]
  );

  const tabs: { id: PortalTabId; label: string; count?: number }[] = [
    { id: 'retainer', label: isRetainer ? 'Retainer' : 'Summary' },
    { id: 'activity', label: 'Recent Activity', count: sessions.length || undefined },
    { id: 'tasks',    label: 'Tasks',           count: openTaskCount || undefined },
    { id: 'projects', label: 'Projects',        count: projects.length || undefined },
  ];

  const [active, setActive] = useState<PortalTabId>('retainer');
  const [hideCompleted, setHideCompleted] = useState(true);

  return (
    <motion.div variants={itemVariants}>
      {/* Tab bar */}
      <div className="border-b border-[#e5e7eb] mb-6 flex items-end gap-1 overflow-x-auto">
        {tabs.map(t => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className="relative inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] whitespace-nowrap transition-colors cursor-pointer"
              style={{
                fontWeight: isActive ? 600 : 500,
                color: isActive ? accent : '#6b7280',
              }}
            >
              {t.label}
              {t.count != null && (
                <span
                  className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-full tabular-nums"
                  style={{
                    backgroundColor: isActive ? `${accent}14` : '#f3f4f6',
                    color: isActive ? accent : '#9ca3af',
                  }}
                >
                  {t.count}
                </span>
              )}
              {isActive && (
                <span className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full" style={{ backgroundColor: accent }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {active === 'retainer' && (
            <div className="space-y-5">
              {isRetainer && client.retainerTotal != null && client.retainerTotal > 0 ? (
                <RetainerBar total={client.retainerTotal} remaining={client.retainerRemaining || 0} />
              ) : (
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 text-center">
                  <p className="text-[14px] text-[#1a1a2e]" style={{ fontWeight: 600 }}>{client.model} engagement</p>
                  <p className="text-[12.5px] text-[#6b7280] mt-1">
                    This engagement isn't on a retainer model — see Recent Activity or Projects for progress details.
                  </p>
                </div>
              )}

              {invoices.length > 0 && showCosts && (
                <div>
                  <SectionHeader icon={FileText} title="Invoices" count={invoices.length} accent={accent} />
                  <div className="space-y-2 mt-3">
                    {invoices.map(inv => <InvoiceRow key={inv.id} invoice={inv} accent={accent} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {active === 'activity' && (
            <div>
              {sessions.length === 0 ? (
                <EmptyState icon={Timer} title="No sessions yet" body="Time entries for this engagement will appear here." />
              ) : (
                <div className="space-y-2">
                  {sessions.slice(0, 30).map(s => (
                    <SessionAccordion key={s.id} session={s} projects={projects} showCosts={showCosts} accent={accent} />
                  ))}
                  {sessions.length > 30 && (
                    <p className="text-[12px] text-[#9ca3af] text-center py-2">Showing 30 of {sessions.length} sessions</p>
                  )}
                </div>
              )}
            </div>
          )}

          {active === 'tasks' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] text-[#6b7280]">
                  {openTaskCount} open · {checklists.reduce((a, c) => a + c.items.length, 0)} total
                </span>
                <label className="inline-flex items-center gap-2 text-[12px] text-[#374151] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideCompleted}
                    onChange={(e) => setHideCompleted(e.target.checked)}
                    className="accent-current"
                    style={{ accentColor: accent }}
                  />
                  Hide completed
                </label>
              </div>
              {checklists.length === 0 ? (
                <EmptyState icon={CheckSquare} title="No tasks yet" body="Tasks will appear here when added." />
              ) : (
                <div className="space-y-3">
                  {checklists.map(cl => (
                    <PortalChecklistCard key={cl.id} checklist={cl} accent={accent} token={token} hideCompleted={hideCompleted} />
                  ))}
                </div>
              )}
            </div>
          )}

          {active === 'projects' && (
            <div>
              {projects.length === 0 ? (
                <EmptyState icon={FolderOpen} title="No projects yet" body="Projects added for this engagement will appear here." />
              ) : (
                <div className="space-y-3">
                  {projects.map(p => <ProjectCard key={p.id} project={p} showCosts={showCosts} accent={accent} />)}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-10 text-center">
      <Icon className="w-7 h-7 text-[#d1d5db] mx-auto mb-3" />
      <p className="text-[14px] text-[#1a1a2e]" style={{ fontWeight: 600 }}>{title}</p>
      <p className="text-[12.5px] text-[#6b7280] mt-1">{body}</p>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────


function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e7eb] p-4 lg:p-5">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}10` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
      </div>
      <div className="text-xl lg:text-2xl font-bold text-[#1a1a2e] tabular-nums">{value}</div>
      <div className="text-[11px] font-medium text-[#9ca3af] mt-0.5 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, accent }: { icon: any; title: string; count?: number; accent: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-4 h-4" style={{ color: accent }} />
      <h2 className="text-[16px] font-semibold text-[#1a1a2e]">{title}</h2>
      {count != null && (
        <span className="text-[11px] font-medium text-[#9ca3af] bg-[#f3f4f6] px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}

function RetainerBar({ total, remaining }: { total: number; remaining: number }) {
  const used = total - remaining;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#e5e7eb]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-[#1a1a2e]">Retainer Usage</span>
        <span className="text-sm font-bold tabular-nums" style={{ color: barColor }}>{pct}%</span>
      </div>
      <div className="h-3 rounded-circle overflow-hidden bg-[#f3f4f6]">
        <div className="h-full rounded-circle transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <div className="flex justify-between mt-2.5">
        <span className="text-[12px] text-[#9ca3af]">{fmtHours(used)} used</span>
        <span className="text-[12px] text-[#9ca3af]">{fmtHours(remaining)} remaining of {fmtHours(total)}</span>
      </div>
    </div>
  );
}

function ProjectCard({ project: p, showCosts, accent }: { project: PortalProject; showCosts: boolean; accent: string }) {
  const progress = p.estimated_hours && p.hours ? Math.min(100, Math.round((p.hours / p.estimated_hours) * 100)) : null;

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#e5e7eb] hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-semibold text-[#1a1a2e]">{p.name}</span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>
              {p.status}
            </span>
          </div>
          {p.description && (
            <p className="text-[13px] mt-1.5 text-[#6b7280] line-clamp-2 leading-relaxed">{p.description}</p>
          )}
        </div>
        {showCosts && p.total_value != null && p.total_value > 0 && (
          <span className="text-[15px] font-bold tabular-nums ml-4 flex-shrink-0" style={{ color: accent }}>{fmt$(p.total_value)}</span>
        )}
      </div>

      <div className="flex items-center gap-4 mt-3 text-[12px] text-[#9ca3af]">
        {p.hours != null && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {fmtHours(p.hours)}{p.estimated_hours ? ` / ${fmtHours(p.estimated_hours)}` : ""}
          </span>
        )}
        {p.start_date && (
          <span>{fmtDate(p.start_date)}{p.end_date ? ` → ${fmtDate(p.end_date)}` : ""}</span>
        )}
      </div>

      {progress !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[#9ca3af]">Progress</span>
            <span className="text-[11px] font-medium tabular-nums" style={{ color: accent }}>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-circle overflow-hidden bg-[#f3f4f6]">
            <div className="h-full rounded-circle transition-all" style={{ width: `${progress}%`, backgroundColor: accent }} />
          </div>
        </div>
      )}
    </div>
  );
}

function SessionAccordion({ session: s, projects, showCosts, accent }: { session: PortalSession; projects: PortalProject[]; showCosts: boolean; accent: string }) {
  const [open, setOpen] = useState(false);
  const projectName = useMemo(() => {
    if (!s.project_id) return null;
    return projects.find(p => p.id === s.project_id)?.name || null;
  }, [s.project_id, projects]);

  const hasDetails = !!(s.task || s.notes || (s.work_tags && s.work_tags.length > 0));

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden hover:shadow-sm transition-shadow">
      <button
        onClick={() => hasDetails && setOpen(o => !o)}
        className={`w-full flex items-center gap-3 p-3.5 text-left ${hasDetails ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#1a1a2e]">{fmtDate(s.date)}</span>
            {projectName && (
              <span className="text-[11px] text-[#9ca3af] truncate">· {projectName}</span>
            )}
          </div>
          {s.task && (
            <p className="text-[12px] text-[#6b7280] mt-0.5 truncate">{s.task}</p>
          )}
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="text-[13px] font-semibold tabular-nums text-[#1a1a2e]">{fmtHours(s.duration)}</span>
          {showCosts && s.revenue != null && (
            <span className="text-[12px] font-medium tabular-nums" style={{ color: accent }}>{fmt$(s.revenue)}</span>
          )}
          {hasDetails && (
            <ChevronDown className={`w-3.5 h-3.5 text-[#9ca3af] transition-transform ${open ? "rotate-180" : ""}`} />
          )}
        </div>
      </button>
      <AnimatePresence>
        {open && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 pt-0 border-t border-[#f3f4f6]">
              <div className="pt-3 space-y-2">
                {s.notes && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">Notes</span>
                    <p className="text-[13px] text-[#4b5563] leading-relaxed mt-1 whitespace-pre-wrap">{s.notes}</p>
                  </div>
                )}
                {s.work_tags && s.work_tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Tag className="w-3 h-3 text-[#9ca3af]" />
                    {s.work_tags.map(tag => (
                      <span key={tag} className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accent}12`, color: accent }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InvoiceRow({ invoice: inv, accent }: { invoice: PortalInvoice; accent: string }) {
  const isPaid = inv.status.toLowerCase() === "paid";
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-[#e5e7eb] hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: isPaid ? "#ecfdf5" : `${accent}10` }}>
          {isPaid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <FileText className="w-4 h-4" style={{ color: accent }} />}
        </div>
        <div>
          <span className="text-[14px] font-semibold text-[#1a1a2e]">{inv.number}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${statusColor(inv.status)}`}>
              {inv.status}
            </span>
            {inv.issued_date && (
              <span className="text-[11px] text-[#9ca3af]">Issued {fmtDate(inv.issued_date)}</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[15px] font-bold tabular-nums text-[#1a1a2e]">{fmt$(inv.total, inv.currency)}</div>
        {inv.due_date && !isPaid && (
          <span className="text-[11px] text-[#9ca3af]">Due {fmtDate(inv.due_date)}</span>
        )}
        {inv.paid_date && isPaid && (
          <span className="text-[11px] text-emerald-500">Paid {fmtDate(inv.paid_date)}</span>
        )}
      </div>
    </div>
  );
}

// ── Portal Task List Card ───────────────────────────────────────────

const PORTAL_STATUSES: { value: PortalTask['status']; label: string; dot: string; text: string; bg: string }[] = [
  { value: 'todo',        label: 'To do',       dot: '#9ca3af', text: '#6b7280', bg: '#f3f4f6' },
  { value: 'in_progress', label: 'In progress', dot: '#0ea5e9', text: '#0369a1', bg: '#e0f2fe' },
  { value: 'blocked',     label: 'Blocked',     dot: '#f59e0b', text: '#b45309', bg: '#fef3c7' },
  { value: 'done',        label: 'Done',        dot: '#22c55e', text: '#15803d', bg: '#dcfce7' },
];

function portalDueLabel(due?: string | null) {
  if (!due) return null;
  try {
    const d = new Date(due);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return { label: 'Due today', color: '#b45309', bg: '#fef3c7' };
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: '#b91c1c', bg: '#fee2e2' };
    if (diff <= 3) return { label: `Due in ${diff}d`, color: '#b45309', bg: '#fef3c7' };
    return { label: format(d, 'MMM d'), color: '#6b7280', bg: '#f3f4f6' };
  } catch { return null; }
}

function PortalChecklistCard({ checklist, accent, token, hideCompleted = false }: { checklist: PortalChecklist; accent: string; token: string; hideCompleted?: boolean }) {
  const [items, setItems] = useState<PortalTask[]>(checklist.items);
  const [composerOpen, setComposerOpen] = useState(false);

  const completedCount = items.filter(i => i.status === 'done').length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const visibleItems = hideCompleted ? items.filter(i => i.status !== 'done') : items;

  const cycleStatus = async (item: PortalTask) => {
    const order: PortalTask['status'][] = ['todo', 'in_progress', 'blocked', 'done'];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: next, completed: next === 'done' } : i));
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
          status: it.status || 'todo',
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
    } catch {
      /* silent */
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">
      <div className="h-1.5 bg-[#f3f4f6]">
        <div className="h-full transition-all duration-300 rounded-r-full" style={{ width: `${progress}%`, backgroundColor: progress === 100 ? "#22c55e" : accent }} />
      </div>

      <div className="p-4 lg:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14px] font-semibold text-[#1a1a2e]">{checklist.title}</span>
          <span className="text-[12px] font-medium tabular-nums" style={{ color: progress === 100 ? "#22c55e" : "#9ca3af" }}>
            {completedCount}/{totalCount}
          </span>
        </div>

        <div className="space-y-2">
          {visibleItems.map(item => {
            const cfg = PORTAL_STATUSES.find(s => s.value === item.status) || PORTAL_STATUSES[0];
            const due = portalDueLabel(item.due_date);
            return (
              <div key={item.id} className="border border-[#eef0f3] rounded-xl p-2.5 hover:bg-[#fafbfc] transition-colors">
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() => cycleStatus(item)}
                    title={`Status: ${cfg.label} — tap to advance`}
                    className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: cfg.dot, backgroundColor: item.status === 'done' ? cfg.dot : 'transparent' }}
                  >
                    {item.status === 'done' && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <span className={`text-[13px] flex-1 ${item.status === 'done' ? 'line-through text-[#b1b6bf]' : 'text-[#374151]'}`}>
                        {item.text}
                      </span>
                      {item.added_by === 'client' && (
                        <span className="text-[10px] font-medium text-[#9ca3af] bg-[#f3f4f6] px-1.5 py-0.5 rounded">You</span>
                      )}
                    </div>
                    {item.description && (
                      <div className="text-[12px] text-[#6b7280] mt-1 whitespace-pre-wrap">{item.description}</div>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span
                        className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: cfg.bg, color: cfg.text, fontWeight: 600 }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                        {cfg.label}
                      </span>
                      {(item.work_tags || []).map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded bg-[#f3f4f6] text-[#4b5563]" style={{ fontWeight: 500 }}>
                          <Tag className="w-2.5 h-2.5" /> {tag}
                        </span>
                      ))}
                      {due && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded" style={{ backgroundColor: due.bg, color: due.color, fontWeight: 500 }}>
                          <Clock className="w-2.5 h-2.5" /> {due.label}
                        </span>
                      )}
                      {item.estimated_hours != null && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded bg-[#f3f4f6] text-[#6b7280]" style={{ fontWeight: 500 }}>
                          <Clock className="w-2.5 h-2.5" /> {item.estimated_hours}h est
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="text-center py-4 text-[12px] text-[#9ca3af]">No tasks yet.</div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-[#f3f4f6]">
          {composerOpen ? (
            <PortalComposer accent={accent} onCancel={() => setComposerOpen(false)} onSubmit={handleAdd} />
          ) : (
            <button
              onClick={() => setComposerOpen(true)}
              className="inline-flex items-center gap-1.5 text-[12px] text-[#6b7280] hover:text-[#1a1a2e] transition-colors"
              style={{ fontWeight: 500 }}
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
        className="w-full text-[13px] bg-white border border-[#e5e7eb] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#9ca3af] text-[#374151]"
        onKeyDown={(e) => { if (e.key === 'Enter' && !showDetails) submit(); if (e.key === 'Escape') onCancel(); }}
      />
      {showDetails && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-[13px] bg-white border border-[#e5e7eb] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#9ca3af] text-[#374151]"
          />
          <input
            type="number"
            min={0}
            step={0.25}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Estimated hours"
            className="text-[13px] bg-white border border-[#e5e7eb] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#9ca3af] text-[#374151] tabular-nums"
          />
        </div>
      )}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowDetails(v => !v)}
          className="text-[11.5px] text-[#6b7280] hover:text-[#1a1a2e]"
          style={{ fontWeight: 500 }}
        >
          {showDetails ? '− Hide details' : '+ Due date & estimate'}
        </button>
        <div className="flex items-center gap-1.5">
          <button onClick={onCancel} className="text-[12px] px-2.5 py-1 text-[#6b7280] hover:text-[#1a1a2e]">Cancel</button>
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-md text-white disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
