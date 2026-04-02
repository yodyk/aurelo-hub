import { useState, useEffect, useMemo } from "react";
import { useNavigate, Navigate } from "react-router";
import { useRoleAccess } from "../data/useRoleAccess";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Shield,
  PieChart,
  Target,
  Minus,
  UserX,
  Lock,
  Sparkles,
  ArrowRight,
  Clock,
  DollarSign,
  BarChart3,
  CalendarClock,
} from "lucide-react";
import { motion } from "motion/react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { useData } from "../data/DataContext";
import { usePlan } from "../data/PlanContext";
import { PLANS } from "../data/plans";
import { computeInsightsMetrics, type InsightsMetrics } from "../data/insightsMetrics";
import * as invoiceApi from "../data/invoiceApi";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const perfIconMap: Record<string, any> = {
  concentration: PieChart,
  utilization: Target,
  retainer: Shield,
  margin: Zap,
};

const impactColors: Record<string, { bg: string; text: string; dot: string }> = {
  High: { bg: "bg-primary/8", text: "text-primary", dot: "bg-primary" },
  Medium: { bg: "bg-primary/5", text: "text-primary/70", dot: "bg-primary/50" },
  Low: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground/50" },
};

const signalIcons: Record<string, any> = {
  projection: TrendingUp,
  milestone: Zap,
  overage: Shield,
  expansion: ArrowUpRight,
  inactive: UserX,
};

type SortKey = "revenue" | "trueHourlyRate" | "utilization";

const CHART_BLUE = "#38bdf8";
const BLUE = "hsl(var(--primary))";
const BLUE_LIGHT = "hsl(var(--primary) / 0.15)";

// ── Custom tooltip ────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-[12px]">
      <div className="text-muted-foreground mb-1" style={{ fontWeight: 500 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.dataKey}:</span>
          <span className="text-foreground tabular-nums" style={{ fontWeight: 600 }}>
            {p.dataKey.includes('hours') || p.dataKey === 'hours'
              ? `${p.value}h`
              : `$${Number(p.value).toLocaleString()}`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Pro-gated upgrade overlay ──────────────────────────────────────

function ProUpgradeOverlay() {
  const navigate = useNavigate();
  const proPlan = PLANS.pro;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-[6px] bg-background/60 rounded-xl" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative bg-card border border-border rounded-2xl p-8 max-w-sm text-center"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)" }}
      >
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-[16px] text-foreground mb-1.5" style={{ fontWeight: 600 }}>Unlock full insights</h3>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
          Client rankings, collection metrics, profitability heatmaps, and forecasting are available on the Pro plan.
        </p>
        <button
          onClick={() => navigate("/settings?tab=billing")}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-[14px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all"
          style={{ fontWeight: 500 }}
        >
          <Sparkles className="w-4 h-4" />
          Upgrade to Pro — ${proPlan.price}/mo
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <p className="text-[11px] text-muted-foreground mt-2">Includes unlimited clients, PDF exports, invoicing & more</p>
      </motion.div>
    </div>
  );
}

function ProBadge() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary" style={{ fontWeight: 600 }}>
      <Lock className="w-2.5 h-2.5" /> PRO
    </span>
  );
}

// ── Section header ────────────────────────────────────────────────

