import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
  TrendingUp,
  Users,
  Target,
  ArrowRight,
  Timer,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { motion, AnimatePresence } from "motion/react";

import { useData } from "../data/DataContext";
import { useAuth } from "../data/AuthContext";
import * as settingsApi from "../data/settingsApi";
import { toast } from "sonner";
import { usePlan } from "../data/PlanContext";
import { StarterUpgradeCTA } from "../components/TrialBanner";
import { SetupChecklist } from "../components/SetupChecklist";
import { useRoleAccess } from "../data/useRoleAccess";

// ── Helpers ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 800;
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
      {display.toLocaleString()}
      {suffix}
    </>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const BLUE = "#2e7d9a";
const GOLD = "#bfa044";
const RED = "#c27272";
const BLUE_BG = "rgba(94, 161, 191, 0.08)";
const GOLD_BG = "rgba(191, 160, 68, 0.08)";
const RED_BG = "rgba(194, 114, 114, 0.08)";

// ── Computed data helpers ────────────────────────────────────────────

function getMonthSessions(sessions: any[], monthsAgo: number = 0) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const targetMonth = target.getMonth();
  const targetYear = target.getFullYear();
  return sessions.filter((s) => {
    const d = new Date(s.date);
    return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
  });
}

function getWeekSessions(sessions: any[]) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  return sessions.filter((s) => {
    const d = new Date(s.date);
    return d >= startOfWeek && d <= now;
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

// ── Tab types ────────────────────────────────────────────────────────

type RightTab = "activity" | "clients";

// ── Main Component ───────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const {
    sessions,
    clients,
    financialDefaults,
    loading: dataLoading,
    refresh,
    allProjects,
    loadAllProjects,
  } = useData();
  const { user } = useAuth();
  const { can, planId } = usePlan();
  const hasFullInsights = can("fullInsights");
  const { canViewFinancials, isMember } = useRoleAccess();
  const [viewMode, setViewMode] = useState<"gross" | "net">("gross");
  const [financialOpen, setFinancialOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceLogo, setWorkspaceLogo] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("activity");
  const [chartRange, setChartRange] = useState<"daily" | "monthly">("daily");

  useEffect(() => {
    if (!user) return;
    settingsApi
      .loadSetting("workspace")
      .then((ws: any) => {
        if (ws?.name) setWorkspaceName(ws.name);
      })
      .catch(() => {});
    settingsApi
      .loadSetting("profile")
      .then((p: any) => {
        if (p?.name) setProfileName(p.name);
      })
      .catch(() => {});
    settingsApi
      .loadLogos()
      .then((logos) => {
        if (logos.app?.url) setWorkspaceLogo(logos.app.url);
      })
      .catch(() => {});
    loadAllProjects().catch(() => {});
  }, [user]);

  const displayFirstName = (profileName || user?.name || '').split(" ")[0] || 'there';

  // ── Computed metrics ───────────────────────────────────────────────
  const thisMonthSessions = useMemo(() => getMonthSessions(sessions, 0), [sessions]);
  const lastMonthSessions = useMemo(() => getMonthSessions(sessions, 1), [sessions]);
  const thisWeekSessions = useMemo(() => getWeekSessions(sessions), [sessions]);

  const grossEarnings = useMemo(
    () => thisMonthSessions.reduce((sum, s) => sum + (s.revenue || 0), 0),
    [thisMonthSessions],
  );
  const lastMonthGross = useMemo(
    () => lastMonthSessions.reduce((sum, s) => sum + (s.revenue || 0), 0),
    [lastMonthSessions],
  );
  const totalHoursThisMonth = useMemo(
    () => thisMonthSessions.reduce((sum, s) => sum + (s.duration || 0), 0),
    [thisMonthSessions],
  );
  const billableHoursThisMonth = useMemo(
    () => thisMonthSessions.filter((s) => s.billable).reduce((sum, s) => sum + (s.duration || 0), 0),
    [thisMonthSessions],
  );

  const processingFee = grossEarnings * financialDefaults.processingFeeRate;
  const taxEstimate = grossEarnings * financialDefaults.taxRate;
  const netEarnings = grossEarnings - processingFee - taxEstimate;
  const netMultiplier = 1 - financialDefaults.taxRate - financialDefaults.processingFeeRate;

  const currentEarnings = viewMode === "gross" ? grossEarnings : Math.round(netEarnings);
  const lastMonthEarnings = viewMode === "gross" ? lastMonthGross : Math.round(lastMonthGross * netMultiplier);

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedEarnings = Math.round(grossEarnings * (daysInMonth / Math.max(dayOfMonth, 1)));
  const projectedDisplay = viewMode === "gross" ? projectedEarnings : Math.round(projectedEarnings * netMultiplier);

  const monthChange =
    lastMonthEarnings > 0 ? (((currentEarnings - lastMonthEarnings) / lastMonthEarnings) * 100).toFixed(1) : "0.0";
  const isUp = currentEarnings >= lastMonthEarnings;
  const paceDirection = isUp ? "ahead of" : "behind";

  const trueHourlyRate = totalHoursThisMonth > 0 ? currentEarnings / totalHoursThisMonth : 0;
  const billablePercentage =
    totalHoursThisMonth > 0 ? Math.round((billableHoursThisMonth / totalHoursThisMonth) * 100) : 0;

  const weekHours = useMemo(() => thisWeekSessions.reduce((sum, s) => sum + (s.duration || 0), 0), [thisWeekSessions]);
  const weeklyTarget = financialDefaults.weeklyTarget || 40;

  // Summary stats
  const activeClientCount = clients.filter(c => c.status === "Active").length;
  const activeProjectCount = allProjects.filter(p => p.status === "In Progress").length;
  const activeRetainerCount = clients.filter(c => c.model === "Retainer" && c.status === "Active" && c.retainerTotal > 0).length;

  // Daily bar chart data (past 30 days)
  const dailyChartData = useMemo(() => {
    const days: { label: string; earnings: number; net: number; gross: number; value: number }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const dayYmd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const daySessions = sessions.filter((s: any) => s.rawDate === dayYmd || s.date === dayYmd);
      const gross = daySessions.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0);
      const net = Math.round(gross * netMultiplier);
      days.push({
        label: d.getDate().toString(),
        earnings: gross,
        gross,
        net,
        value: viewMode === "gross" ? gross : net,
      });
    }
    return days;
  }, [sessions, viewMode, netMultiplier]);

  // 12-month bar chart data
  const monthlyChartData = useMemo(() => {
    const months: { label: string; earnings: number; net: number; gross: number; value: number }[] = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const ms = getMonthSessions(sessions, i);
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const gross = ms.reduce((sum, s) => sum + (s.revenue || 0), 0);
      const net = Math.round(gross * netMultiplier);
      months.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        earnings: gross,
        gross,
        net,
        value: viewMode === "gross" ? gross : net,
      });
    }
    return months;
  }, [sessions, viewMode, netMultiplier]);

  const chartData = chartRange === "daily" ? dailyChartData : monthlyChartData;

  const maxChartValue = Math.max(...chartData.map(d => d.value), 1);

  // Revenue by source
  const revenueBySource = useMemo(() => {
    const sources = { retainer: 0, hourly: 0, project: 0 };
    for (const s of thisMonthSessions) {
      const client = clients.find((c) => c.id === s.clientId);
      if (!client) continue;
      const model = (client.model || "").toLowerCase();
      if (model === "retainer") sources.retainer += s.revenue || 0;
      else if (model === "hourly") sources.hourly += s.revenue || 0;
      else sources.project += s.revenue || 0;
    }
    return sources;
  }, [thisMonthSessions, clients]);

  // Client revenue rankings
  const clientRevenue = useMemo(() => {
    const map: Record<string, { name: string; id: string; revenue: number; hours: number; model: string }> = {};
    for (const s of thisMonthSessions) {
      if (!s.clientId) continue;
      if (!map[s.clientId]) {
        const client = clients.find((c) => c.id === s.clientId);
        map[s.clientId] = { name: s.client, id: s.clientId, revenue: 0, hours: 0, model: client?.model || "" };
      }
      map[s.clientId].revenue += s.revenue || 0;
      map[s.clientId].hours += s.duration || 0;
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [thisMonthSessions, clients]);

  // Retainer health
  const retainerHealth = useMemo(() => {
    return clients
      .filter((c) => c.model === "Retainer" && c.status === "Active" && c.retainerTotal > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        used: c.retainerTotal - (c.retainerRemaining || 0),
        total: c.retainerTotal,
        remaining: c.retainerRemaining || 0,
        pct: Math.round(((c.retainerTotal - (c.retainerRemaining || 0)) / c.retainerTotal) * 100),
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [clients]);

  // Time allocation
  const timeAllocation = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of thisMonthSessions) {
      const tag = (s.workTags || s.tags || [])[0] || "Other";
      map[tag] = (map[tag] || 0) + (s.duration || 0);
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .map(([category, hours]) => ({
        category,
        hours: Math.round(hours * 10) / 10,
        pct: total > 0 ? Math.round((hours / total) * 100) : 0,
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [thisMonthSessions]);

  const categoryColors: Record<string, string> = {
    Design: BLUE,
    Branding: "#7bb3cc",
    Development: "#4a8ba8",
    "Strategy/Research": GOLD,
    Meetings: "#d4b85c",
    "Creative Direction": "#3d7a96",
    Prospecting: RED,
    Admin: "#a08080",
  };

  // Forward signals
  const forwardSignals = useMemo(() => {
    const signals: {
      id: number;
      type: string;
      signal: string;
      detail: string;
      impact: string;
      clientId: string | null;
      color: string;
      bgColor: string;
    }[] = [];
    let id = 1;

    if (grossEarnings > 0) {
      signals.push({
        id: id++,
        type: "projection",
        signal: `On pace for $${projectedEarnings.toLocaleString()} this month`,
        detail: `$${grossEarnings.toLocaleString()} earned through day ${dayOfMonth}`,
        impact: "High",
        clientId: null,
        color: BLUE,
        bgColor: BLUE_BG,
      });
    }

    for (const r of retainerHealth) {
      if (r.pct >= 70) {
        signals.push({
          id: id++,
          type: "retainer",
          signal: `${r.name} — ${r.pct}% of retainer used`,
          detail: `${r.remaining}h remaining of ${r.total}h`,
          impact: r.pct >= 90 ? "High" : "Medium",
          clientId: r.id,
          color: r.pct >= 90 ? RED : GOLD,
          bgColor: r.pct >= 90 ? RED_BG : GOLD_BG,
        });
      }
    }

    for (const p of clients.filter((c) => c.status === "Prospect")) {
      const prospectSessions = sessions.filter((s) => s.clientId === p.id);
      const lastSession = prospectSessions[0];
      const pNow = new Date();
      const hasRecent = prospectSessions.some(
        (s) => pNow.getTime() - new Date(s.date).getTime() < 7 * 24 * 60 * 60 * 1000,
      );
      if (!hasRecent) {
        signals.push({
          id: id++,
          type: "prospect",
          signal: `${p.name} — follow up recommended`,
          detail: lastSession ? `Last activity: ${lastSession.date}` : "No sessions logged yet",
          impact: "Low",
          clientId: p.id,
          color: GOLD,
          bgColor: GOLD_BG,
        });
      }
    }

    for (const proj of allProjects) {
      if (proj.status === "In Progress" && proj.estimatedHours > 0) {
        const completion = Math.round((proj.hours / proj.estimatedHours) * 100);
        if (completion >= 80) {
          const client = clients.find((c) => c.id === proj.clientId);
          signals.push({
            id: id++,
            type: "milestone",
            signal: `${client?.name || "Client"} — ${proj.name} at ${completion}%`,
            detail: `${proj.hours}h of ${proj.estimatedHours}h${proj.totalValue ? ` · $${proj.totalValue.toLocaleString()} value` : ""}`,
            impact: "Medium",
            clientId: proj.clientId,
            color: BLUE,
            bgColor: BLUE_BG,
          });
        }
      }
    }

    // Scope creep
    for (const proj of allProjects) {
      if (proj.status === "In Progress" && proj.totalValue > 0 && proj.hours > 0) {
        const client = clients.find((c) => c.id === proj.clientId);
        if (!client || !client.rate || client.rate <= 0) continue;
        const effRate = Math.round(proj.totalValue / proj.hours);
        if (effRate < client.rate) {
          const severity = effRate < client.rate * 0.5;
          signals.push({
            id: id++,
            type: "scope_creep",
            signal: `${client.name} — ${proj.name} effective rate $${effRate}/hr`,
            detail: `Below your $${client.rate}/hr standard rate${severity ? " by more than 50%" : ""} · ${proj.hours}h logged on $${proj.totalValue.toLocaleString()} project`,
            impact: severity ? "High" : "Medium",
            clientId: proj.clientId,
            color: severity ? RED : GOLD,
            bgColor: severity ? RED_BG : GOLD_BG,
          });
        }
      }
    }

    return signals.slice(0, 6);
  }, [grossEarnings, projectedEarnings, retainerHealth, clients, sessions, allProjects]);

  // Activity feed
  const activityFeed = useMemo(() => {
    const groups: { date: string; label: string; sessions: any[] }[] = [];
    const seen = new Set<string>();
    for (const s of sessions.slice(0, 30)) {
      if (!seen.has(s.date)) {
        seen.add(s.date);
        if (groups.length < 4) groups.push({ date: s.date, label: getDayLabel(s.date), sessions: [] });
      }
      const g = groups.find((g) => g.date === s.date);
      if (g) g.sessions.push(s);
    }
    return groups;
  }, [sessions]);

  // Active projects
  const activeProjects = useMemo(() => {
    return allProjects
      .filter((p) => p.status === "In Progress")
      .map((p) => ({
        ...p,
        clientName: clients.find((c) => c.id === p.clientId)?.name || "Unknown",
        completion: p.estimatedHours > 0 ? Math.round((p.hours / p.estimatedHours) * 100) : 0,
      }))
      .sort((a, b) => b.completion - a.completion)
      .slice(0, 6);
  }, [allProjects, clients]);

  // Week days
  const weekDays = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const wNow = new Date();
    const dow = wNow.getDay();
    const monday = new Date(wNow);
    monday.setDate(wNow.getDate() - (dow === 0 ? 6 : dow - 1));
    return days.map((label, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dayYmd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      const hours = sessions
        .filter((s: any) => s.rawDate === dayYmd)
        .reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
      return { label, hours, isFuture: day > wNow, isToday: day.toDateString() === wNow.toDateString() };
    });
  }, [sessions]);

  const hasData = clients.length > 0 || sessions.length > 0;

  // ── Signal icon helper ─────────────────────────────────────────────
  function SignalIcon({ type, color }: { type: string; color: string }) {
    const props = { className: "w-3.5 h-3.5", style: { color } };
    if (type === "projection") return <TrendingUp {...props} />;
    if (type === "retainer") return <Timer {...props} />;
    if (type === "prospect") return <Users {...props} />;
    if (type === "milestone") return <Target {...props} />;
    if (type === "scope_creep") return <TrendingUp {...props} />;
    return <TrendingUp {...props} />;
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════

  return (
    <motion.div className="w-full min-w-0 px-4 lg:px-8 py-6" variants={container} initial="hidden" animate="show">
      {/* ── Greeting ── */}
      <motion.div variants={item} className="mb-6">
        <h1 className="text-[26px] md:text-[30px] tracking-tight mb-1" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
          {getGreeting()}, {displayFirstName}
        </h1>
        <div className="flex items-center gap-2">
          {workspaceLogo && <img src={workspaceLogo} alt="" className="w-4 h-4 rounded object-contain flex-shrink-0" />}
          <p className="text-[13px] text-muted-foreground">{workspaceName} · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        </div>
      </motion.div>

      {/* ── Setup checklist ── */}
      <SetupChecklist />

      {/* ── Empty state ── */}
      {!dataLoading && !hasData && (
        <motion.div variants={item} className="bg-card border border-primary/15 rounded-lg p-5 mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <div>
              <div className="text-[14px] mb-0.5" style={{ fontWeight: 600 }}>Your workspace is empty</div>
              <div className="text-[13px] text-muted-foreground">Add your first client to get started — head to the Clients page to begin.</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Summary stat cards ── */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Clients", value: activeClientCount, onClick: () => navigate("/clients") },
          { label: "Projects", value: activeProjectCount, onClick: () => navigate("/projects") },
          { label: "Sessions", value: thisMonthSessions.length, sub: "this month" },
          { label: "Retainers", value: activeRetainerCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-card border border-border rounded-lg px-4 py-3 ${stat.onClick ? "cursor-pointer hover:bg-accent/30 transition-colors" : ""}`}
            onClick={stat.onClick}
          >
            <div className="text-[11px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>{stat.label}</div>
            <div className="text-[22px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 700 }}>
              <AnimatedNumber value={stat.value} />
            </div>
            {stat.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</div>}
          </div>
        ))}
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TWO-COLUMN LAYOUT                                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* ── LEFT COLUMN (3/5 = 60%) ── */}
        <div className="lg:col-span-3 space-y-5">
          {/* Hero panel — financial */}
          {canViewFinancials ? (
            <motion.div variants={item} className="bg-card border border-border rounded-lg p-5 md:p-6 relative overflow-hidden">
              {/* Headline */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5 relative">
                <div>
                  <div className="text-[12px] text-muted-foreground mb-2 flex items-center gap-2" style={{ fontWeight: 500 }}>
                    Earnings this month
                    {hasData && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded" style={{ fontWeight: 500, backgroundColor: isUp ? BLUE_BG : RED_BG, color: isUp ? BLUE : RED }}>
                        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {monthChange}%
                      </span>
                    )}
                  </div>
                  <div className="text-[36px] md:text-[44px] leading-none tracking-tighter text-foreground mb-1.5" style={{ fontWeight: 700 }}>
                    $<AnimatedNumber value={currentEarnings} />
                  </div>
                  <div className="text-[13px] text-muted-foreground">
                    {hasData ? (
                      <>
                        Projected <span className="text-foreground" style={{ fontWeight: 500 }}>${projectedDisplay.toLocaleString()}</span>
                        {lastMonthEarnings > 0 && (
                          <span className="ml-1.5" style={{ color: isUp ? BLUE : RED }}> · {paceDirection} last month</span>
                        )}
                      </>
                    ) : "Log sessions to see your pulse"}
                  </div>
                </div>
                <div className="inline-flex gap-0 bg-accent/60 rounded p-0.5 self-start w-fit">
                  {([{ key: "gross" as const, label: "Gross" }, { key: "net" as const, label: "Net" }]).map((m) => (
                    <button key={m.key} onClick={() => setViewMode(m.key)} className={`px-3 py-1 text-[12px] rounded transition-all duration-200 ${viewMode === m.key ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`} style={{ fontWeight: 500, boxShadow: viewMode === m.key ? "0 1px 3px rgba(0,0,0,0.04)" : "none" }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expandable breakdowns */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setFinancialOpen((o) => !o)} className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded border transition-all duration-200 ${financialOpen ? "bg-primary/8 border-primary/20 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/40"}`} style={{ fontWeight: 500 }}>
                  Financial breakdown <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${financialOpen ? "rotate-180" : ""}`} />
                </button>
                <button onClick={() => setSourceOpen((o) => !o)} className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded border transition-all duration-200 ${sourceOpen ? "bg-primary/8 border-primary/20 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/40"}`} style={{ fontWeight: 500 }}>
                  Source breakdown <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${sourceOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              <AnimatePresence>
                {financialOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="bg-accent/30 rounded p-3 mb-4 space-y-2">
                      <div className="text-[10px] text-muted-foreground mb-1.5">Based on your settings — <a href="/settings?tab=financial" className="text-primary hover:underline">adjust in Settings</a></div>
                      <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Gross earnings</span><span className="tabular-nums" style={{ fontWeight: 500 }}>${grossEarnings.toLocaleString()}</span></div>
                      <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Processing ({(financialDefaults.processingFeeRate * 100).toFixed(1)}%)</span><span className="tabular-nums text-muted-foreground">&minus;${Math.round(processingFee).toLocaleString()}</span></div>
                      <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">Tax ({financialDefaults.taxRate * 100}%)</span><span className="tabular-nums text-muted-foreground">&minus;${Math.round(taxEstimate).toLocaleString()}</span></div>
                      <div className="border-t border-border pt-2 flex justify-between text-[12px]"><span style={{ fontWeight: 500 }}>After fees &amp; taxes</span><span className="tabular-nums text-primary" style={{ fontWeight: 600 }}>${Math.round(netEarnings).toLocaleString()}</span></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {sourceOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="bg-accent/30 rounded p-3 mb-4 space-y-2.5">
                      {[{ label: "Retainer", value: revenueBySource.retainer }, { label: "Hourly", value: revenueBySource.hourly }, { label: "Project", value: revenueBySource.project }].filter((s) => s.value > 0).map((source) => {
                        const pct = grossEarnings > 0 ? Math.round((source.value / grossEarnings) * 100) : 0;
                        return (
                          <div key={source.label}>
                            <div className="flex justify-between text-[12px] mb-1">
                              <span className="text-muted-foreground">{source.label}</span>
                              <div className="flex items-center gap-2"><span className="text-[11px] text-muted-foreground tabular-nums">{pct}%</span><span className="tabular-nums" style={{ fontWeight: 500 }}>${source.value.toLocaleString()}</span></div>
                            </div>
                            <div className="h-1 bg-accent/60 rounded-full overflow-hidden"><div className="h-full rounded-full bg-primary/40" style={{ width: `${pct}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Metrics strip */}
              <div className="rounded-lg overflow-hidden border border-border/60 mb-5">
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/50">
                  <div className="px-4 py-3">
                    <div className="text-[11px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Time invested</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[24px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}><AnimatedNumber value={Math.round(totalHoursThisMonth * 10) / 10} /></span>
                      <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>hrs</span>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-[11px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Effective rate</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[24px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600, color: BLUE }}>$<AnimatedNumber value={Math.round(trueHourlyRate)} /></span>
                      <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>/hr</span>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-[11px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Billable</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[24px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}><AnimatedNumber value={billablePercentage} /></span>
                      <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar Chart — compact, like the reference */}
              <div>
                <div className="text-[12px] text-muted-foreground mb-3" style={{ fontWeight: 500 }}>6-month trend</div>
                <div className="w-full overflow-hidden" style={{ height: 80 }}>
                  <ResponsiveContainer width="100%" height={80}>
                    <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="20%">
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 500 }} dy={4} interval={0} />
                      <YAxis hide domain={[0, maxChartValue * 1.1]} />
                      <Tooltip
                        cursor={false}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          if (!d) return null;
                          return (
                            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 4, padding: "6px 10px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12, color: "var(--foreground)" }}>
                              <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
                              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Gross</span><span className="tabular-nums" style={{ fontWeight: 500 }}>${d.gross?.toLocaleString()}</span></div>
                              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Net</span><span className="tabular-nums" style={{ fontWeight: 500 }}>${d.net?.toLocaleString()}</span></div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={24}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={index === chartData.length - 1 ? "var(--primary)" : "var(--primary)"}
                            opacity={index === chartData.length - 1 ? 0.85 : 0.35}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Member view — no financials */
            <motion.div variants={item} className="bg-card border border-border rounded-lg p-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Hours this month</div>
                  <div className="text-[24px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}><AnimatedNumber value={Math.round(totalHoursThisMonth * 10) / 10} /></div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>This week</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[24px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}><AnimatedNumber value={Math.round(weekHours * 10) / 10} /></span>
                    <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>/ {weeklyTarget}h</span>
                  </div>
                  <div className="h-1.5 bg-accent/60 rounded-full overflow-hidden mt-2">
                    <div className="h-full rounded-full bg-primary/50 transition-all duration-500" style={{ width: `${Math.min((weekHours / weeklyTarget) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── RIGHT COLUMN (2/5 = 40%) ── */}
        <div className="lg:col-span-2 flex flex-col">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 border-b border-border mb-4">
            {([
              { id: "activity" as RightTab, label: "Activity" },
              ...(canViewFinancials ? [{ id: "clients" as RightTab, label: "Clients & Revenue" }] : []),
            ]).map((tab) => (
              <button key={tab.id} onClick={() => setRightTab(tab.id)} className={`px-3 py-2 text-[12px] transition-all duration-200 border-b-2 -mb-px whitespace-nowrap ${rightTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`} style={{ fontWeight: rightTab === tab.id ? 600 : 500 }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0">
            <AnimatePresence mode="wait">
              {/* ── ACTIVITY TAB ── */}
              {rightTab === "activity" && (
                <motion.div key="activity" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="space-y-5">
                  {/* Signals */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 600 }}>Heads up</span>
                      {!hasFullInsights && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary" style={{ fontWeight: 600 }}>PRO</span>}
                    </div>
                    {!hasFullInsights ? (
                      <div className="relative">
                        <div className="absolute inset-0 z-10 backdrop-blur-[4px] bg-background/50 rounded-lg flex items-center justify-center">
                          <button onClick={() => navigate("/settings?tab=billing")} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all" style={{ fontWeight: 500 }}><Sparkles className="w-3 h-3" />Upgrade for signals</button>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-5 text-center text-[12px] text-muted-foreground select-none pointer-events-none" style={{ minHeight: 80 }}>Predictive signals about your clients and revenue</div>
                      </div>
                    ) : forwardSignals.length > 0 ? (
                      <div className="space-y-1.5">
                        {forwardSignals.map((sig) => (
                          <div key={sig.id} className="flex items-start gap-2.5 bg-card border border-border rounded-lg px-3 py-2 transition-all duration-200 cursor-pointer hover:bg-accent/30 group" style={{ borderLeftWidth: "3px", borderLeftColor: sig.color }} onClick={() => sig.clientId && navigate(`/clients/${sig.clientId}`)}>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] leading-snug" style={{ fontWeight: 500 }}>{sig.signal}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{sig.detail}</div>
                            </div>
                            {sig.clientId && <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-card border border-border rounded-lg p-4 text-center text-[12px] text-muted-foreground">No signals — looking good.</div>
                    )}
                  </div>

                  {/* Recent work */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 600 }}>Recent work</span>
                      <button onClick={() => navigate("/time")} className="text-[11px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1" style={{ fontWeight: 500 }}>View all <ArrowRight className="w-3 h-3" /></button>
                    </div>
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      {activityFeed.length > 0 ? (
                        activityFeed.slice(0, 3).map((group) => (
                          <div key={group.date}>
                            <div className="px-3 py-1 bg-accent/30 border-b border-border"><span className="text-[10px] text-muted-foreground" style={{ fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{group.label}</span></div>
                            {group.sessions.slice(0, 3).map((s: any) => (
                              <div key={s.id} className="px-3 py-2 border-b border-border last:border-0 hover:bg-accent/20 transition-colors cursor-pointer flex items-center gap-2.5" onClick={() => navigate(`/clients/${s.clientId}`)}>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[12px] truncate" style={{ fontWeight: 500 }}>{s.task || "Untitled"}</div>
                                  <div className="text-[10px] text-muted-foreground">{s.client}</div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-[11px] tabular-nums" style={{ fontWeight: 500 }}>{s.duration}h</div>
                                  {canViewFinancials && (s.revenue ?? 0) > 0 && <div className="text-[10px] text-muted-foreground tabular-nums">${s.revenue}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">No sessions logged yet</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── CLIENTS & REVENUE TAB ── */}
              {rightTab === "clients" && (
                <motion.div key="clients" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="space-y-5">
                  {/* Revenue by client */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 600 }}>Revenue by client</span>
                      <button onClick={() => navigate("/clients")} className="text-[11px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1" style={{ fontWeight: 500 }}>All clients <ArrowRight className="w-3 h-3" /></button>
                    </div>
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      {clientRevenue.length > 0 ? (
                        clientRevenue.slice(0, 5).map((cr, i) => {
                          const maxRev = clientRevenue[0]?.revenue || 1;
                          const barW = Math.max((cr.revenue / maxRev) * 100, 4);
                          const share = grossEarnings > 0 ? Math.round((cr.revenue / grossEarnings) * 100) : 0;
                          return (
                            <div key={cr.id} className={`px-3 py-2.5 hover:bg-accent/20 transition-colors cursor-pointer ${i < Math.min(clientRevenue.length, 5) - 1 ? "border-b border-border" : ""}`} onClick={() => navigate(`/clients/${cr.id}`)}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="min-w-0">
                                  <div className="text-[12px] truncate" style={{ fontWeight: 500 }}>{cr.name}</div>
                                  <div className="text-[10px] text-muted-foreground">{cr.hours}h · {cr.model || "Project"}</div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                  <div className="text-[12px] tabular-nums" style={{ fontWeight: 600 }}>${cr.revenue.toLocaleString()}</div>
                                  <div className="text-[10px] text-muted-foreground tabular-nums">{share}%</div>
                                </div>
                              </div>
                              <div className="h-1 bg-accent/50 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${barW}%`, backgroundColor: BLUE, opacity: 0.4 }} /></div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">No revenue data yet</div>
                      )}
                    </div>
                  </div>

                  {/* Retainer health */}
                  <div>
                    <div className="mb-2.5"><span className="text-[12px] text-muted-foreground" style={{ fontWeight: 600 }}>Retainer health</span></div>
                    {retainerHealth.length > 0 ? (
                      <div className="bg-card border border-border rounded-lg divide-y divide-border">
                        {retainerHealth.map((r) => {
                          const ringColor = r.pct >= 90 ? RED : r.pct >= 70 ? GOLD : BLUE;
                          const radius = 16;
                          const circ = 2 * Math.PI * radius;
                          const offset = circ - (r.pct / 100) * circ;
                          return (
                            <div key={r.id} className="px-3 py-2.5 flex items-center gap-2.5 cursor-pointer hover:bg-accent/20 transition-colors" onClick={() => navigate(`/clients/${r.id}`)}>
                              <div className="relative flex-shrink-0" style={{ width: 38, height: 38 }}>
                                <svg width="38" height="38" className="-rotate-90"><circle cx="19" cy="19" r={radius} fill="none" stroke="var(--accent)" strokeWidth="3" /><circle cx="19" cy="19" r={radius} fill="none" stroke={ringColor} strokeWidth="3" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.7s ease", opacity: 0.75 }} /></svg>
                                <div className="absolute inset-0 flex items-center justify-center"><span className="text-[9px] tabular-nums" style={{ fontWeight: 700 }}>{r.pct}%</span></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px]" style={{ fontWeight: 500 }}>{r.name}</div>
                                <div className="text-[10px] text-muted-foreground"><span style={{ fontWeight: 500, color: ringColor }}>{r.remaining}h left</span> of {r.total}h</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-card border border-border rounded-lg p-4 text-center text-[12px] text-muted-foreground">No active retainers</div>
                    )}
                  </div>

                  {/* Active projects */}
                  {activeProjects.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 600 }}>Active projects</span>
                        <button onClick={() => navigate("/projects")} className="text-[11px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1" style={{ fontWeight: 500 }}>View all <ArrowRight className="w-3 h-3" /></button>
                      </div>
                      <div className="bg-card border border-border rounded-lg divide-y divide-border">
                        {activeProjects.slice(0, 4).map((proj) => (
                          <div key={`${proj.clientId}-${proj.id}`} className="px-3 py-2 hover:bg-accent/20 transition-colors cursor-pointer" onClick={() => navigate(`/clients/${proj.clientId}`)}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="min-w-0 flex-1"><div className="text-[12px] truncate" style={{ fontWeight: 500 }}>{proj.name}</div><div className="text-[10px] text-muted-foreground">{proj.clientName}</div></div>
                              <span className="text-[10px] tabular-nums text-muted-foreground ml-2" style={{ fontWeight: 500 }}>{proj.completion}%</span>
                            </div>
                            <div className="h-1 bg-accent/60 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(proj.completion, 100)}%`, backgroundColor: proj.completion >= 90 ? GOLD : BLUE, opacity: 0.5 }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Starter plan upgrade CTA */}
      <StarterUpgradeCTA />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TIME & PACE — static full width section                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>Time & Pace</span>
          {hasData && (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground"><span style={{ fontWeight: 600 }} className="text-foreground tabular-nums">{thisMonthSessions.length}</span> sessions this month</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Weekly pace */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-[11px] text-muted-foreground mb-3" style={{ fontWeight: 600 }}>This week's pace</div>
            <div className="flex items-end justify-between mb-1">
              <div className="flex items-baseline gap-1">
                <span className="text-[24px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 700 }}>{Math.round(weekHours * 10) / 10}h</span>
                <span className="text-[12px] text-muted-foreground">of {weeklyTarget}h</span>
              </div>
              <span className="text-[11px] tabular-nums" style={{ fontWeight: 500, color: weekHours >= weeklyTarget ? GOLD : BLUE }}>{weekHours >= weeklyTarget ? "Target reached" : `${Math.round((weeklyTarget - weekHours) * 10) / 10}h left`}</span>
            </div>
            <div className="h-1 bg-accent/60 rounded-full overflow-hidden mb-5"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min((weekHours / weeklyTarget) * 100, 100)}%`, backgroundColor: weekHours >= weeklyTarget ? GOLD : BLUE, opacity: 0.6 }} /></div>
            <div className="flex items-end gap-2">
              {weekDays.map((d) => {
                const maxH = Math.max(...weekDays.map((x) => x.hours), 1);
                const barH = d.hours > 0 ? Math.max((d.hours / maxH) * 40, 4) : 0;
                return (
                  <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className="relative w-full flex justify-center" style={{ height: 44 }}>
                      {d.hours > 0 && <span className="absolute -top-3.5 text-[9px] tabular-nums text-muted-foreground" style={{ fontWeight: 500 }}>{d.hours}h</span>}
                      <div className="absolute bottom-0 w-full transition-all duration-500" style={{ height: barH, maxWidth: 24, backgroundColor: d.isFuture ? "var(--accent)" : d.isToday ? BLUE : `${BLUE}55`, opacity: d.isFuture ? 0.25 : 1, borderRadius: "3px 3px 0 0" }} />
                    </div>
                    <span className={`text-[9px] ${d.isToday ? "text-primary" : "text-muted-foreground"}`} style={{ fontWeight: d.isToday ? 600 : 400 }}>{d.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Month totals */}
            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-[11px] text-muted-foreground mb-2" style={{ fontWeight: 500 }}>{new Date().toLocaleDateString("en-US", { month: "long" })} totals</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">Hours</span><span className="text-[11px] tabular-nums" style={{ fontWeight: 600 }}>{Math.round(totalHoursThisMonth * 10) / 10}h</span></div>
                <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">Billable</span><span className="text-[11px] tabular-nums" style={{ fontWeight: 600 }}>{Math.round(billableHoursThisMonth * 10) / 10}h</span></div>
                <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">Ratio</span><span className="text-[11px] tabular-nums" style={{ fontWeight: 600, color: billablePercentage >= 75 ? BLUE : GOLD }}>{billablePercentage}%</span></div>
                <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">Eff. rate</span><span className="text-[11px] tabular-nums" style={{ fontWeight: 600, color: BLUE }}>${Math.round(trueHourlyRate)}/h</span></div>
              </div>
            </div>
          </div>

          {/* Time allocation */}
          <div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-[11px] text-muted-foreground mb-3" style={{ fontWeight: 600 }}>Where your time goes</div>
              {timeAllocation.length > 0 ? (
                <>
                  <div className="h-2 rounded-full overflow-hidden flex mb-4">
                    {timeAllocation.map((cat) => (<div key={cat.category} className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500" style={{ width: `${cat.pct}%`, backgroundColor: categoryColors[cat.category] || "#999", opacity: 0.55 }} title={`${cat.category}: ${cat.hours}h`} />))}
                  </div>
                  <div className="space-y-1.5">
                    {timeAllocation.map((cat) => {
                      const color = categoryColors[cat.category] || "#999";
                      return (
                        <div key={cat.category} className="flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color, opacity: 0.6 }} /><span className="text-[12px]" style={{ fontWeight: 500 }}>{cat.category}</span></div>
                          <div className="flex items-center gap-2.5"><span className="text-[12px] tabular-nums" style={{ fontWeight: 600 }}>{cat.hours}h</span><span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{cat.pct}%</span></div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-[12px] text-muted-foreground">No time data yet</div>
              )}
            </div>

            {/* Insights callout */}
            <div className="mt-3 bg-card border border-border rounded-lg p-4 cursor-pointer hover:bg-accent/20 transition-colors group" onClick={() => (hasFullInsights ? navigate("/insights") : navigate("/settings?tab=billing"))}>
              <div className="flex items-center justify-between mb-1"><span className="text-[12px]" style={{ fontWeight: 600 }}>{hasFullInsights ? "Deeper insights" : "Unlock deeper insights"}</span><ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" /></div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{hasFullInsights ? "See full client rankings, utilization trends, and revenue projections." : "Upgrade to Pro for client rankings, dependency analysis, and historical trends."}</p>
              {!hasFullInsights && <span className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary" style={{ fontWeight: 600 }}><Sparkles className="w-2.5 h-2.5" />PRO</span>}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
