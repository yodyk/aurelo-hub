import { motion } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { TrendingUp, AlertCircle, BarChart3, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const snapshots = [
  { icon: BarChart3, title: "Revenue Concentration", value: "42%", detail: "Top client share — moderate diversification", status: "ok" },
  { icon: TrendingUp, title: "Utilization Rate", value: "78%", detail: "39.5h logged of 50h target", status: "ok" },
  { icon: AlertCircle, title: "Retainer Health", value: "68%", detail: "Meridian Labs: 32% remaining", status: "warning" },
  { icon: Zap, title: "Effective Margin", value: "67%", detail: "After tax and processing fees", status: "ok" },
];

export default function Insights() {
  return (
    <div className="page-container">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-8">
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">Understand your business performance.</p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <h2 className="section-label mb-4">Performance Snapshot</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {snapshots.map((s) => (
              <div key={s.title} className="card-surface p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.status === "warning" ? "bg-warning/10" : "bg-primary/10"}`}>
                    <s.icon className={`h-4 w-4 ${s.status === "warning" ? "text-warning" : "text-primary"}`} />
                  </div>
                  <h3 className="text-sm font-medium text-foreground">{s.title}</h3>
                </div>
                <p className="text-2xl font-semibold tabular-nums text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.detail}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="relative">
          <div className="space-y-6 filter blur-[6px] pointer-events-none select-none">
            <div>
              <h2 className="section-label mb-4">Client Rankings</h2>
              <div className="card-surface p-6 h-48" />
            </div>
            <div>
              <h2 className="section-label mb-4">Time Allocation</h2>
              <div className="card-surface p-6 h-48" />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-2xl">
            <div className="text-center space-y-3 max-w-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Unlock Full Insights</h3>
              <p className="text-sm text-muted-foreground">Upgrade to Pro to access client rankings, time allocation analysis, and forward signals.</p>
              <Button size="sm">Upgrade to Pro</Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
