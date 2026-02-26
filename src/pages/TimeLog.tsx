import { motion } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { Play, Square, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const sampleSessions = [
  { id: 1, client: "Arcadia Design", project: "Brand Refresh 2025", task: "Brand guidelines v2", duration: 3.5, revenue: 525, date: "Feb 26, 2026", billable: true, tags: ["Design", "Branding"] },
  { id: 2, client: "Meridian Labs", project: "Dashboard Redesign", task: "Dashboard wireframes", duration: 2.0, revenue: 300, date: "Feb 26, 2026", billable: true, tags: ["UX", "Design"] },
  { id: 3, client: "Beacon Studio", project: "Marketing Site", task: "Client presentation", duration: 1.5, revenue: 225, date: "Feb 25, 2026", billable: true, tags: ["Meetings"] },
  { id: 4, client: "Arcadia Design", project: "Brand Refresh 2025", task: "Logo explorations", duration: 4.0, revenue: 600, date: "Feb 25, 2026", billable: true, tags: ["Design"] },
  { id: 5, client: "Meridian Labs", project: "Dashboard Redesign", task: "Internal sync meeting", duration: 0.5, revenue: 0, date: "Feb 24, 2026", billable: false, tags: ["Admin"] },
];

export default function TimeLog() {
  const [timerRunning, setTimerRunning] = useState(false);

  return (
    <div className="page-container">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-6">
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Time</h1>
            <p className="text-sm text-muted-foreground mt-1">Track and log your work sessions.</p>
          </div>
          <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Log Entry</Button>
        </motion.div>

        <motion.div variants={itemVariants} className="card-surface p-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${timerRunning ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
            >
              {timerRunning ? <Square className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
            <div>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {timerRunning ? "00:24:17" : "00:00:00"}
              </p>
              <p className="text-sm text-muted-foreground">
                {timerRunning ? "Working on Arcadia Design" : "Start a timer or log an entry"}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card-surface">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Sessions</h2>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />This week
            </div>
          </div>
          <div className="divide-y divide-border">
            {sampleSessions.map((session) => (
              <div key={session.id} className="px-6 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{session.task}</p>
                  <p className="text-xs text-muted-foreground">{session.client} · {session.project}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  {session.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground shrink-0 hidden md:block">{session.date}</span>
                <span className="text-sm tabular-nums text-muted-foreground shrink-0 w-12 text-right">{session.duration}h</span>
                <span className={`text-sm font-medium tabular-nums shrink-0 w-16 text-right ${session.billable ? "text-foreground" : "text-muted-foreground"}`}>
                  {session.billable ? `$${session.revenue}` : "—"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
