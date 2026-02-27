import { useState } from "react";
import { useNavigate } from "react-router";
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
} from "lucide-react";
import { motion } from "motion/react";
import { useData } from "../data/DataContext";
import { usePlan } from "../data/PlanContext";
import { PLANS } from "../data/plans";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

// ── Icon map for performance cards ─────────────────────────────────

const perfIconMap: Record<string, any> = {
  concentration: PieChart,
  utilization: Target,
  retainer: Shield,
  margin: Zap,
};

// ── Icon + color helpers ───────────────────────────────────────────

const impactColors: Record<string, { bg: string; text: string; dot: string }> = {
  High: { bg: "bg-primary/8", text: "text-primary", dot: "bg-primary" },
  Medium: { bg: "bg-primary/5", text: "text-primary/70", dot: "bg-primary/50" },
  Low: { bg: "bg-zinc-100", text: "text-zinc-500", dot: "bg-zinc-400" },
};

const signalIcons: Record<string, any> = {
  projection: TrendingUp,
  milestone: Zap,
  overage: Shield,
  expansion: ArrowUpRight,
  inactive: UserX,
};

type SortKey = "revenue" | "trueHourlyRate" | "utilization";

// ── Pro-gated upgrade overlay ──────────────────────────────────────

function ProUpgradeOverlay() {
  const navigate = useNavigate();
  const proPlan = PLANS.pro;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      {/* Blur backdrop */}
      <div className="absolute inset-0 backdrop-blur-[6px] bg-background/60 rounded-xl" />

      {/* Upgrade card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative bg-card border border-border rounded-2xl p-8 max-w-sm text-center"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)" }}
      >
        <div className="w-11 h-11 rounded-xl bg-[#5ea1bf]/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-[#5ea1bf]" />
        </div>
        <h3 className="text-[16px] text-foreground mb-1.5" style={{ fontWeight: 600 }}>
          Unlock full insights
        </h3>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
          Client rankings, time allocation breakdowns, and predictive forward signals are available on the Pro plan.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => navigate("/settings?tab=billing")}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-[14px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all"
            style={{ fontWeight: 500 }}
          >
            <Sparkles className="w-4 h-4" />
            Upgrade to Pro — ${proPlan.price}/mo
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <p className="text-[11px] text-muted-foreground">
            Includes unlimited clients, PDF exports, invoicing &amp; more
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function Insights() {
  const navigate = useNavigate();
  const { insightsMetrics: metrics, netMultiplier } = useData();
  const { can } = usePlan();
  const [viewMode, setViewMode] = useState<"gross" | "net">("gross");
  const [sortBy, setSortBy] = useState<SortKey>("revenue");

  const hasFullInsights = can("fullInsights");

  // ── Derived data from metrics ──────────────────────────────────

  const sortedRankings = [...metrics.clientRankings]
    .sort((a, b) => {
      if (sortBy === "revenue") return b.revenue - a.revenue;
      if (sortBy === "trueHourlyRate") return b.trueHourlyRate - a.trueHourlyRate;
      return b.utilization - a.utilization;
    })
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const trendIcon = (trend: string) => {
    if (trend === "up") return <ArrowUpRight className="w-3.5 h-3.5 text-primary" />;
    if (trend === "down") return <ArrowDownRight className="w-3.5 h-3.5 text-muted-foreground" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const applyViewMode = (value: number) => {
    return viewMode === "gross" ? value : Math.round(value * netMultiplier);
  };

  return (
    <motion.div
      data-tour="insights-view"
      className="max-w-7xl mx-auto px-6 lg:px-12 py-12"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[24px] tracking-tight mb-1" style={{ fontWeight: 600 }}>
            Insights
          </h1>
          <p className="text-[14px] text-muted-foreground">
            {hasFullInsights ? "Strategic layer" : "Basic insights"} &middot; {metrics.periodLabel}
          </p>
        </div>
        {/* Gross/Net Toggle */}
        <div className="flex gap-0 bg-accent/60 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("gross")}
            className={`px-4 py-1.5 text-[13px] rounded-md transition-all duration-200 ${
              viewMode === "gross" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontWeight: 500, boxShadow: viewMode === "gross" ? "0 1px 3px rgba(0,0,0,0.04)" : "none" }}
          >
            Gross
          </button>
          <button
            onClick={() => setViewMode("net")}
            className={`px-4 py-1.5 text-[13px] rounded-md transition-all duration-200 ${
              viewMode === "net" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontWeight: 500, boxShadow: viewMode === "net" ? "0 1px 3px rgba(0,0,0,0.04)" : "none" }}
          >
            Net
          </button>
        </div>
      </motion.div>

      {/* Performance Panel — always visible (Basic Insights) */}
      <motion.div variants={item} className="mb-12">
        <div className="text-[13px] text-muted-foreground mb-4" style={{ fontWeight: 500, letterSpacing: "0.02em" }}>
          Performance snapshot
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.performance.map((card, index) => {
            const CardIcon = perfIconMap[card.key] || PieChart;
            return (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                className="bg-card border border-border rounded-xl p-6 hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]"
              >
                {/* Subtle corner accent */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/8 opacity-40 rounded-bl-[40px] pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                      <CardIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      {card.label}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <div
                      className="text-[32px] leading-none tracking-tight text-foreground tabular-nums"
                      style={{ fontWeight: 600 }}
                    >
                      {card.value}
                    </div>
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

      {/* ── PRO-GATED SECTIONS ──────────────────────────────────── */}

      {/* Client Rankings */}
      <motion.div variants={item} className="mb-12 relative">
        {!hasFullInsights && <ProUpgradeOverlay />}
        <div className={!hasFullInsights ? "select-none pointer-events-none" : ""}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500, letterSpacing: "0.02em" }}>
              Client rankings
              {!hasFullInsights && (
                <span
                  className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-[#5ea1bf]/10 text-[#5ea1bf]"
                  style={{ fontWeight: 600 }}
                >
                  <Lock className="w-2.5 h-2.5" /> PRO
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {[
                { key: "revenue" as SortKey, label: "Earnings" },
                { key: "trueHourlyRate" as SortKey, label: "Hourly rate" },
                { key: "utilization" as SortKey, label: "Utilization" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-2.5 py-1 text-[12px] rounded-md transition-all ${
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
            <div
              className="bg-card border border-border rounded-xl p-12 text-center"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
            >
              <div className="text-[14px] text-muted-foreground" style={{ fontWeight: 500 }}>
                No client revenue data this period
              </div>
              <div className="text-[12px] text-muted-foreground mt-1">Log billable sessions to see rankings</div>
            </div>
          ) : (
            <div
              className="bg-card border border-border rounded-xl overflow-hidden"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)" }}
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-accent/30">
                    <th
                      className="text-left px-6 py-3 text-[12px] text-muted-foreground w-12"
                      style={{ fontWeight: 500 }}
                    >
                      #
                    </th>
                    <th className="text-left px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Client
                    </th>
                    <th className="text-right px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Earnings
                    </th>
                    <th className="text-right px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      True hourly
                    </th>
                    <th className="text-right px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Utilization
                    </th>
                    <th
                      className="text-left px-6 py-3 text-[12px] text-muted-foreground w-48"
                      style={{ fontWeight: 500 }}
                    >
                      Share
                    </th>
                    <th
                      className="text-center px-6 py-3 text-[12px] text-muted-foreground w-16"
                      style={{ fontWeight: 500 }}
                    >
                      Trend
                    </th>
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
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[13px] ${
                            ranking.rank === 1 ? "bg-primary/8 text-primary" : "bg-accent/60 text-muted-foreground"
                          }`}
                          style={{ fontWeight: 600 }}
                        >
                          {ranking.rank}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[14px]" style={{ fontWeight: 500 }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] text-primary" style={{ fontWeight: 600 }}>
                              {ranking.client.charAt(0)}
                            </span>
                          </div>
                          {ranking.client}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[14px] text-right tabular-nums" style={{ fontWeight: 500 }}>
                        ${applyViewMode(ranking.revenue).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-[14px] text-right tabular-nums text-muted-foreground">
                        ${applyViewMode(ranking.trueHourlyRate)}
                      </td>
                      <td className="px-6 py-4 text-[14px] text-right tabular-nums text-muted-foreground">
                        {ranking.utilization}%
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-accent/60 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: "linear-gradient(90deg, #5ea1bf, #7fb8d1)" }}
                              initial={{ width: 0 }}
                              animate={{ width: `${ranking.share}%` }}
                              transition={{ delay: 0.5 + index * 0.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                            />
                          </div>
                          <span
                            className="text-[13px] text-primary tabular-nums w-10 text-right"
                            style={{ fontWeight: 600 }}
                          >
                            {ranking.share}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">{trendIcon(ranking.trend)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* Time Allocation */}
      <motion.div variants={item} className="mb-12 relative">
        {!hasFullInsights && <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-background/60 rounded-xl" />}
        <div className={!hasFullInsights ? "select-none pointer-events-none" : ""}>
          <div className="text-[13px] text-muted-foreground mb-4" style={{ fontWeight: 500, letterSpacing: "0.02em" }}>
            Time allocation
            {!hasFullInsights && (
              <span
                className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-[#5ea1bf]/10 text-[#5ea1bf]"
                style={{ fontWeight: 600 }}
              >
                <Lock className="w-2.5 h-2.5" /> PRO
              </span>
            )}
          </div>

          {metrics.timeAllocation.length === 0 && hasFullInsights ? (
            <div
              className="bg-card border border-border rounded-xl p-12 text-center"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
            >
              <div className="text-[14px] text-muted-foreground" style={{ fontWeight: 500 }}>
                No time data this period
              </div>
              <div className="text-[12px] text-muted-foreground mt-1">
                Log sessions with work categories to see allocation
              </div>
            </div>
          ) : (
            <div
              className="bg-card border border-border rounded-xl p-6"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)" }}
            >
              <div className="space-y-6">
                {metrics.timeAllocation.map((alloc, index) => (
                  <div key={alloc.category} className="group">
                    <div className="flex justify-between items-baseline mb-2.5">
                      <div className="text-[14px] flex items-center gap-2" style={{ fontWeight: 500 }}>
                        {alloc.category}
                        {index === 0 && (
                          <span
                            className="text-[11px] text-primary bg-primary/8 px-1.5 py-0.5 rounded-full"
                            style={{ fontWeight: 500 }}
                          >
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-3">
                        <div className="text-[13px] text-muted-foreground tabular-nums">{alloc.hours}h</div>
                        <div className="text-[15px] tabular-nums" style={{ fontWeight: 600 }}>
                          {alloc.percentage}%
                        </div>
                      </div>
                    </div>
                    <div className="h-2.5 bg-accent/60 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background:
                            index === 0
                              ? "linear-gradient(90deg, #5ea1bf, #7fb8d1)"
                              : index === 1
                                ? "#5ea1bf80"
                                : index === 2
                                  ? "#5ea1bf50"
                                  : index === 3
                                    ? "#5ea1bf35"
                                    : "#5ea1bf20",
                        }}
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

      {/* Forward Signals */}
      <motion.div variants={item} className="relative">
        {!hasFullInsights && <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-background/60 rounded-xl" />}
        <div className={!hasFullInsights ? "select-none pointer-events-none" : ""}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500, letterSpacing: "0.02em" }}>
              Forward signals
              {!hasFullInsights && (
                <span
                  className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-[#5ea1bf]/10 text-[#5ea1bf]"
                  style={{ fontWeight: 600 }}
                >
                  <Lock className="w-2.5 h-2.5" /> PRO
                </span>
              )}
            </div>
            <div className="text-[12px] text-muted-foreground">
              {metrics.forwardSignals.length} signal{metrics.forwardSignals.length !== 1 ? "s" : ""}
            </div>
          </div>

          {metrics.forwardSignals.length === 0 && hasFullInsights ? (
            <div
              className="bg-card border border-border rounded-xl p-12 text-center"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
            >
              <div className="text-[14px] text-muted-foreground" style={{ fontWeight: 500 }}>
                No signals detected
              </div>
              <div className="text-[12px] text-muted-foreground mt-1">
                Signals appear when patterns emerge in your data
              </div>
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
                    className={`flex items-start justify-between bg-card border border-border rounded-xl px-6 py-4 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group border-l-[3px] shadow-[0_1px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] ${
                      signal.impact === "High" ? "border-l-primary" : "border-l-primary/30"
                    }`}
                    onClick={() => {
                      if (signal.clientId && hasFullInsights) navigate(`/clients/${signal.clientId}`);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                      >
                        <SignalIcon className={`w-4 h-4 ${colors.text}`} />
                      </div>
                      <div>
                        <div className="text-[14px] mb-1" style={{ fontWeight: 500 }}>
                          {signal.signal}
                        </div>
                        <div className="text-[12px] text-muted-foreground">{signal.detail}</div>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 px-2 py-0.5 ${colors.bg} ${colors.text} text-[11px] rounded-full flex-shrink-0`}
                      style={{ fontWeight: 500 }}
                    >
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
