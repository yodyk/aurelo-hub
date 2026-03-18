import { useState, useEffect, useMemo } from "react";
import { friendlyPaymentTerms } from "@/data/paymentTermsMap";
import { motion } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { useParams } from "react-router";
import AureloLogo from "@/components/AureloLogo";
import {
  Clock,
  FileText,
  FolderOpen,
  DollarSign,
  CalendarDays,
  Activity,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Timer,
  CheckSquare,
  Square,
  Plus,
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

interface PortalChecklist {
  id: string;
  title: string;
  project_id?: string;
  items: { id: string; text: string; completed: boolean; sort_order: number; added_by: string }[];
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

// ── Portal Page ─────────────────────────────────────────────────────

export default function ClientPortal() {
  const { token } = useParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Force light mode for the portal page
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground mb-1">Portal unavailable</h2>
          <p className="text-sm text-muted-foreground">{error || "This portal link is invalid or has been deactivated."}</p>
        </div>
      </div>
    );
  }

  const { client, projects, sessions, invoices, showCosts, branding } = data;
  const accent = branding.isWhiteLabel && branding.brandColor ? branding.brandColor : "#5ea1bf";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {branding.isWhiteLabel && branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.workspaceName || ""} className="h-7 w-auto max-w-[180px] object-contain" />
          ) : (
            <AureloLogo className="h-5" />
          )}
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: `${accent}15`, color: accent }}>
          Client Portal
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-8">
          {/* Client header */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {branding.clientFaviconUrl ? (
                <img src={branding.clientFaviconUrl} alt={client.name} className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-border bg-white">
                  <span className="text-[20px] font-semibold" style={{ color: accent }}>{client.name.charAt(0)}</span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{client.name}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accent}15`, color: accent }}>
                    {client.model}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs font-medium" style={{ color: client.status === "Active" ? "#059669" : undefined }}>
                    {client.status === "Active" ? client.status : <span className="text-muted-foreground">{client.status}</span>}
                  </span>
                </div>
              </div>
            </div>
            {branding.clientLogoUrl && (
              <img src={branding.clientLogoUrl} alt={client.name} className="h-14 w-auto max-w-[200px] object-contain" />
            )}
          </motion.div>

          {/* Summary cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard icon={Clock} label="Hours logged" value={fmtHours(client.hoursLogged || 0)} accent={accent} />
            <SummaryCard icon={FolderOpen} label="Projects" value={String(projects.length)} accent={accent} />
            {showCosts && (
              <>
                <SummaryCard icon={DollarSign} label="This month" value={fmt$(client.monthlyEarnings || 0)} accent={accent} />
                <SummaryCard icon={FileText} label="Invoices" value={String(invoices.length)} accent={accent} />
              </>
            )}
            {!showCosts && (
              <SummaryCard icon={Activity} label="Sessions" value={String(sessions.length)} accent={accent} />
            )}
          </motion.div>

          {/* Retainer bar */}
          {client.model === "Retainer" && client.retainerTotal != null && client.retainerTotal > 0 && (
            <motion.div variants={itemVariants}>
              <RetainerBar
                total={client.retainerTotal}
                remaining={client.retainerRemaining || 0}
                accent={accent}
                showCosts={showCosts}
              />
            </motion.div>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <motion.div variants={itemVariants}>
              <SectionTitle icon={FolderOpen} title="Projects" accent={accent} />
              <div className="space-y-3 mt-4">
                {projects.map(p => (
                  <ProjectRow key={p.id} project={p} showCosts={showCosts} accent={accent} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Recent sessions */}
          {sessions.length > 0 && (
            <motion.div variants={itemVariants}>
              <SectionTitle icon={Timer} title="Recent activity" accent={accent} />
              <div className="mt-4 overflow-x-auto">
                <SessionsTable sessions={sessions.slice(0, 30)} projects={projects} showCosts={showCosts} accent={accent} />
              </div>
            </motion.div>
          )}

          {/* Invoices */}
          {invoices.length > 0 && showCosts && (
            <motion.div variants={itemVariants}>
              <SectionTitle icon={FileText} title="Invoices" accent={accent} />
              <div className="space-y-2 mt-4">
                {invoices.map(inv => (
                  <InvoiceRow key={inv.id} invoice={inv} accent={accent} />
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Footer */}
        {!branding.isWhiteLabel && (
          <div className="mt-16 pb-8 text-center">
            <p className="text-[11px] text-muted-foreground/50">
              Powered by{" "}
              <a href="https://getaurelo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Aurelo
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, accent }: { icon: any; title: string; accent: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4" style={{ color: accent }} />
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function RetainerBar({ total, remaining, accent, showCosts }: { total: number; remaining: number; accent: string; showCosts: boolean }) {
  const used = total - remaining;
  const pct = Math.min(100, Math.round((used / total) * 100));
  // Bright status colors: green = healthy, amber/orange = caution, red = critical
  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";

  return (
    <div className="p-5 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium text-foreground">Retainer usage</span>
        <span className="text-[13px] font-semibold" style={{ color: barColor }}>{pct}% used</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden bg-muted/50">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[11px] text-muted-foreground">{fmtHours(used)} used</span>
        <span className="text-[11px] text-muted-foreground">{fmtHours(remaining)} remaining of {fmtHours(total)}</span>
      </div>
    </div>
  );
}

function ProjectRow({ project: p, showCosts, accent }: { project: PortalProject; showCosts: boolean; accent: string }) {
  const progress = p.estimated_hours && p.hours ? Math.min(100, Math.round((p.hours / p.estimated_hours) * 100)) : null;

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-foreground">{p.name}</span>
          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${statusColor(p.status)}`}>
            {p.status}
          </span>
        </div>
        {showCosts && p.total_value != null && p.total_value > 0 && (
          <span className="text-[13px] font-medium" style={{ color: accent }}>{fmt$(p.total_value)}</span>
        )}
      </div>
      {p.description && (
        <p className="text-[12px] mt-1 line-clamp-2 text-muted-foreground">{p.description}</p>
      )}
      <div className="flex items-center gap-4 mt-3">
        {p.hours != null && (
          <span className="text-[11px] text-muted-foreground">
            {fmtHours(p.hours)}{p.estimated_hours ? ` / ${fmtHours(p.estimated_hours)}` : ""}
          </span>
        )}
        {p.start_date && (
          <span className="text-[11px] text-muted-foreground">
            {fmtDate(p.start_date)}{p.end_date ? ` → ${fmtDate(p.end_date)}` : ""}
          </span>
        )}
      </div>
      {progress !== null && (
        <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-muted/50">
          <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: accent }} />
        </div>
      )}
    </div>
  );
}

