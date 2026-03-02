import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users, Clock, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/data/DataContext";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
}

interface TeamMetrics {
  totalMembers: number;
  activeMembers: number;
  totalHoursLogged: number;
  billableHours: number;
  nonBillableHours: number;
  utilizationRate: number;
  avgHoursPerMember: number;
  totalRevenue: number;
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function TeamUtilization() {
  const { workspaceId, sessions } = useData();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    supabase
      .from("workspace_members")
      .select("id, name, email, role, status")
      .eq("workspace_id", workspaceId)
      .then(({ data }) => {
        setMembers(data || []);
        setLoading(false);
      });
  }, [workspaceId]);

  const activeMembers = members.filter((m) => m.status === "active");

  // Compute team-level metrics from sessions
  const totalHours = sessions.reduce((s, ses) => s + (ses.duration || 0), 0);
  const billableHours = sessions.filter((s) => s.billable).reduce((s, ses) => s + (ses.duration || 0), 0);
  const nonBillableHours = totalHours - billableHours;
  const totalRevenue = sessions.reduce((s, ses) => s + (ses.revenue || 0), 0);
  const utilizationRate = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
  const avgHoursPerMember = activeMembers.length > 0 ? Math.round((totalHours / activeMembers.length) * 10) / 10 : 0;

  // Weekly capacity (assume 40h/week per member)
  const weeklyCapacity = activeMembers.length * 40;
  const capacityUsed = Math.min(100, Math.round((avgHoursPerMember / 40) * 100));

  const metricCards = [
    {
      key: "members",
      label: "Active members",
      value: activeMembers.length.toString(),
      sub: `of ${members.length} total`,
      icon: Users,
    },
    {
      key: "utilization",
      label: "Billable utilization",
      value: `${utilizationRate}%`,
      sub: `${Math.round(billableHours)}h billable`,
      icon: TrendingUp,
    },
    {
      key: "capacity",
      label: "Avg hours / member",
      value: avgHoursPerMember.toString(),
      sub: `of 40h capacity`,
      icon: Clock,
    },
    {
      key: "revenue",
      label: "Team revenue",
      value: `$${Math.round(totalRevenue).toLocaleString()}`,
      sub: "this period",
      icon: DollarSign,
    },
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
                  <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                    {card.label}
                  </span>
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
          <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
            Time breakdown
          </span>
        </div>

        <div className="space-y-5">
          {/* Billable */}
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
                style={{ background: "linear-gradient(90deg, #5ea1bf, #7fb8d1)" }}
                initial={{ width: 0 }}
                animate={{ width: `${utilizationRate}%` }}
                transition={{ delay: 0.5, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
          </div>

          {/* Non-billable */}
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

          {/* Capacity gauge */}
          <div className="pt-3 border-t border-border">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                Weekly capacity ({weeklyCapacity}h total)
              </span>
              <span className="text-[13px] tabular-nums" style={{ fontWeight: 600 }}>
                {capacityUsed}% used
              </span>
            </div>
            <div className="h-2 bg-accent/60 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: capacityUsed > 90 ? "linear-gradient(90deg, #e5484d, #f76b6b)" :
                    capacityUsed > 70 ? "linear-gradient(90deg, #bfa044, #d4b85a)" :
                    "linear-gradient(90deg, #5ea1bf, #7fb8d1)",
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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <div className="text-[13px] text-muted-foreground mb-4" style={{ fontWeight: 500, letterSpacing: "0.02em" }}>
          Team members
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
                  <th className="text-center px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, idx) => (
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
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[12px] ${
                          member.status === "active" ? "text-primary" : "text-muted-foreground"
                        }`}
                        style={{ fontWeight: 500 }}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          member.status === "active" ? "bg-primary" : "bg-muted-foreground/40"
                        }`} />
                        {member.status === "active" ? "Active" : "Pending"}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
