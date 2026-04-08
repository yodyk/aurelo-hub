import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Users, Clock, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
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

const CAPACITY_LABELS: Record<number, string> = {
  40: "Full-time",
  20: "Part-time",
  30: "Contractor",
};

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
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-circle animate-spin" />
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
                <div className="w-2 h-2 rounded-circle bg-primary" />
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
                style={{ background: "linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 70%, transparent))" }}
                initial={{ width: 0 }}
                animate={{ width: `${utilizationRate}%` }}
                transition={{ delay: 0.5, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-circle bg-muted-foreground/30" />
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
                  background: capacityUsed > 90 ? "linear-gradient(90deg, var(--destructive), color-mix(in srgb, var(--destructive) 70%, transparent))" :
                    capacityUsed > 70 ? "linear-gradient(90deg, hsl(40 70% 50%), hsl(40 70% 60%))" :
                    "linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 70%, transparent))",
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
            <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
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
                  const capacityLabel = CAPACITY_LABELS[member.weeklyCapacity];

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
                      <td className="px-6 py-4 text-right">
                        <span className="text-[13px] tabular-nums" style={{ fontWeight: 500 }}>
                          {member.weeklyCapacity}h/w
                        </span>
                        {capacityLabel && (
                          <span className="text-[11px] text-muted-foreground ml-1.5">· {capacityLabel}</span>
                        )}
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
                              style={{ background: "linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 70%, transparent))" }}
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
            </div>

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