function SessionsTable({ sessions, projects, showCosts, accent }: { sessions: PortalSession[]; projects: PortalProject[]; showCosts: boolean; accent: string }) {
  const projectMap = useMemo(() => {
    const m: Record<string, string> = {};
    projects.forEach(p => { m[p.id] = p.name; });
    return m;
  }, [projects]);

  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-[11px] font-medium text-muted-foreground">
          <th className="py-2 pr-4">Date</th>
          <th className="py-2 pr-4">Task</th>
          <th className="py-2 pr-4">Project</th>
          <th className="py-2 pr-4 text-right">Hours</th>
          {showCosts && <th className="py-2 text-right">Revenue</th>}
        </tr>
      </thead>
      <tbody>
        {sessions.map(s => (
          <tr key={s.id} className="border-t border-border/50">
            <td className="py-2.5 pr-4 text-[13px] text-foreground">{fmtDate(s.date)}</td>
            <td className="py-2.5 pr-4 text-[13px] text-muted-foreground">
              {s.task || "—"}
              {s.work_tags && s.work_tags.length > 0 && (
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${accent}15`, color: accent }}>
                  {s.work_tags[0]}
                </span>
              )}
            </td>
            <td className="py-2.5 pr-4 text-[13px] text-muted-foreground">
              {s.project_id ? (projectMap[s.project_id] || "—") : "—"}
            </td>
            <td className="py-2.5 pr-4 text-[13px] text-right tabular-nums text-foreground">
              {fmtHours(s.duration)}
            </td>
            {showCosts && (
              <td className="py-2.5 text-[13px] text-right tabular-nums" style={{ color: accent }}>
                {s.revenue != null ? fmt$(s.revenue) : "—"}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InvoiceRow({ invoice: inv, accent }: { invoice: PortalInvoice; accent: string }) {
  const isPaid = inv.status.toLowerCase() === "paid";
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: isPaid ? "rgba(5,150,105,0.08)" : `${accent}15` }}>
          {isPaid ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <FileText className="w-4 h-4" style={{ color: accent }} />}
        </div>
        <div>
          <span className="text-[13px] font-medium text-foreground">{inv.number}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${statusColor(inv.status)}`}>
              {inv.status}
            </span>
            {inv.issued_date && (
              <span className="text-[11px] text-muted-foreground">Issued {fmtDate(inv.issued_date)}</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[14px] font-semibold text-foreground">
          {fmt$(inv.total, inv.currency)}
        </div>
        {inv.due_date && !isPaid && (
          <span className="text-[11px] text-muted-foreground">Due {fmtDate(inv.due_date)}</span>
        )}
        {inv.paid_date && isPaid && (
          <span className="text-[11px] text-green-600">Paid {fmtDate(inv.paid_date)}</span>
        )}
      </div>
    </div>
  );
}
