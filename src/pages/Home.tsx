/**
 * Today — Phase 2 of the Aurelo transformation roadmap.
 *
 * Replaces the old Home greeting with a working surface:
 *   1. Needs You rail (overdue invoices, hot retainers, scope creep, follow-ups)
 *   2. Hero earnings DisplayMetric with Gross/Net segmented control
 *   3. Week Pulse (today vs target + 5-day bars)
 *   4. Active work + Recent work columns
 *   5. Where your time goes + Revenue by client
 *
 * Composition is hairline-first. Card chrome is reserved for the hero only.
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle,
  Timer,
  TrendingDown,
  Users,
  Receipt,
  ChevronRight,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";

import { useData } from "../data/DataContext";
import { useAuth } from "../data/AuthContext";
import { formatMoney, formatPercent, formatDate, formatCount } from "@/lib/format";

import * as settingsApi from "../data/settingsApi";
import * as invoiceApi from "../data/invoiceApi";
import type { Invoice } from "../data/invoiceApi";
import { usePlan } from "../data/PlanContext";
import { StarterUpgradeCTA } from "../components/TrialBanner";
import { SetupChecklist } from "../components/SetupChecklist";
import { NowStrip } from "../components/NowStrip";
import { TodayTasksModule } from "../components/TodayTasksModule";
import { useRoleAccess } from "../data/useRoleAccess";
import {
  PageHeader,
  SectionEyebrow,
  DisplayMetric,
  SegmentedControl,
  HairlineBar,
} from "../components/primitives/composition";

// ── Helpers ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 700;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return (
    <>
      {prefix}
      {formatCount(display)}
    </>
  );
}

function getMonthSessions(sessions: any[], monthsAgo = 0) {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return sessions.filter((s) => {
    const d = new Date(s.date);
    return d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  });
}

function getWeekSessions(sessions: any[]) {
  const now = new Date();
  const dow = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  start.setHours(0, 0, 0, 0);
  return sessions.filter((s) => {
    const d = new Date(s.date);
    return d >= start && d <= now;
  });
}

function getDayLabel(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] as const } },
};

// ── Component ────────────────────────────────────────────────────────

export default function Today() {
  const navigate = useNavigate();
  const {
    sessions,
    clients,
    financialDefaults,
    loading: dataLoading,
    allProjects,
    loadAllProjects,
  } = useData();
  const { user } = useAuth();
  const { can } = usePlan();
  const hasFullInsights = can("fullInsights");
  const { canViewFinancials } = useRoleAccess();

  const [viewMode, setViewMode] = useState<"gross" | "net">("gross");
  const [workspaceName, setWorkspaceName] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!user) return;
    settingsApi.loadSetting("workspace").then((ws: any) => {
      if (ws?.name) setWorkspaceName(ws.name);
    }).catch(() => {});
    loadAllProjects().catch(() => {});
    invoiceApi.loadInvoices().then(setInvoices).catch(() => {});
  }, [user]);

  // ── Metrics ────────────────────────────────────────────────────────
  const thisMonth = useMemo(() => getMonthSessions(sessions, 0), [sessions]);
  const lastMonth = useMemo(() => getMonthSessions(sessions, 1), [sessions]);
  const thisWeek = useMemo(() => getWeekSessions(sessions), [sessions]);

  const gross = useMemo(() => thisMonth.reduce((s, x) => s + (x.revenue || 0), 0), [thisMonth]);
  const lastGross = useMemo(() => lastMonth.reduce((s, x) => s + (x.revenue || 0), 0), [lastMonth]);
  const totalHours = useMemo(() => thisMonth.reduce((s, x) => s + (x.duration || 0), 0), [thisMonth]);
  const billableHours = useMemo(
    () => thisMonth.filter((s) => s.billable).reduce((acc, x) => acc + (x.duration || 0), 0),
    [thisMonth]
  );

  const netMult = 1 - financialDefaults.taxRate - financialDefaults.processingFeeRate;
  const net = Math.round(gross * netMult);
  const current = viewMode === "gross" ? gross : net;
  const previous = viewMode === "gross" ? lastGross : Math.round(lastGross * netMult);

  const monthChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isUp = current >= previous;

  const trueRate = totalHours > 0 ? Math.round(current / totalHours) : 0;
  const billablePct = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;

  const weekHours = useMemo(() => thisWeek.reduce((s, x) => s + (x.duration || 0), 0), [thisWeek]);
  const weeklyTarget = financialDefaults.weeklyTarget || 40;

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = Math.round(gross * (daysInMonth / Math.max(dayOfMonth, 1)));
  const projectedDisplay = viewMode === "gross" ? projected : Math.round(projected * netMult);

  // Week days
  const weekDays = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const wNow = new Date();
    const dow = wNow.getDay();
    const monday = new Date(wNow);
    monday.setDate(wNow.getDate() - (dow === 0 ? 6 : dow - 1));
    return labels.map((label, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const ymd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      const hours = sessions
        .filter((s: any) => s.rawDate === ymd)
        .reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
      return {
        label,
        hours,
        isFuture: day > wNow,
        isToday: day.toDateString() === wNow.toDateString(),
      };
    });
  }, [sessions]);

  // Retainer health
  const retainers = useMemo(() => {
    return clients
      .filter((c) => c.model === "Retainer" && c.status === "Active" && c.retainerTotal > 0)
      .map((c) => {
        const used = c.retainerTotal - (c.retainerRemaining || 0);
        const pct = used / c.retainerTotal;
        return { id: c.id, name: c.name, used, total: c.retainerTotal, remaining: c.retainerRemaining || 0, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [clients]);

  // Active projects
  const activeProjects = useMemo(() => {
    return allProjects
      .filter((p) => p.status === "In Progress")
      .map((p) => ({
        ...p,
        clientName: clients.find((c) => c.id === p.clientId)?.name || "Unknown",
        completion: p.estimatedHours > 0 ? p.hours / p.estimatedHours : 0,
      }))
      .sort((a, b) => b.completion - a.completion)
      .slice(0, 5);
  }, [allProjects, clients]);

  // Revenue by client (full insights)
  const clientRevenue = useMemo(() => {
    const map: Record<string, { name: string; id: string; revenue: number; hours: number }> = {};
    for (const s of thisMonth) {
      if (!s.clientId) continue;
      if (!map[s.clientId]) map[s.clientId] = { name: s.client, id: s.clientId, revenue: 0, hours: 0 };
      map[s.clientId].revenue += s.revenue || 0;
      map[s.clientId].hours += s.duration || 0;
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [thisMonth]);

  // Activity feed (recent work)
  const activityFeed = useMemo(() => {
    const groups: { date: string; label: string; sessions: any[] }[] = [];
    const seen = new Set<string>();
    for (const s of sessions.slice(0, 30)) {
      if (!seen.has(s.date)) {
        seen.add(s.date);
        if (groups.length < 3) groups.push({ date: s.date, label: getDayLabel(s.date), sessions: [] });
      }
      const g = groups.find((g) => g.date === s.date);
      if (g) g.sessions.push(s);
    }
    return groups;
  }, [sessions]);

  // Time allocation
  const timeAllocation = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of thisMonth) {
      const tag = (s.workTags || s.tags || [])[0] || "Other";
      map[tag] = (map[tag] || 0) + (s.duration || 0);
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .map(([category, hours]) => ({
        category,
        hours: Math.round(hours * 10) / 10,
        pct: total > 0 ? hours / total : 0,
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [thisMonth]);

  // ── Needs You signals ──────────────────────────────────────────────
  type Signal = {
    id: string;
    icon: React.ReactNode;
    tone: "danger" | "warning" | "info";
    title: string;
    detail: string;
    onClick: () => void;
  };

  const signals = useMemo<Signal[]>(() => {
    const out: Signal[] = [];

    // Overdue invoices
    const overdue = invoices.filter((i) => i.status === "overdue");
    for (const inv of overdue.slice(0, 4)) {
      out.push({
        id: `inv-${inv.id}`,
        icon: <Receipt className="w-3.5 h-3.5" />,
        tone: "danger",
        title: `${inv.clientName} — invoice ${inv.number} overdue`,
        detail: `${formatMoney(inv.total)} · due ${formatDate(inv.dueDate, "short")}`,
        onClick: () => navigate("/invoicing"),
      });
    }

    // Hot retainers (≥85%)
    for (const r of retainers.filter((r) => r.pct >= 0.85)) {
      out.push({
        id: `ret-${r.id}`,
        icon: <Timer className="w-3.5 h-3.5" />,
        tone: r.pct >= 0.9 ? "danger" : "warning",
        title: `${r.name} — ${Math.round(r.pct * 100)}% retainer used`,
        detail: `${r.remaining}h remaining of ${r.total}h`,
        onClick: () => navigate(`/clients/${r.id}`),
      });
    }

    // Scope creep
    for (const p of allProjects) {
      if (p.status !== "In Progress" || !p.totalValue || !p.hours) continue;
      const client = clients.find((c) => c.id === p.clientId);
      if (!client?.rate) continue;
      const effRate = p.totalValue / p.hours;
      if (effRate < client.rate) {
        const severe = effRate < client.rate * 0.5;
        out.push({
          id: `creep-${p.id}`,
          icon: <TrendingDown className="w-3.5 h-3.5" />,
          tone: severe ? "danger" : "warning",
          title: `${client.name} — ${p.name} at ${formatMoney(effRate, { precision: "compact" })}/hr`,
          detail: `Below your ${formatMoney(client.rate, { precision: "compact" })}/hr rate · ${p.hours}h on ${formatMoney(p.totalValue)}`,

          onClick: () => navigate(`/clients/${p.clientId}`),
        });
      }
    }

    // Prospect follow-ups (no activity in 7d)
    for (const p of clients.filter((c) => c.status === "Prospect")) {
      const ps = sessions.filter((s) => s.clientId === p.id);
      const recent = ps.some((s) => Date.now() - new Date(s.date).getTime() < 7 * 24 * 60 * 60 * 1000);
      if (!recent) {
        out.push({
          id: `pro-${p.id}`,
          icon: <Users className="w-3.5 h-3.5" />,
          tone: "info",
          title: `${p.name} — follow up`,
          detail: ps.length ? `Last activity ${ps[0].date}` : "No sessions logged",
          onClick: () => navigate(`/clients/${p.id}`),
        });
      }
    }

    return out.slice(0, 6);
  }, [invoices, retainers, allProjects, clients, sessions, navigate]);

  const hasData = clients.length > 0 || sessions.length > 0;

  const CATEGORY_HUES: Record<string, string> = {
    Design: "var(--primary)",
    Development: "var(--primary)",
    "Strategy/Research": "var(--warning)",
    Meetings: "var(--muted-foreground)",
    Prospecting: "var(--destructive)",
    Admin: "var(--muted-foreground)",
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <PageHeader
        eyebrow={workspaceName || undefined}
        title="Today"
        subtitle={now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        actions={
          canViewFinancials && hasData ? (
            <SegmentedControl<"gross" | "net">
              ariaLabel="Earnings view"
              options={[
                { value: "gross", label: "Gross" },
                { value: "net", label: "Net" },
              ]}
              value={viewMode}
              onChange={setViewMode}
            />
          ) : undefined
        }
      />

      <div className="px-4 lg:px-6 py-6 space-y-10">
        <SetupChecklist />

        {/* Empty state */}
        {!dataLoading && !hasData && (
          <motion.div variants={item} className="border border-border bg-card px-5 py-4 flex items-center gap-3 rounded-md">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <div>
              <div className="type-body font-semibold">Your workspace is empty</div>
              <div className="type-meta">Add your first client to begin tracking work.</div>
            </div>
          </motion.div>
        )}




        {/* ── Needs Attention rail ── */}
        {signals.length > 0 && (
          <motion.section variants={item}>
            <SectionEyebrow trailing={`${signals.length} item${signals.length === 1 ? "" : "s"}`}>
              Needs attention
            </SectionEyebrow>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {signals.map((sig) => {
                const toneColor =
                  sig.tone === "danger"
                    ? "var(--destructive)"
                    : sig.tone === "warning"
                      ? "var(--warning)"
                      : "var(--primary)";
                return (
                  <li
                    key={sig.id}
                    onClick={sig.onClick}
                    className="flex items-center gap-3 py-3 cursor-pointer group hover:bg-[color:var(--surface-sunken)] -mx-2 px-2 transition-colors"
                  >
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 flex-shrink-0"
                      style={{ color: toneColor, background: `color-mix(in oklab, ${toneColor} 10%, transparent)`, borderRadius: 4 }}
                    >
                      {sig.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="type-body truncate" style={{ fontWeight: 500 }}>{sig.title}</div>
                      <div className="type-meta truncate">{sig.detail}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </li>
                );
              })}
            </ul>
          </motion.section>
        )}

        {/* ── Hero: earnings DisplayMetric ── */}
        {canViewFinancials && (
          <motion.section variants={item} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7">
              <SectionEyebrow>Earnings this month</SectionEyebrow>
              <div className="mt-3">
                <DisplayMetric
                  value={
                    <>
                      $<AnimatedNumber value={current} />
                    </>
                  }
                  delta={
                    hasData && previous > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {formatPercent(Math.abs(monthChange), { fraction: false })} vs last month
                      </span>
                    ) : undefined
                  }
                  trend={isUp ? "up" : "down"}
                />
                {hasData && (
                  <div className="type-meta mt-2">
                    Projected <span className="text-foreground tabular-nums" style={{ fontWeight: 500 }}>{formatMoney(projectedDisplay, { precision: "compact" })}</span> by month end
                  </div>
                )}
              </div>
            </div>

            {/* Inline stat rail */}
            <div className="lg:col-span-5 grid grid-cols-3 gap-6">
              <div>
                <div className="type-eyebrow mb-2">Hours</div>
                <div className="type-section tabular-nums">
                  {Math.round(totalHours * 10) / 10}
                  <span className="type-meta ml-1">h</span>
                </div>
              </div>
              <div>
                <div className="type-eyebrow mb-2">Effective rate</div>
                <div className="type-section tabular-nums">
                  ${trueRate}
                  <span className="type-meta ml-1">/h</span>
                </div>
              </div>
              <div>
                <div className="type-eyebrow mb-2">Billable</div>
                <div className="type-section tabular-nums">
                  {billablePct}
                  <span className="type-meta ml-1">%</span>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* ── Week Pulse ── */}
        <motion.section variants={item}>
          <SectionEyebrow
            trailing={
              <>
                <span className="text-foreground tabular-nums" style={{ fontWeight: 500 }}>
                  {Math.round(weekHours * 10) / 10}h
                </span>
                <span className="ml-1">of {weeklyTarget}h</span>
              </>
            }
          >
            Week pulse
          </SectionEyebrow>

          <div className="mt-3">
            <HairlineBar value={weekHours / weeklyTarget} threshold={false} height={4} />
          </div>

          <div className="mt-5 flex items-end gap-3 border-b border-border">
            {weekDays.map((d) => {
              const maxH = Math.max(...weekDays.map((x) => x.hours), 1);
              const ratio = d.hours > 0 ? Math.max(d.hours / maxH, 0.05) : 0;
              const barColor = d.isFuture
                ? "var(--hairline)"
                : d.isToday
                  ? "var(--primary)"
                  : "color-mix(in oklab, var(--primary) 40%, transparent)";
              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-0">
                  <div className="relative w-full flex items-end justify-center" style={{ height: 56 }}>
                    {d.hours > 0 && (
                      <span className="absolute -top-1 type-meta tabular-nums">{Math.round(d.hours * 10) / 10}h</span>
                    )}
                    <div
                      className="w-full max-w-[28px] transition-all duration-500"
                      style={{ height: `${ratio * 44}px`, background: barColor, minHeight: d.hours === 0 ? 1 : 4 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-end gap-3">
            {weekDays.map((d) => (
              <div key={d.label} className="flex-1 flex justify-center">
                <span
                  className={`type-meta ${d.isToday ? "text-foreground" : ""}`}
                  style={{ fontWeight: d.isToday ? 600 : 400 }}
                >
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Focus surface (PART E refinement) — between Week Pulse and Active work ── */}
        <motion.section variants={item} className="space-y-6">
          <NowStrip />
          <TodayTasksModule />
        </motion.section>

        {/* ── Two columns: Active work + Recent activity ── */}
        <motion.section variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Active work */}
          <div>
            <SectionEyebrow
              trailing={
                activeProjects.length > 0 ? (
                  <button
                    onClick={() => navigate("/time")}
                    className="inline-flex items-center gap-1 text-foreground hover:opacity-70 transition-opacity"
                    style={{ fontWeight: 500 }}
                  >
                    All work <ArrowRight className="w-3 h-3" />
                  </button>
                ) : undefined
              }
            >
              Active projects
            </SectionEyebrow>
            {activeProjects.length > 0 ? (
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {activeProjects.map((p) => (
                  <li
                    key={`${p.clientId}-${p.id}`}
                    onClick={() => navigate(`/clients/${p.clientId}`)}
                    className="py-3 cursor-pointer group hover:bg-[color:var(--surface-sunken)] -mx-2 px-2 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="type-body truncate" style={{ fontWeight: 500 }}>{p.name}</div>
                        <div className="type-meta truncate">{p.clientName}</div>
                      </div>
                      <span className="type-meta tabular-nums flex-shrink-0">
                        {p.hours || 0}h{p.estimatedHours ? ` / ${p.estimatedHours}h` : ""}
                      </span>
                    </div>
                    {p.estimatedHours > 0 && <HairlineBar value={p.completion} threshold height={1} />}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 type-meta py-6 text-center border-y border-border">No active work</div>
            )}
          </div>

          {/* Recent activity */}
          <div>
            <SectionEyebrow
              trailing={
                <button
                  onClick={() => navigate("/time")}
                  className="inline-flex items-center gap-1 text-foreground hover:opacity-70 transition-opacity"
                  style={{ fontWeight: 500 }}
                >
                  Time log <ArrowRight className="w-3 h-3" />
                </button>
              }
            >
              Recent activity
            </SectionEyebrow>
            {activityFeed.length > 0 ? (
              <div className="mt-3 border-y border-border">
                {activityFeed.map((group, gi) => (
                  <div key={group.date} className={gi > 0 ? "border-t border-border" : ""}>
                    <div className="py-2 px-2 -mx-2 bg-[color:var(--surface-sunken)] type-eyebrow">{group.label}</div>
                    <ul className="divide-y divide-border">
                      {group.sessions.slice(0, 3).map((s: any) => (
                        <li
                          key={s.id}
                          onClick={() => navigate(`/clients/${s.clientId}`)}
                          className="py-2.5 px-2 -mx-2 flex items-center gap-3 cursor-pointer hover:bg-[color:var(--surface-sunken)] transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="type-body truncate" style={{ fontWeight: 500 }}>{s.task || "Untitled"}</div>
                            <div className="type-meta truncate">{s.client}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="type-body tabular-nums" style={{ fontWeight: 500 }}>{s.duration}h</div>
                            {canViewFinancials && (s.revenue ?? 0) > 0 && (
                              <div className="type-meta tabular-nums">${s.revenue}</div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 type-meta py-6 text-center border-y border-border">No sessions yet</div>
            )}
          </div>
        </motion.section>

        {/* ── Where time goes + Revenue by client ── */}
        {(timeAllocation.length > 0 || clientRevenue.length > 0) && (
          <motion.section variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {timeAllocation.length > 0 && (
              <div>
                <SectionEyebrow>Where time goes</SectionEyebrow>
                <div className="mt-3 h-1 flex overflow-hidden">

                  {timeAllocation.map((cat) => (
                    <div
                      key={cat.category}
                      style={{
                        width: `${cat.pct * 100}%`,
                        background: CATEGORY_HUES[cat.category] || "var(--muted-foreground)",
                        opacity: 0.7,
                      }}
                      title={`${cat.category} · ${cat.hours}h`}
                    />
                  ))}
                </div>
                <ul className="mt-4 space-y-2">
                  {timeAllocation.slice(0, 6).map((cat) => (
                    <li key={cat.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-1.5 h-1.5 flex-shrink-0"
                          style={{ background: CATEGORY_HUES[cat.category] || "var(--muted-foreground)" }}
                        />
                        <span className="type-body truncate">{cat.category}</span>
                      </div>
                      <div className="flex items-baseline gap-3 flex-shrink-0">
                        <span className="type-body tabular-nums" style={{ fontWeight: 500 }}>{cat.hours}h</span>
                        <span className="type-meta tabular-nums w-8 text-right">{Math.round(cat.pct * 100)}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canViewFinancials && clientRevenue.length > 0 && (
              <div>
                <SectionEyebrow
                  trailing={
                    <button
                      onClick={() => navigate("/clients")}
                      className="inline-flex items-center gap-1 text-foreground hover:opacity-70 transition-opacity"
                      style={{ fontWeight: 500 }}
                    >
                      All clients <ArrowRight className="w-3 h-3" />
                    </button>
                  }
                >
                  Revenue by client
                </SectionEyebrow>
                <ul className="mt-3 divide-y divide-border border-y border-border">
                  {clientRevenue.map((cr) => {
                    const maxRev = clientRevenue[0]?.revenue || 1;
                    const share = gross > 0 ? Math.round((cr.revenue / gross) * 100) : 0;
                    return (
                      <li
                        key={cr.id}
                        onClick={() => navigate(`/clients/${cr.id}`)}
                        className="py-3 cursor-pointer group hover:bg-[color:var(--surface-sunken)] -mx-2 px-2 transition-colors"
                      >
                        <div className="flex items-baseline justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="type-body truncate" style={{ fontWeight: 500 }}>{cr.name}</div>
                            <div className="type-meta truncate">{cr.hours}h logged</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="type-body tabular-nums" style={{ fontWeight: 600 }}>
                              {formatMoney(cr.revenue)}
                            </div>
                            <div className="type-meta tabular-nums">{share}%</div>
                          </div>
                        </div>
                        <HairlineBar value={cr.revenue / maxRev} threshold={false} height={1} />
                      </li>
                    );
                  })}
                </ul>
                {!hasFullInsights && (
                  <button
                    onClick={() => navigate("/settings?tab=billing")}
                    className="mt-3 inline-flex items-center gap-1.5 type-meta hover:text-foreground transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Unlock deeper insights with Pro
                  </button>
                )}
              </div>
            )}
          </motion.section>
        )}

        <StarterUpgradeCTA />

        {/* Hide overflow warning for noisy scrollbar */}
        <div className="h-2" aria-hidden />
      </div>
    </motion.div>
  );
}
