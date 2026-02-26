import { motion } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const sampleProjects = [
  { id: "1", client: "Arcadia Design", name: "Brand Refresh 2025", status: "Active", hours: 34, revenue: 5100, progress: 65 },
  { id: "2", client: "Meridian Labs", name: "Dashboard Redesign", status: "Active", hours: 22, revenue: 3300, progress: 40 },
  { id: "3", client: "Beacon Studio", name: "Marketing Site", status: "On Hold", hours: 18, revenue: 2700, progress: 80 },
  { id: "4", client: "Arcadia Design", name: "App Icons", status: "Complete", hours: 8, revenue: 1200, progress: 100 },
];

export default function Projects() {
  return (
    <div className="page-container">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-6">
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">{sampleProjects.filter(p => p.status === "Active").length} active projects</p>
          </div>
          <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Project</Button>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search projects..." className="pl-9" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleProjects.map((project) => (
            <div key={project.id} className="card-interactive p-5 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">{project.client}</p>
                <h3 className="text-sm font-semibold text-foreground mt-0.5">{project.name}</h3>
              </div>
              <Badge variant="secondary" className={`text-[10px] font-medium ${project.status === "Active" ? "status-active" : project.status === "Complete" ? "bg-primary/10 text-primary" : "status-archived"}`}>
                {project.status}
              </Badge>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className="tabular-nums">{project.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-accent overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                <div>
                  <p className="text-base font-semibold tabular-nums text-foreground">{project.hours}h</p>
                  <p className="text-xs text-muted-foreground">Hours</p>
                </div>
                <div>
                  <p className="text-base font-semibold tabular-nums text-foreground">${project.revenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
