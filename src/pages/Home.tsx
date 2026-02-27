import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
  Clock,
  TrendingUp,
  Users,
  Zap,
  Target,
  ArrowRight,
  FolderKanban,
  Timer,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { workspace as defaultWorkspace } from "../data/mockData";
import { useData } from "../data/DataContext";
import { useAuth } from "../data/AuthContext";
import * as settingsApi from "../data/settingsApi";
import { toast } from "sonner";
import { usePlan } from "../data/PlanContext";
import { StarterUpgradeCTA } from "../components/TrialBanner";

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

const BLUE = "#5ea1bf";
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

type TabId = "activity" | "clients" | "time";
const tabs: { id: TabId; label: string; icon: typeof Clock }[] = [
  { id: "activity", label: "Activity", icon: Zap },
  { id: "clients", label: "Clients & Revenue", icon: Users },
  { id: "time", label: "Time & Pace", icon: Clock },
];

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
  const [viewMode, setViewMode] = useState<"gross" | "net">("gross");
  const [financialOpen, setFinancialOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(defaultWorkspace.name);
  const [workspaceLogo, setWorkspaceLogo] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("activity");

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

  const displayFirstName = (profileName || user?.name || defaultWorkspace.userName).split(" ")[0];

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

  // 6-month chart
  const chartData = useMemo(() => {
    const months: { month: string; earnings: number; net: number }[] = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const ms = getMonthSessions(sessions, i);
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const gross = ms.reduce((sum, s) => sum + (s.revenue || 0), 0);
      months.push({
        month: d.toLocaleDateString("en-US", { month: "short" }),
        earnings: gross,
        net: Math.round(gross * netMultiplier),
      });
    }
    return months.map((d) => ({ ...d, value: viewMode === "gross" ? d.earnings : d.net }));
  }, [sessions, viewMode, netMultiplier]);

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
      const dayStr = day.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const hours = sessions
        .filter((s) => s.date === dayStr)
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
    return <Zap {...props} />;
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════

  return (
    <motion.div className="max-w-7xl mx-auto px-6 lg:px-12 py-12" variants={container} initial="hidden" animate="show">
      {/* ── Greeting ── */}
      <motion.div variants={item} className="mb-8">
        <h1 className="text-[24px] tracking-tight mb-1" style={{ fontWeight: 600 }}>
          {getGreeting()}, {displayFirstName}
        </h1>
        <div className="flex items-center gap-2">
          {workspaceLogo && <img src={workspaceLogo} alt="" className="w-5 h-5 rounded object-contain flex-shrink-0" />}
          <p className="text-[14px] text-muted-foreground">{workspaceName}'s monthly pulse for {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        </div>
      </motion.div>

      {/* ── Empty state ── */}
      {!dataLoading && !hasData && (
        <motion.div
          variants={item}
          className="bg-card border border-[rgba(94,161,191,0.25)] rounded-xl p-6 mb-8"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] mb-1" style={{ fontWeight: 600 }}>
                Your workspace is empty
              </div>
              <div className="text-[13px] text-muted-foreground">
                Populate it with realistic demo data — 9 clients, 200+ sessions, 20+ projects, notes, and settings.
              </div>
            </div>
            <button
              onClick={async () => {
                setSeeding(true);
                try {
                  const result = await settingsApi.seedDemoData();
                  await refresh();
                  await loadAllProjects();
                  toast.success(
                    `Seeded ${result.summary?.clients || 0} clients, ${result.summary?.sessions || 0} sessions, ${result.summary?.projects || 0} projects`,
                  );
                } catch (err: any) {
                  console.error("Seed failed:", err);
                  toast.error(err.message || "Seed failed");
                } finally {
                  setSeeding(false);
                }
              }}
              disabled={seeding}
              className="flex items-center gap-2 px-5 py-2.5 text-[13px] rounded-lg bg-[#5ea1bf] text-white hover:bg-[#4a8ba8] transition-all disabled:opacity-60 flex-shrink-0"
              style={{ fontWeight: 500 }}
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {seeding ? "Seeding..." : "Seed demo data"}
            </button>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* HERO PANEL                                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <motion.div
        variants={item}
        className="bg-card border border-border rounded-xl p-8 mb-8 relative overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)" }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-primary/[0.03] to-transparent rounded-bl-full pointer-events-none" />

        {/* Headline */}
        <div className="flex items-start justify-between mb-8 relative">
          <div>
            <div
              className="text-[13px] text-muted-foreground mb-3 flex items-center gap-2"
              style={{ fontWeight: 500, letterSpacing: "0.02em" }}
            >
              Earnings this month
              {hasData && (
                <span
                  className="inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full"
                  style={{ fontWeight: 500, backgroundColor: isUp ? BLUE_BG : RED_BG, color: isUp ? BLUE : RED }}
                >
                  {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {monthChange}%
                </span>
              )}
            </div>
            <div className="text-[56px] leading-none tracking-tight text-foreground mb-2" style={{ fontWeight: 600 }}>
              $<AnimatedNumber value={currentEarnings} />
            </div>
            <div className="text-[14px] text-muted-foreground">
              {hasData ? (
                <>
                  On pace for{" "}
                  <span className="text-foreground" style={{ fontWeight: 500 }}>
                    ${projectedDisplay.toLocaleString()}
                  </span>
                  {lastMonthEarnings > 0 && (
                    <>
                      <span className="mx-1.5">&mdash;</span>
                      <span style={{ color: isUp ? BLUE : RED }}>
                        {paceDirection} last month by {monthChange}%
                      </span>
                    </>
                  )}
                </>
              ) : (
                "Log sessions or seed data to see your pulse"
              )}
            </div>
          </div>
          <div className="flex gap-0 bg-accent/60 rounded-lg p-0.5">
            {(["gross", "net"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-4 py-1.5 text-[13px] rounded-md transition-all duration-200 capitalize ${viewMode === m ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                style={{ fontWeight: 500, boxShadow: viewMode === m ? "0 1px 3px rgba(0,0,0,0.04)" : "none" }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Expandable breakdowns */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setFinancialOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg border transition-all duration-200 ${financialOpen ? "bg-primary/8 border-primary/20 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/40"}`}
            style={{ fontWeight: 500 }}
          >
            Financial breakdown{" "}
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${financialOpen ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={() => setSourceOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg border transition-all duration-200 ${sourceOpen ? "bg-primary/8 border-primary/20 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/40"}`}
            style={{ fontWeight: 500 }}
          >
            Source breakdown{" "}
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${sourceOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        <AnimatePresence>
          {financialOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-accent/30 rounded-lg p-4 mb-6 space-y-2.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Gross earnings</span>
                  <span className="tabular-nums" style={{ fontWeight: 500 }}>
                    ${grossEarnings.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">
                    Processing fee ({(financialDefaults.processingFeeRate * 100).toFixed(1)}%)
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    &minus;${Math.round(processingFee).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Tax estimate ({financialDefaults.taxRate * 100}%)</span>
                  <span className="tabular-nums text-muted-foreground">
                    &minus;${Math.round(taxEstimate).toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between text-[13px]">
                  <span style={{ fontWeight: 500 }}>Net amount</span>
                  <span className="tabular-nums text-primary" style={{ fontWeight: 600 }}>
                    ${Math.round(netEarnings).toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {sourceOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-accent/30 rounded-lg p-4 mb-6 space-y-3">
                {[
                  { label: "Retainer", value: revenueBySource.retainer },
                  { label: "Hourly", value: revenueBySource.hourly },
                  { label: "Project", value: revenueBySource.project },
                ]
                  .filter((s) => s.value > 0)
                  .map((source) => {
                    const pct = grossEarnings > 0 ? Math.round((source.value / grossEarnings) * 100) : 0;
                    return (
                      <div key={source.label}>
                        <div className="flex justify-between text-[13px] mb-1.5">
                          <span className="text-muted-foreground">{source.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-muted-foreground tabular-nums">{pct}%</span>
                            <span className="tabular-nums" style={{ fontWeight: 500 }}>
                              ${source.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-accent/60 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary/40" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metrics strip */}
        <div className="relative rounded-xl mb-8 overflow-hidden border border-border/60">
          <div className="grid grid-cols-3 divide-x divide-border/50">
            <div className="px-7 py-6">
              <div
                className="text-[11px] text-muted-foreground mb-4"
                style={{ fontWeight: 600, letterSpacing: "0.06em" }}
              >
                TIME INVESTED
              </div>
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-[36px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}>
                  <AnimatedNumber value={Math.round(totalHoursThisMonth * 10) / 10} />
                </span>
                <span className="text-[14px] text-muted-foreground" style={{ fontWeight: 500 }}>
                  hours
                </span>
              </div>
              <div className="text-[12px] text-muted-foreground">
                <span className="tabular-nums" style={{ fontWeight: 500 }}>
                  {Math.round(billableHoursThisMonth * 10) / 10}h
                </span>{" "}
                billable
                <span className="mx-1.5 opacity-30">/</span>
                <span className="tabular-nums" style={{ fontWeight: 500 }}>
                  {Math.round((totalHoursThisMonth - billableHoursThisMonth) * 10) / 10}h
                </span>{" "}
                non-billable
              </div>
            </div>
            <div className="px-7 py-6">
              <div
                className="text-[11px] text-muted-foreground mb-4"
                style={{ fontWeight: 600, letterSpacing: "0.06em" }}
              >
                TRUE HOURLY RATE
              </div>
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span
                  className="text-[36px] leading-none tracking-tight tabular-nums"
                  style={{ fontWeight: 600, color: BLUE }}
                >
                  $<AnimatedNumber value={Math.round(trueHourlyRate)} />
                </span>
                <span className="text-[14px] text-muted-foreground" style={{ fontWeight: 500 }}>
                  /hr
                </span>
              </div>
              <div className="text-[12px] text-muted-foreground">
                <span className="tabular-nums" style={{ fontWeight: 500 }}>
                  ${totalHoursThisMonth > 0 ? Math.round(grossEarnings / totalHoursThisMonth) : 0}
                </span>{" "}
                gross
                <span className="mx-1.5 opacity-30">/</span>
                <span className="tabular-nums" style={{ fontWeight: 500 }}>
                  ${totalHoursThisMonth > 0 ? Math.round(netEarnings / totalHoursThisMonth) : 0}
                </span>{" "}
                net
              </div>
            </div>
            <div className="px-7 py-6">
              <div
                className="text-[11px] text-muted-foreground mb-4"
                style={{ fontWeight: 600, letterSpacing: "0.06em" }}
              >
                BILLABLE RATIO
              </div>
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-[36px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}>
                  <AnimatedNumber value={billablePercentage} />
                </span>
                <span className="text-[14px] text-muted-foreground" style={{ fontWeight: 500 }}>
                  %
                </span>
              </div>
              <div className="text-[12px] text-muted-foreground">
                <span className="tabular-nums" style={{ fontWeight: 500 }}>
                  {Math.round(billableHoursThisMonth * 10) / 10}h
                </span>{" "}
                of
                <span className="tabular-nums mx-1" style={{ fontWeight: 500 }}>
                  {Math.round(totalHoursThisMonth * 10) / 10}h
                </span>{" "}
                total
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div data-tour="earnings-chart">
          <div className="text-[13px] text-muted-foreground mb-4" style={{ fontWeight: 500 }}>
            6-month trend
          </div>
          <div className="w-full" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 12, right: 16, bottom: 4, left: 16 }}>
                <defs>
                  {/* Fill gradient — richer fade */}
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.24} />
                    <stop offset="50%" stopColor="#38bdf8" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                  {/* Glow filter — tighter, downward-biased */}
                  <filter id="lineGlow" x="-10%" y="0%" width="120%" height="150%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="0 0 0 0 0.22  0 0 0 0 0.74  0 0 0 0 0.97  0 0 0 0.30 0"
                      result="colorBlur"
                    />
                    <feMerge>
                      <feMergeNode in="colorBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid vertical={true} horizontal={false} stroke="var(--border)" strokeOpacity={0.35} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9a9aac", fontSize: 11, fontWeight: 500 }}
                  dy={10}
                  interval={0}
                />
                <YAxis hide domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card, #fff)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    padding: "8px 14px",
                    color: "var(--foreground)",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, viewMode === "gross" ? "Gross" : "Net"]}
                  cursor={{ stroke: "#38bdf8", strokeWidth: 1, strokeOpacity: 0.3 }}
                />
                {/* Glow layer — thicker, filtered, no fill */}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#38bdf8"
                  strokeWidth={5}
                  strokeOpacity={0.12}
                  fill="none"
                  dot={false}
                  activeDot={false}
                  filter="url(#lineGlow)"
                  baseValue={0}
                  isAnimationActive={false}
                />
                {/* Main line + fill */}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeOpacity={0.85}
                  fill="url(#earningsGradient)"
                  dot={{ r: 2.5, fill: "#38bdf8", strokeWidth: 0 }}
                  activeDot={{ r: 4.5, fill: "#38bdf8", strokeWidth: 0 }}
                  baseValue={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Starter plan upgrade CTA */}
      <StarterUpgradeCTA />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TABBED SECTION                                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[13px] transition-all duration-200 border-b-2 -mb-px ${
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                style={{ fontWeight: isActive ? 600 : 500 }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}

          {/* Quick counts — right-aligned */}
          {hasData && (
            <div className="ml-auto flex items-center gap-4 pb-2">
              <span className="text-[12px] text-muted-foreground">
                <span style={{ fontWeight: 600 }} className="text-foreground">
                  {clients.filter((c) => c.status === "Active").length}
                </span>{" "}
                active clients
              </span>
              <span className="text-[12px] text-muted-foreground">
                <span style={{ fontWeight: 600 }} className="text-foreground">
                  {allProjects.filter((p) => p.status === "In Progress").length}
                </span>{" "}
                projects
              </span>
              <span className="text-[12px] text-muted-foreground">
                <span style={{ fontWeight: 600 }} className="text-foreground">
                  {thisMonthSessions.length}
                </span>{" "}
                sessions
              </span>
            </div>
          )}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {/* ── ACTIVITY TAB ── */}
          {activeTab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-5 gap-8"
            >
              {/* Signals */}
              <div className="col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                  <span
                    className="text-[13px] text-muted-foreground"
                    style={{ fontWeight: 600, letterSpacing: "0.02em" }}
                  >
                    Forward signals
                  </span>
                  {!hasFullInsights && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-[#5ea1bf]/10 text-[#5ea1bf]"
                      style={{ fontWeight: 600 }}
                    >
                      PRO
                    </span>
                  )}
                </div>
                {!hasFullInsights ? (
                  <div className="relative">
                    <div className="absolute inset-0 z-10 backdrop-blur-[4px] bg-background/50 rounded-xl flex items-center justify-center">
                      <button
                        onClick={() => navigate("/settings?tab=billing")}
                        className="flex items-center gap-1.5 px-3 py-2 text-[12px] rounded-lg bg-[#5ea1bf]/10 text-[#5ea1bf] hover:bg-[#5ea1bf]/20 transition-all"
                        style={{ fontWeight: 500 }}
                      >
                        <Sparkles className="w-3 h-3" />
                        Upgrade for signals
                      </button>
                    </div>
                    <div
                      className="bg-card border border-border rounded-xl p-6 text-center text-[13px] text-muted-foreground select-none pointer-events-none"
                      style={{ minHeight: 120 }}
                    >
                      Predictive signals about your clients and revenue
                    </div>
                  </div>
                ) : forwardSignals.length > 0 ? (
                  <div className="space-y-2">
                    {forwardSignals.map((sig) => (
                      <div
                        key={sig.id}
                        className="flex items-start gap-3 bg-card border border-border rounded-lg px-4 py-3 transition-all duration-200 cursor-pointer hover:bg-accent/30 group"
                        style={{
                          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                          borderLeftWidth: "3px",
                          borderLeftColor: sig.color,
                        }}
                        onClick={() => sig.clientId && navigate(`/clients/${sig.clientId}`)}
                      >
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: sig.bgColor }}
                        >
                          <SignalIcon type={sig.type} color={sig.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] leading-snug" style={{ fontWeight: 500 }}>
                            {sig.signal}
                          </div>
                          <div className="text-[12px] text-muted-foreground mt-0.5">{sig.detail}</div>
                        </div>
                        {sig.clientId && (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl p-6 text-center text-[13px] text-muted-foreground">
                    No signals to report — looking good.
                  </div>
                )}
              </div>

              {/* Recent activity */}
              <div className="col-span-3">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span
                      className="text-[13px] text-muted-foreground"
                      style={{ fontWeight: 600, letterSpacing: "0.02em" }}
                    >
                      Recent work
                    </span>
                  </div>
                  <button
                    onClick={() => navigate("/time")}
                    className="text-[12px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    style={{ fontWeight: 500 }}
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div
                  className="bg-card border border-border rounded-xl overflow-hidden"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  {activityFeed.length > 0 ? (
                    activityFeed.map((group) => (
                      <div key={group.date}>
                        <div className="px-4 py-2 bg-accent/30 border-b border-border">
                          <span
                            className="text-[11px] text-muted-foreground"
                            style={{ fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
                          >
                            {group.label}
                          </span>
                        </div>
                        {group.sessions.map((s: any) => (
                          <div
                            key={s.id}
                            className="px-4 py-3 border-b border-border last:border-0 hover:bg-accent/20 transition-colors cursor-pointer flex items-center gap-3"
                            onClick={() => navigate(`/clients/${s.clientId}`)}
                          >
                            <div
                              className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: BLUE_BG }}
                            >
                              <span className="text-[11px]" style={{ fontWeight: 600, color: BLUE }}>
                                {(s.client || "?")[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>
                                {s.task || "Untitled"}
                              </div>
                              <div className="text-[12px] text-muted-foreground">{s.client}</div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-[13px] tabular-nums" style={{ fontWeight: 500 }}>
                                {s.duration}h
                              </div>
                              {(s.revenue ?? 0) > 0 && (
                                <div className="text-[11px] text-muted-foreground tabular-nums">${s.revenue}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                      No sessions logged yet
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── CLIENTS & REVENUE TAB ── */}
          {activeTab === "clients" && (
            <motion.div
              key="clients"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-2 gap-8"
            >
              {/* Revenue leaderboard */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                    <span
                      className="text-[13px] text-muted-foreground"
                      style={{ fontWeight: 600, letterSpacing: "0.02em" }}
                    >
                      Revenue by client
                    </span>
                  </div>
                  <button
                    onClick={() => navigate("/clients")}
                    className="text-[12px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    style={{ fontWeight: 500 }}
                  >
                    All clients <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div
                  className="bg-card border border-border rounded-xl overflow-hidden"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  {clientRevenue.length > 0 ? (
                    clientRevenue.map((cr, i) => {
                      const maxRev = clientRevenue[0]?.revenue || 1;
                      const barW = Math.max((cr.revenue / maxRev) * 100, 4);
                      const share = grossEarnings > 0 ? Math.round((cr.revenue / grossEarnings) * 100) : 0;
                      return (
                        <div
                          key={cr.id}
                          className={`px-4 py-3.5 hover:bg-accent/20 transition-colors cursor-pointer ${i < clientRevenue.length - 1 ? "border-b border-border" : ""}`}
                          onClick={() => navigate(`/clients/${cr.id}`)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: BLUE_BG }}
                              >
                                <span className="text-[11px]" style={{ fontWeight: 600, color: BLUE }}>
                                  {cr.name[0]}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>
                                  {cr.name}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {cr.hours}h · {cr.model || "Project"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <div className="text-[13px] tabular-nums" style={{ fontWeight: 600 }}>
                                ${cr.revenue.toLocaleString()}
                              </div>
                              <div className="text-[11px] text-muted-foreground tabular-nums">{share}% of total</div>
                            </div>
                          </div>
                          <div className="h-1.5 bg-accent/50 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${barW}%`, backgroundColor: BLUE, opacity: 0.45 }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">No revenue data yet</div>
                  )}
                </div>
              </div>

              {/* Retainer health */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                  <span
                    className="text-[13px] text-muted-foreground"
                    style={{ fontWeight: 600, letterSpacing: "0.02em" }}
                  >
                    Retainer health
                  </span>
                </div>
                {retainerHealth.length > 0 ? (
                  <div
                    className="bg-card border border-border rounded-xl divide-y divide-border"
                    style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                  >
                    {retainerHealth.map((r) => {
                      const ringColor = r.pct >= 90 ? RED : r.pct >= 70 ? GOLD : BLUE;
                      const radius = 22;
                      const circ = 2 * Math.PI * radius;
                      const offset = circ - (r.pct / 100) * circ;
                      return (
                        <div
                          key={r.id}
                          className="px-4 py-4 flex items-center gap-4 cursor-pointer hover:bg-accent/20 transition-colors"
                          onClick={() => navigate(`/clients/${r.id}`)}
                        >
                          <div className="relative flex-shrink-0" style={{ width: 52, height: 52 }}>
                            <svg width="52" height="52" className="-rotate-90">
                              <circle cx="26" cy="26" r={radius} fill="none" stroke="var(--accent)" strokeWidth="4" />
                              <circle
                                cx="26"
                                cy="26"
                                r={radius}
                                fill="none"
                                stroke={ringColor}
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={circ}
                                strokeDashoffset={offset}
                                style={{ transition: "stroke-dashoffset 0.7s ease", opacity: 0.75 }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[11px] tabular-nums" style={{ fontWeight: 700 }}>
                                {r.pct}%
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px]" style={{ fontWeight: 500 }}>
                              {r.name}
                            </div>
                            <div className="text-[12px] text-muted-foreground mt-0.5">
                              <span style={{ fontWeight: 500, color: ringColor }}>{r.remaining}h remaining</span> of{" "}
                              {r.total}h
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl p-6">
                    <div className="text-[13px] text-muted-foreground text-center">No active retainers</div>
                    {/* Show prospect pipeline instead */}
                    {clients.filter((c) => c.status === "Prospect").length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div
                          className="text-[12px] text-muted-foreground mb-3"
                          style={{ fontWeight: 600, letterSpacing: "0.02em" }}
                        >
                          PROSPECT PIPELINE
                        </div>
                        {clients
                          .filter((c) => c.status === "Prospect")
                          .map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center gap-2 py-2 cursor-pointer hover:opacity-70 transition-opacity"
                              onClick={() => navigate(`/clients/${p.id}`)}
                            >
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center"
                                style={{ backgroundColor: GOLD_BG }}
                              >
                                <span className="text-[10px]" style={{ fontWeight: 600, color: GOLD }}>
                                  {p.name[0]}
                                </span>
                              </div>
                              <span className="text-[13px]" style={{ fontWeight: 500 }}>
                                {p.name}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Active projects compact list */}
                {activeProjects.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-3.5 h-3.5 text-muted-foreground" />
                        <span
                          className="text-[13px] text-muted-foreground"
                          style={{ fontWeight: 600, letterSpacing: "0.02em" }}
                        >
                          Active projects
                        </span>
                      </div>
                      <button
                        onClick={() => navigate("/projects")}
                        className="text-[12px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                        style={{ fontWeight: 500 }}
                      >
                        View all <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div
                      className="bg-card border border-border rounded-xl divide-y divide-border"
                      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                    >
                      {activeProjects.map((proj) => (
                        <div
                          key={`${proj.clientId}-${proj.id}`}
                          className="px-4 py-3 hover:bg-accent/20 transition-colors cursor-pointer"
                          onClick={() => navigate(`/clients/${proj.clientId}`)}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>
                                {proj.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground">{proj.clientName}</div>
                            </div>
                            <span
                              className="text-[12px] tabular-nums text-muted-foreground ml-3"
                              style={{ fontWeight: 500 }}
                            >
                              {proj.completion}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-accent/60 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(proj.completion, 100)}%`,
                                backgroundColor: proj.completion >= 90 ? GOLD : BLUE,
                                opacity: 0.55,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── TIME & PACE TAB ── */}
          {activeTab === "time" && (
            <motion.div
              key="time"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-2 gap-8"
            >
              {/* Weekly pace */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span
                    className="text-[13px] text-muted-foreground"
                    style={{ fontWeight: 600, letterSpacing: "0.02em" }}
                  >
                    This week's pace
                  </span>
                </div>
                <div
                  className="bg-card border border-border rounded-xl p-5"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  {/* Header: big number + status */}
                  <div className="flex items-end justify-between mb-1.5">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="text-[28px] leading-none tracking-tight tabular-nums"
                        style={{ fontWeight: 700 }}
                      >
                        {Math.round(weekHours * 10) / 10}h
                      </span>
                      <span className="text-[13px] text-muted-foreground">of {weeklyTarget}h</span>
                    </div>
                    <span
                      className="text-[12px] tabular-nums"
                      style={{ fontWeight: 500, color: weekHours >= weeklyTarget ? GOLD : BLUE }}
                    >
                      {weekHours >= weeklyTarget
                        ? "Target reached"
                        : `${Math.round((weeklyTarget - weekHours) * 10) / 10}h left`}
                    </span>
                  </div>

                  {/* Thin progress bar */}
                  <div className="h-1.5 bg-accent/60 rounded-full overflow-hidden mb-6">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min((weekHours / weeklyTarget) * 100, 100)}%`,
                        backgroundColor: weekHours >= weeklyTarget ? GOLD : BLUE,
                        opacity: 0.6,
                      }}
                    />
                  </div>

                  {/* Day bars — compact */}
                  <div className="flex items-end gap-2">
                    {weekDays.map((d) => {
                      const maxH = Math.max(...weekDays.map((x) => x.hours), 1);
                      const barH = d.hours > 0 ? Math.max((d.hours / maxH) * 48, 4) : 0;
                      return (
                        <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
                          <div className="relative w-full flex justify-center" style={{ height: 52 }}>
                            {d.hours > 0 && (
                              <span
                                className="absolute -top-4 text-[10px] tabular-nums text-muted-foreground"
                                style={{ fontWeight: 500 }}
                              >
                                {d.hours}h
                              </span>
                            )}
                            <div
                              className="absolute bottom-0 w-full transition-all duration-500"
                              style={{
                                height: barH,
                                maxWidth: 28,
                                backgroundColor: d.isFuture ? "var(--accent)" : d.isToday ? BLUE : `${BLUE}55`,
                                opacity: d.isFuture ? 0.25 : 1,
                                borderRadius: "4px 4px 0 0",
                              }}
                            />
                          </div>
                          <span
                            className={`text-[10px] ${d.isToday ? "text-primary" : "text-muted-foreground"}`}
                            style={{ fontWeight: d.isToday ? 600 : 400 }}
                          >
                            {d.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Month totals — compact 2×2 grid */}
                <div
                  className="mt-4 bg-card border border-border rounded-xl p-4"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  <div
                    className="text-[11px] text-muted-foreground mb-3"
                    style={{ fontWeight: 600, letterSpacing: "0.04em" }}
                  >
                    {new Date().toLocaleDateString("en-US", { month: "long" }).toUpperCase()} TOTALS
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground">Hours</span>
                      <span className="text-[12px] tabular-nums" style={{ fontWeight: 600 }}>
                        {Math.round(totalHoursThisMonth * 10) / 10}h
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground">Billable</span>
                      <span className="text-[12px] tabular-nums" style={{ fontWeight: 600 }}>
                        {Math.round(billableHoursThisMonth * 10) / 10}h
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground">Ratio</span>
                      <span
                        className="text-[12px] tabular-nums"
                        style={{ fontWeight: 600, color: billablePercentage >= 75 ? BLUE : GOLD }}
                      >
                        {billablePercentage}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground">Eff. rate</span>
                      <span className="text-[12px] tabular-nums" style={{ fontWeight: 600, color: BLUE }}>
                        ${Math.round(trueHourlyRate)}/h
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time allocation */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                  <span
                    className="text-[13px] text-muted-foreground"
                    style={{ fontWeight: 600, letterSpacing: "0.02em" }}
                  >
                    Where your time goes
                  </span>
                </div>
                {timeAllocation.length > 0 ? (
                  <div
                    className="bg-card border border-border rounded-xl p-5"
                    style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                  >
                    {/* Stacked bar */}
                    <div className="h-3 rounded-full overflow-hidden flex mb-5">
                      {timeAllocation.map((cat) => (
                        <div
                          key={cat.category}
                          className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
                          style={{
                            width: `${cat.pct}%`,
                            backgroundColor: categoryColors[cat.category] || "#999",
                            opacity: 0.55,
                          }}
                          title={`${cat.category}: ${cat.hours}h`}
                        />
                      ))}
                    </div>
                    {/* Clean breakdown rows — no individual bars */}
                    <div className="space-y-2">
                      {timeAllocation.map((cat) => {
                        const color = categoryColors[cat.category] || "#999";
                        return (
                          <div key={cat.category} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-2.5 h-2.5 rounded-sm"
                                style={{ backgroundColor: color, opacity: 0.6 }}
                              />
                              <span className="text-[13px]" style={{ fontWeight: 500 }}>
                                {cat.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[13px] tabular-nums" style={{ fontWeight: 600 }}>
                                {cat.hours}h
                              </span>
                              <span className="text-[11px] text-muted-foreground tabular-nums w-9 text-right">
                                {cat.pct}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl p-6 text-center text-[13px] text-muted-foreground">
                    No time data yet
                  </div>
                )}

                {/* Insights callout */}
                <div
                  className="mt-6 bg-card border border-border rounded-xl p-5 cursor-pointer hover:bg-accent/20 transition-colors group"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                  onClick={() => (hasFullInsights ? navigate("/insights") : navigate("/settings?tab=billing"))}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px]" style={{ fontWeight: 600 }}>
                      {hasFullInsights ? "Deeper insights" : "Unlock deeper insights"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    {hasFullInsights
                      ? "See full client rankings, utilization trends, revenue projections, and time analysis on the Insights page."
                      : "Upgrade to Pro to access client rankings, concentration analysis, forward signals, and historical trends."}
                  </p>
                  {!hasFullInsights && (
                    <span
                      className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-[10px] rounded-full bg-[#5ea1bf]/10 text-[#5ea1bf]"
                      style={{ fontWeight: 600 }}
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      PRO
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
