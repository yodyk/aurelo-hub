import { motion } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, Clock, Users, TrendingUp, Plus, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const earningsData = [
  { month: "Sep", earnings: 4200 },
  { month: "Oct", earnings: 5800 },
  { month: "Nov", earnings: 4900 },
  { month: "Dec", earnings: 6400 },
  { month: "Jan", earnings: 7200 },
  { month: "Feb", earnings: 5600 },
];

const recentSessions = [
  { id: 1, client: "Arcadia Design", task: "Brand guidelines v2", duration: 3.5, revenue: 525, date: "Today" },
  { id: 2, client: "Meridian Labs", task: "Dashboard wireframes", duration: 2.0, revenue: 300, date: "Today" },
  { id: 3, client: "Beacon Studio", task: "Client presentation", duration: 1.5, revenue: 225, date: "Yesterday" },
  { id: 4, client: "Arcadia Design", task: "Logo explorations", duration: 4.0, revenue: 600, date: "Yesterday" },
];

const topClients = [
  { name: "Arcadia Design", earnings: 3200, hours: 21 },
  { name: "Meridian Labs", earnings: 2400, hours: 16 },
  { name: "Beacon Studio", earnings: 1800, hours: 12 },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's your business snapshot.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/time")} className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Log Time
            </Button>
            <Button size="sm" onClick={() => navigate("/clients")} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Client
            </Button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={DollarSign} label="Monthly Earnings" value="$5,600" change="+12%" />
          <MetricCard icon={TrendingUp} label="True Hourly Rate" value="$142" change="+8%" />
          <MetricCard icon={Clock} label="Hours This Month" value="39.5" change="-3%" negative />
          <MetricCard icon={Users} label="Active Clients" value="4" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2 card-surface p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-medium text-foreground">Earnings (6 months)</h2>
              <span className="text-xs text-muted-foreground">Gross</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={earningsData}>
                <defs>
                  <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(197, 40%, 56%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(197, 40%, 56%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 6%, 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(240, 7%, 48%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(240, 7%, 48%)" tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(40, 6%, 88%)",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Earnings"]}
                />
                <Area type="monotone" dataKey="earnings" stroke="hsl(197, 40%, 56%)" strokeWidth={2} fill="url(#earningsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div variants={itemVariants} className="card-surface p-6">
            <h2 className="text-sm font-medium text-foreground mb-4">Top Clients</h2>
            <div className="space-y-4">
              {topClients.map((client, i) => (
                <div key={client.name} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.hours}h logged</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground">${client.earnings.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="card-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-foreground">Recent Sessions</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/time")} className="text-xs gap-1 text-primary">
              View all <ArrowUpRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentSessions.map((session) => (
              <div key={session.id} className="flex items-center gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{session.task}</p>
                  <p className="text-xs text-muted-foreground">{session.client}</p>
                </div>
                <span className="text-xs text-muted-foreground">{session.date}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{session.duration}h</span>
                <span className="text-sm font-medium tabular-nums text-foreground">${session.revenue}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, change, negative }: { icon: React.ElementType; label: string; value: string; change?: string; negative?: boolean }) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {change && (
          <span className={`text-xs font-medium tabular-nums ${negative ? "text-destructive" : "text-primary"}`}>{change}</span>
        )}
      </div>
      <p className="metric-value text-foreground">{value}</p>
      <p className="metric-label mt-1">{label}</p>
    </div>
  );
}