function SectionLabel({ children, pro, count }: { children: React.ReactNode; pro?: boolean; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500, letterSpacing: "0.02em" }}>
        {children}
        {pro && <ProBadge />}
      </div>
      {count !== undefined && (
        <div className="text-[12px] text-muted-foreground">{count} item{count !== 1 ? "s" : ""}</div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────

export default function Insights() {
  const navigate = useNavigate();
  const { canViewInsights } = useRoleAccess();
  const { sessions, clients, netMultiplier, insightsMetrics: baseMetrics } = useData();
  const { can } = usePlan();


  const [viewMode, setViewMode] = useState<"gross" | "net">("gross");
  const [sortBy, setSortBy] = useState<SortKey>("revenue");
  const [invoices, setInvoices] = useState<any[]>([]);

  const hasFullInsights = can("fullInsights");
  const hasInvoicing = can("clientInvoicing");

  // Load invoices for collection metrics
  useEffect(() => {
    if (hasInvoicing) {
      invoiceApi.loadInvoices().then(setInvoices).catch(() => {});
    }
  }, [hasInvoicing]);

  // Recompute metrics with invoices included
  const metrics = useMemo(
    () => computeInsightsMetrics(sessions, clients, netMultiplier, invoices),
    [sessions, clients, netMultiplier, invoices],
  );

  const sortedRankings = useMemo(
    () =>
      [...metrics.clientRankings]
        .sort((a, b) => {
          if (sortBy === "revenue") return b.revenue - a.revenue;
          if (sortBy === "trueHourlyRate") return b.trueHourlyRate - a.trueHourlyRate;
          return b.utilization - a.utilization;
        })
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [metrics.clientRankings, sortBy],
  );

  const trendIcon = (trend: string) => {
    if (trend === "up") return <ArrowUpRight className="w-3.5 h-3.5 text-primary" />;
    if (trend === "down") return <ArrowDownRight className="w-3.5 h-3.5 text-muted-foreground" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const applyViewMode = (value: number) => (viewMode === "gross" ? value : Math.round(value * netMultiplier));

  const agingColors = ["hsl(var(--primary))", "hsl(var(--primary) / 0.7)", "hsl(var(--primary) / 0.45)", "hsl(var(--destructive))"];

  // Heatmap: get unique month keys
  const heatmapMonths = useMemo(() => {
    const all = new Set<string>();
    metrics.profitability.forEach(p => Object.keys(p.months).forEach(m => all.add(m)));
    return [...all].sort().slice(-6);
  }, [metrics.profitability]);

  if (!canViewInsights) return <Navigate to="/" replace />;

  return (
    <motion.div
      data-tour="insights-view"
      className="w-full min-w-0 max-w-7xl mx-auto px-6 lg:px-12 py-6 md:py-12"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[24px] md:text-[28px] tracking-tight mb-1" style={{ fontWeight: 700, letterSpacing: "-0.03em" }}>Insights</h1>
          <p className="text-[14px] text-muted-foreground">
            {hasFullInsights ? "Strategic layer" : "Basic insights"} &middot; {metrics.periodLabel}
          </p>
        </div>
        <div className="flex gap-0 bg-accent/60 rounded-lg p-0.5 self-start md:self-auto">
          {([{ key: "gross" as const, label: "Gross" }, { key: "net" as const, label: "Net" }]).map((m) => (
            <button
              key={m.key}
              onClick={() => setViewMode(m.key)}
              className={`px-4 py-1.5 text-[13px] rounded-md transition-all duration-200 ${
                viewMode === m.key ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontWeight: 500, boxShadow: viewMode === m.key ? "0 1px 3px rgba(0,0,0,0.04)" : "none" }}
              title={m.key === "gross" ? "Gross: total billed" : "Net: minus payment fees and estimated taxes"}
            >
              {m.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Performance Panel */}
      <motion.div variants={item} className="mb-8">
        <SectionLabel>Performance snapshot</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.performance.map((card, index) => {
            const CardIcon = perfIconMap[card.key] || PieChart;
            return (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                className="bg-card border border-border rounded-xl p-6 hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/8 opacity-40 rounded-bl-[40px] pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                      <CardIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>{card.label}</div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <div className="text-[32px] leading-none tracking-tight text-foreground tabular-nums" style={{ fontWeight: 600 }}>{card.value}</div>
                    <div className="text-[14px] text-muted-foreground">{card.sub}</div>
                  </div>
                  <div className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                    {card.warn && <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />}
                    {card.detail}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Revenue Trend Chart ─────────────────────────────────── */}
      <motion.div variants={item} className="mb-8">
        <SectionLabel>Revenue trends</SectionLabel>
        {metrics.monthlyRevenue.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <div className="text-[14px] text-muted-foreground" style={{ fontWeight: 500 }}>No monthly data yet</div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={metrics.monthlyRevenue.map(d => ({ ...d, net: Math.round(d.revenue * netMultiplier) }))} margin={{ top: 12, right: 16, bottom: 4, left: 16 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_BLUE} stopOpacity={0.24} />
                    <stop offset="50%" stopColor={CHART_BLUE} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={CHART_BLUE} stopOpacity={0.02} />
                  </linearGradient>
                  <filter id="insightsLineGlow" x="-10%" y="0%" width="120%" height="150%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                    <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.22  0 0 0 0 0.74  0 0 0 0 0.97  0 0 0 0.30 0" result="colorBlur" />
                    <feMerge>
                      <feMergeNode in="colorBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid vertical horizontal={false} stroke="var(--border)" strokeOpacity={0.35} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9a9aac", fontSize: 11, fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9a9aac", fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${v}`} width={52} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    if (!d) return null;
                    return (
                      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-[12px]">
                        <div className="text-muted-foreground mb-1" style={{ fontWeight: 500 }}>{label}</div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: "#38bdf8" }} />
                          <span className="text-muted-foreground">Gross:</span>
                          <span className="text-foreground tabular-nums" style={{ fontWeight: 600 }}>${d.revenue?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: "#0ea5e9" }} />
                          <span className="text-muted-foreground">Net:</span>
                          <span className="text-foreground tabular-nums" style={{ fontWeight: 600 }}>${d.net?.toLocaleString()}</span>
                        </div>
                        {d.collected > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--primary) / 0.5)" }} />
                            <span className="text-muted-foreground">Collected:</span>
                            <span className="text-foreground tabular-nums" style={{ fontWeight: 600 }}>${d.collected?.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                {/* Glow layer */}
                <Area type="monotone" dataKey="revenue" stroke={CHART_BLUE} strokeWidth={5} strokeOpacity={0.12} fill="none" dot={false} activeDot={false} filter="url(#insightsLineGlow)" isAnimationActive={false} />
                {/* Main line + fill */}
                <Area type="monotone" dataKey="revenue" stroke={CHART_BLUE} strokeWidth={2} strokeOpacity={0.85} fill="url(#revGrad)" dot={{ r: 2.5, fill: CHART_BLUE, strokeWidth: 0 }} activeDot={{ r: 4.5, fill: CHART_BLUE, strokeWidth: 0 }} />
                {hasInvoicing && (
                  <Area type="monotone" dataKey="collected" stroke="hsl(var(--primary) / 0.5)" strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: CHART_BLUE }} /> Session revenue</span>
              {hasInvoicing && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary/50 rounded border-dashed" style={{ borderTop: "1.5px dashed" }} /> Collected</span>}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Collection Speed (invoicing-gated) ──────────────────── */}
      {hasInvoicing && (
        <motion.div variants={item} className="mb-8 relative">
          {!hasFullInsights && <ProUpgradeOverlay />}
          <div className={!hasFullInsights ? "select-none pointer-events-none" : ""}>
            <SectionLabel pro={!hasFullInsights}>Collection speed</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {[
                { label: "Avg days to pay", value: `${metrics.collectionMetrics.avgDaysToPay}`, sub: "days", icon: Clock },
                { label: "Median days to pay", value: `${metrics.collectionMetrics.medianDaysToPay}`, sub: "days", icon: CalendarClock },
                { label: "Collection rate", value: `${metrics.collectionMetrics.collectionRate}%`, sub: "invoiced → paid", icon: DollarSign },
              ].map((card) => (
                <div key={card.label} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center">
                      <card.icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>{card.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[26px] leading-none text-foreground tabular-nums" style={{ fontWeight: 600 }}>{card.value}</span>
                    <span className="text-[12px] text-muted-foreground">{card.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Aging buckets bar chart */}
            {metrics.collectionMetrics.agingBuckets.some(b => b.count > 0) && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="text-[12px] text-muted-foreground mb-4" style={{ fontWeight: 500 }}>Outstanding aging</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={metrics.collectionMetrics.agingBuckets} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} width={60} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {metrics.collectionMetrics.agingBuckets.map((_, i) => (
                        <Cell key={i} fill={agingColors[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Forecasting ────────────────────────────────────────── */}
      <motion.div variants={item} className="mb-8 relative">
        {!hasFullInsights && <ProUpgradeOverlay />}
        <div className={!hasFullInsights ? "select-none pointer-events-none" : ""}>
          <SectionLabel pro={!hasFullInsights}>Forecasting & projections</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Projected monthly", value: `$${applyViewMode(metrics.forecast.projectedMonthly).toLocaleString()}`, sub: "next month est.", icon: TrendingUp },
              { label: "Projected annual", value: `$${applyViewMode(metrics.forecast.projectedAnnual).toLocaleString()}`, sub: "annualized run rate", icon: BarChart3 },
              {
                label: "Growth rate",
                value: `${metrics.forecast.growthRate >= 0 ? "+" : ""}${Math.round(metrics.forecast.growthRate * 100)}%`,
                sub: "trailing 3-mo avg",
                icon: metrics.forecast.growthRate >= 0 ? ArrowUpRight : ArrowDownRight,
              },
              {
                label: "Confidence",
                value: metrics.forecast.confidence.charAt(0).toUpperCase() + metrics.forecast.confidence.slice(1),
                sub: metrics.forecast.confidence === "high" ? "Stable trend" : metrics.forecast.confidence === "medium" ? "Some variability" : "Insufficient data",
                icon: Target,
              },
            ].map((card) => (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4 md:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center">
                    <card.icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>{card.label}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[20px] md:text-[22px] leading-none text-foreground tabular-nums" style={{ fontWeight: 600 }}>{card.value}</span>
                  <span className="text-[11px] text-muted-foreground">{card.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Profitability Heatmap ──────────────────────────────── */}
      <motion.div variants={item} className="mb-8 relative">
        {!hasFullInsights && <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-background/60 rounded-xl" />}
        <div className={!hasFullInsights ? "select-none pointer-events-none" : ""}>
          <SectionLabel pro={!hasFullInsights}>Profitability heatmap</SectionLabel>
          {metrics.profitability.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <div className="text-[14px] text-muted-foreground" style={{ fontWeight: 500 }}>No profitability data yet</div>
              <div className="text-[12px] text-muted-foreground mt-1">Log sessions across clients and months to see the heatmap</div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-accent/30">
                      <th className="text-left px-5 py-3 text-[12px] text-muted-foreground sticky left-0 bg-accent/30 z-10" style={{ fontWeight: 500, minWidth: 140 }}>Client</th>
                      {heatmapMonths.map(mk => {
                        const [y, m] = mk.split('-');
                        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                        return (
                          <th key={mk} className="text-right px-4 py-3 text-[11px] text-muted-foreground" style={{ fontWeight: 500, minWidth: 80 }}>
                            {months[parseInt(m) - 1]}<br /><span className="text-[10px] opacity-60">{y}</span>
                          </th>
                        );
                      })}
                      <th className="text-right px-5 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500, minWidth: 90 }}>Total</th>
                      <th className="text-right px-5 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500, minWidth: 70 }}>$/hr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.profitability.map((row) => {
                      const maxRev = Math.max(...Object.values(row.months).map(m => m.revenue), 1);
                      return (
                        <tr
                          key={row.clientId}
                          className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors cursor-pointer"
                          onClick={() => hasFullInsights && navigate(`/clients/${row.clientId}`)}
                        >
                          <td className="px-5 py-3 text-[13px] text-foreground sticky left-0 bg-card z-10" style={{ fontWeight: 500 }}>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
                                <span className="text-[9px] text-primary" style={{ fontWeight: 600 }}>{row.clientName.charAt(0)}</span>
                              </div>
                              <span className="truncate max-w-[120px]">{row.clientName}</span>
                            </div>
                          </td>
                          {heatmapMonths.map(mk => {
                            const cell = row.months[mk];
                            const rev = cell?.revenue || 0;
                            const intensity = maxRev > 0 ? Math.max(0.05, rev / maxRev) : 0;
                            return (
                              <td key={mk} className="px-4 py-3 text-right">
                                {rev > 0 ? (
                                  <div className="inline-flex items-center justify-end">
                                    <span
                                      className="text-[12px] tabular-nums px-2 py-0.5 rounded"
                                      style={{
                                        fontWeight: 500,
                                        background: `hsl(var(--primary) / ${intensity * 0.15})`,
                                        color: intensity > 0.5 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                                      }}
                                    >
                                      ${rev.toLocaleString()}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[12px] text-muted-foreground/30">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-5 py-3 text-right text-[13px] text-foreground tabular-nums" style={{ fontWeight: 600 }}>
                            ${row.totalRevenue.toLocaleString()}
                          </td>
                          <td className="px-5 py-3 text-right text-[13px] text-muted-foreground tabular-nums">
                            ${row.effectiveRate}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Client Rankings ─────────────────────────────────────── */}
      <motion.div variants={item} className="mb-8 relative">
        {!hasFullInsights && <ProUpgradeOverlay />}
        <div className={!hasFullInsights ? "select-none pointer-events-none" : ""}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <SectionLabel pro={!hasFullInsights}>Client rankings</SectionLabel>
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              {([
                { key: "revenue" as SortKey, label: "Earnings" },
                { key: "trueHourlyRate" as SortKey, label: "Eff. rate" },
                { key: "utilization" as SortKey, label: "Billable time" },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-2.5 py-1 text-[12px] rounded-md transition-all whitespace-nowrap ${
                    sortBy === opt.key ? "bg-primary/8 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {sortedRankings.length === 0 && hasFullInsights ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <div className="text-[14px] text-muted-foreground" style={{ fontWeight: 500 }}>No client revenue data this period</div>
              <div className="text-[12px] text-muted-foreground mt-1">Log billable sessions to see rankings</div>
            </div>
          ) : (
             <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-accent/30">
                    <th className="text-left px-6 py-3 text-[12px] text-muted-foreground w-12" style={{ fontWeight: 500 }}>#</th>
                    <th className="text-left px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Client</th>
                    <th className="text-right px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Earnings</th>
                    <th className="text-right px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Eff. rate</th>
                    <th className="text-right px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Billable time</th>
                    <th className="text-left px-6 py-3 text-[12px] text-muted-foreground w-48" style={{ fontWeight: 500 }}>Share</th>
                    <th className="text-center px-6 py-3 text-[12px] text-muted-foreground w-16" style={{ fontWeight: 500 }}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRankings.map((ranking, index) => (
                    <motion.tr
                      key={ranking.clientId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + index * 0.06 }}
                      className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors group cursor-pointer"
                      onClick={() => hasFullInsights && navigate(`/clients/${ranking.clientId}`)}
                    >
                      <td className="px-6 py-4">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[13px] ${ranking.rank === 1 ? "bg-primary/8 text-primary" : "bg-accent/60 text-muted-foreground"}`} style={{ fontWeight: 600 }}>{ranking.rank}</div>
                      </td>
                      <td className="px-6 py-4 text-[14px]" style={{ fontWeight: 500 }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] text-primary" style={{ fontWeight: 600 }}>{ranking.client.charAt(0)}</span>
                          </div>
                          {ranking.client}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[14px] text-right tabular-nums" style={{ fontWeight: 500 }}>${applyViewMode(ranking.revenue).toLocaleString()}</td>
                      <td className="px-6 py-4 text-[14px] text-right tabular-nums text-muted-foreground">${applyViewMode(ranking.trueHourlyRate)}</td>
                      <td className="px-6 py-4 text-[14px] text-right tabular-nums text-muted-foreground">{ranking.utilization}%</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-accent/60 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-primary"
                              initial={{ width: 0 }}
                              animate={{ width: `${ranking.share}%` }}
                              transition={{ delay: 0.5 + index * 0.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                            />
                          </div>
                          <span className="text-[13px] text-primary tabular-nums w-10 text-right" style={{ fontWeight: 600 }}>{ranking.share}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">{trendIcon(ranking.trend)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Time Allocation */}
      <motion.div variants={item} className="mb-8 relative">
        {!hasFullInsights && <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-background/60 rounded-xl" />}
        <div className={!hasFullInsights ? "select-none pointer-events-none" : ""}>
          <SectionLabel pro={!hasFullInsights}>Time allocation</SectionLabel>
          {metrics.timeAllocation.length === 0 && hasFullInsights ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <div className="text-[14px] text-muted-foreground" style={{ fontWeight: 500 }}>No time data this period</div>
              <div className="text-[12px] text-muted-foreground mt-1">Log sessions with work categories to see allocation</div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="space-y-6">
                {metrics.timeAllocation.map((alloc, index) => (
                  <div key={alloc.category} className="group">
                    <div className="flex justify-between items-baseline mb-2.5">
                      <div className="text-[14px] flex items-center gap-2" style={{ fontWeight: 500 }}>
                        {alloc.category}
                        {index === 0 && (
                          <span className="text-[11px] text-primary bg-primary/8 px-1.5 py-0.5 rounded-full" style={{ fontWeight: 500 }}>Primary</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-3">
                        <div className="text-[13px] text-muted-foreground tabular-nums">{alloc.hours}h</div>
                        <div className="text-[15px] tabular-nums" style={{ fontWeight: 600 }}>{alloc.percentage}%</div>
                      </div>
                    </div>
                    <div className="h-2.5 bg-accent/60 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        style={{ opacity: 1 - index * 0.2 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${alloc.percentage}%` }}
                        transition={{ delay: 0.3 + index * 0.1, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Heads up */}
      <motion.div variants={item} className="relative">
        {!hasFullInsights && <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-background/60 rounded-xl" />}
        <div className={!hasFullInsights ? "select-none pointer-events-none" : ""}>
          <SectionLabel pro={!hasFullInsights} count={metrics.forwardSignals.length}>Heads up</SectionLabel>
          {metrics.forwardSignals.length === 0 && hasFullInsights ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <div className="text-[14px] text-muted-foreground" style={{ fontWeight: 500 }}>No signals detected</div>
              <div className="text-[12px] text-muted-foreground mt-1">Signals appear when patterns emerge in your data</div>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.forwardSignals.map((signal, index) => {
                const colors = impactColors[signal.impact] || impactColors.Low;
                const SignalIcon = signalIcons[signal.type] || TrendingUp;
                return (
                  <motion.div
                    key={signal.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.08 }}
                    className={`flex items-start justify-between bg-card border border-border rounded-xl px-6 py-4 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group border-l-[3px] ${
                      signal.impact === "High" ? "border-l-primary" : "border-l-primary/30"
                    }`}
                    onClick={() => { if (signal.clientId && hasFullInsights) navigate(`/clients/${signal.clientId}`); }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <SignalIcon className={`w-4 h-4 ${colors.text}`} />
                      </div>
                      <div>
                        <div className="text-[14px] mb-1" style={{ fontWeight: 500 }}>{signal.signal}</div>
                        <div className="text-[12px] text-muted-foreground">{signal.detail}</div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 ${colors.bg} ${colors.text} text-[11px] rounded-full flex-shrink-0`} style={{ fontWeight: 500 }}>
                      <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                      {signal.impact}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
