import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, Clock, DollarSign, TrendingUp, BarChart3, ChevronDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/data/DataContext";

interface TeamMember {
  id: string;
  userId: string | null;
  name: string | null;
  email: string;
  role: string;
  status: string;
  weeklyCapacity: number;
}

const CAPACITY_PRESETS = [
  { label: "Full-time", hours: 40, description: "40h / week" },
  { label: "Part-time", hours: 20, description: "20h / week" },
  { label: "Contractor", hours: 30, description: "30h / week" },
] as const;

function CapacityDropdown({
  value,
  memberId,
  onSave,
}: {
  value: number;
  memberId: string;
  onSave: (memberId: string, hours: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCustom(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const matchedPreset = CAPACITY_PRESETS.find((p) => p.hours === value);

  const handleSelect = async (hours: number) => {
    setOpen(false);
    setShowCustom(false);
    await onSave(memberId, hours);
  };

  const handleCustomSubmit = async () => {
    const val = parseFloat(customValue);
    if (!isNaN(val) && val >= 0 && val <= 168) {
      await handleSelect(val);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setShowCustom(false); }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[13px] tabular-nums rounded-lg border border-border hover:bg-accent/50 transition-colors group"
        style={{ fontWeight: 500 }}
      >
        <span>{value}h/w</span>
        {matchedPreset && (
          <span className="text-[11px] text-muted-foreground">· {matchedPreset.label}</span>
        )}
        <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
          >
            <div className="p-1.5">
              {CAPACITY_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleSelect(preset.hours)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="text-left">
                    <div style={{ fontWeight: 500 }}>{preset.label}</div>
                    <div className="text-[11px] text-muted-foreground">{preset.description}</div>
                  </div>
                  {value === preset.hours && (
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-border p-1.5">
              {showCustom ? (
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <input
                    type="number"
                    min={0}
                    max={168}
                    step={1}
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCustomSubmit();
                      if (e.key === "Escape") { setShowCustom(false); setOpen(false); }
                    }}
                    autoFocus
                    placeholder="Hours"
                    className="w-16 h-7 text-[13px] text-right tabular-nums bg-background border border-border rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-[12px] text-muted-foreground">h/w</span>
                  <button
                    onClick={handleCustomSubmit}
                    className="ml-auto p-1 text-primary hover:text-primary/80"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowCustom(true); setCustomValue(value.toString()); }}
                  className="w-full px-3 py-2 text-[13px] text-left rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                  style={{ fontWeight: 500 }}
                >
                  Custom hours…
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TeamUtilization() {
  const { workspaceId, sessions } = useData();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    supabase
      .from("workspace_members")
      .select("id, user_id, name, email, role, status, weekly_capacity")
      .eq("workspace_id", workspaceId)
      .then(({ data }) => {
        setMembers(
          (data || []).map((m: any) => ({
            ...m,
            userId: m.user_id,
            weeklyCapacity: m.weekly_capacity ?? 40,
          }))
        );
        setLoading(false);
      });
  }, [workspaceId]);

  const activeMembers = members.filter((m) => m.status === "active");
  const pendingMembers = members.filter((m) => m.status === "pending");

  const handleSaveCapacity = useCallback(
    async (memberId: string, hours: number) => {
      await supabase
        .from("workspace_members")
        .update({ weekly_capacity: hours } as any)
        .eq("id", memberId);
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, weeklyCapacity: hours } : m))
      );
    },
    []
  );

  // Per-member metrics using loggedBy
  const memberMetrics = useMemo(() => {
    const map = new Map<string, { hours: number; billableHours: number; revenue: number }>();
    for (const s of sessions) {
      const uid = s.loggedBy || s.logged_by;
      if (!uid) continue;
      const existing = map.get(uid) || { hours: 0, billableHours: 0, revenue: 0 };
      existing.hours += s.duration || 0;
      if (s.billable) existing.billableHours += s.duration || 0;
      existing.revenue += s.revenue || 0;
      map.set(uid, existing);
    }
    return map;
  }, [sessions]);

  // Totals
  const totalHours = sessions.reduce((s, ses) => s + (ses.duration || 0), 0);
  const billableHours = sessions.filter((s) => s.billable).reduce((s, ses) => s + (ses.duration || 0), 0);
  const nonBillableHours = totalHours - billableHours;
  const totalRevenue = sessions.reduce((s, ses) => s + (ses.revenue || 0), 0);
  const utilizationRate = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;

  const totalWeeklyCapacity = activeMembers.reduce((sum, m) => sum + m.weeklyCapacity, 0);
  const avgHoursPerMember = activeMembers.length > 0 ? Math.round((totalHours / activeMembers.length) * 10) / 10 : 0;
  const capacityUsed = totalWeeklyCapacity > 0 ? Math.min(100, Math.round((totalHours / totalWeeklyCapacity) * 100)) : 0;

  const metricCards = [
    { key: "members", label: "Active members", value: activeMembers.length.toString(), sub: `of ${members.length} total`, icon: Users },
    { key: "utilization", label: "Billable utilization", value: `${utilizationRate}%`, sub: `${Math.round(billableHours)}h billable`, icon: TrendingUp },
    { key: "capacity", label: "Avg hours / member", value: avgHoursPerMember.toString(), sub: `of ${totalWeeklyCapacity}h capacity`, icon: Clock },
    { key: "revenue", label: "Team revenue", value: `$${Math.round(totalRevenue).toLocaleString()}`, sub: "this period", icon: DollarSign },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="bg-card border border-border rounded-xl p-5 relative overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/8 opacity-40 rounded-bl-[32px] pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>{card.label}</span>
                </div>
                <div className="text-[28px] leading-none tracking-tight text-foreground tabular-nums mb-1" style={{ fontWeight: 600 }}>
                  {card.value}
                </div>
                <div className="text-[12px] text-muted-foreground">{card.sub}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Billable vs Non-billable breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-card border border-border rounded-xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
      >
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>Time breakdown</span>
        </div>
        <div className="space-y-5">
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[13px]" style={{ fontWeight: 500 }}>Billable hours</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] text-muted-foreground tabular-nums">{Math.round(billableHours)}h</span>
                <span className="text-[14px] tabular-nums" style={{ fontWeight: 600 }}>{utilizationRate}%</span>
              </div>
            </div>
            <div className="h-2.5 bg-accent/60 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}
                initial={{ width: 0 }}
                animate={{ width: `${utilizationRate}%` }}
                transition={{ delay: 0.5, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                <span className="text-[13px]" style={{ fontWeight: 500 }}>Non-billable hours</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] text-muted-foreground tabular-nums">{Math.round(nonBillableHours)}h</span>
                <span className="text-[14px] tabular-nums" style={{ fontWeight: 600 }}>{totalHours > 0 ? 100 - utilizationRate : 0}%</span>
              </div>
            </div>
            <div className="h-2.5 bg-accent/60 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-muted-foreground/20"
                initial={{ width: 0 }}
                animate={{ width: `${totalHours > 0 ? 100 - utilizationRate : 0}%` }}
                transition={{ delay: 0.6, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
          </div>
          <div className="pt-3 border-t border-border">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                Weekly capacity ({totalWeeklyCapacity}h total)
              </span>
              <span className="text-[13px] tabular-nums" style={{ fontWeight: 600 }}>{capacityUsed}% used</span>
            </div>
            <div className="h-2 bg-accent/60 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: capacityUsed > 90 ? "linear-gradient(90deg, hsl(var(--destructive)), hsl(var(--destructive) / 0.7))" :
                    capacityUsed > 70 ? "linear-gradient(90deg, hsl(40 70% 50%), hsl(40 70% 60%))" :
                    "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${capacityUsed}%` }}
                transition={{ delay: 0.7, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Team members table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <div className="text-[13px] text-muted-foreground mb-4" style={{ fontWeight: 500, letterSpacing: "0.02em" }}>
          Member workload
        </div>

        {members.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
            <div className="text-[14px] text-muted-foreground" style={{ fontWeight: 500 }}>No team members</div>
            <div className="text-[12px] text-muted-foreground mt-1">Invite team members from Settings to see utilization</div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="text-left px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Member</th>
                  <th className="text-left px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Role</th>
                  <th className="text-right px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Capacity</th>
                  <th className="text-right px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Hours</th>
                  <th className="text-right px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Billable</th>
                  <th className="text-right px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Revenue</th>
                  <th className="text-left px-6 py-3 text-[12px] text-muted-foreground w-40" style={{ fontWeight: 500 }}>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((member, idx) => {
                  const m = memberMetrics.get(member.userId || "") || { hours: 0, billableHours: 0, revenue: 0 };
                  const memberUtil = m.hours > 0 ? Math.round((m.billableHours / m.hours) * 100) : 0;

                  return (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + idx * 0.06 }}
                      className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] text-primary" style={{ fontWeight: 600 }}>
                              {(member.name || member.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-[14px]" style={{ fontWeight: 500 }}>{member.name || "—"}</div>
                            <div className="text-[12px] text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-[11px] rounded-full ${
                            member.role === "Owner" ? "bg-primary/10 text-primary" :
                            member.role === "Admin" ? "bg-primary/6 text-primary/80" :
                            "bg-accent text-muted-foreground"
                          }`}
                          style={{ fontWeight: 600 }}
                        >
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <CapacityDropdown
                            value={member.weeklyCapacity}
                            memberId={member.id}
                            onSave={handleSaveCapacity}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-[14px] tabular-nums" style={{ fontWeight: 500 }}>
                        {Math.round(m.hours * 10) / 10}h
                      </td>
                      <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">
                        {Math.round(m.billableHours * 10) / 10}h
                      </td>
                      <td className="px-6 py-4 text-right text-[14px] tabular-nums" style={{ fontWeight: 500 }}>
                        ${Math.round(m.revenue).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-accent/60 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}
                              initial={{ width: 0 }}
                              animate={{ width: `${memberUtil}%` }}
                              transition={{ delay: 0.6 + idx * 0.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                            />
                          </div>
                          <span className="text-[13px] text-primary tabular-nums w-10 text-right" style={{ fontWeight: 600 }}>
                            {memberUtil}%
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pending members section */}
            {pendingMembers.length > 0 && (
              <div className="border-t border-border">
                <div className="px-6 py-2.5 bg-accent/20">
                  <span className="text-[11px] text-muted-foreground" style={{ fontWeight: 600, letterSpacing: "0.04em" }}>
                    PENDING INVITES ({pendingMembers.length})
                  </span>
                </div>
                {pendingMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 px-6 py-3 border-b border-border last:border-0 opacity-60"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] text-muted-foreground" style={{ fontWeight: 600 }}>
                        {member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-muted-foreground truncate">{member.email}</div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground" style={{ fontWeight: 500 }}>
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
