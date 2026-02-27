import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { FolderKanban, Plus, DollarSign, Clock, CheckCircle2, ChevronDown, Search } from "lucide-react";
import { motion } from "motion/react";
import { useData } from "../data/DataContext";
import { AddProjectModal } from "../components/Modals";
import { clientProjects as mockProjects } from "../data/mockData";
import { toast } from "sonner";
import { usePlan } from "../data/PlanContext";
import { LimitEnforcementModal } from "../components/OverLimitBanner";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  "In Progress": { bg: "bg-primary/8", text: "text-primary", dot: "bg-primary" },
  "Not Started": { bg: "bg-stone-100", text: "text-stone-600", dot: "bg-stone-400" },
  "On Hold": { bg: "bg-stone-100", text: "text-stone-500", dot: "bg-stone-400" },
  Complete: { bg: "bg-zinc-100", text: "text-zinc-500", dot: "bg-zinc-400" },
};

export default function Projects() {
  const navigate = useNavigate();
  const { clients, allProjects, loadAllProjects, addProject, loading: dataLoading } = useData();
  const { limit, wouldExceed } = usePlan();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalClientName, setLimitModalClientName] = useState("");
  const [limitModalCount, setLimitModalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Aggregate projects: remote first, fall back to mock
  const [localProjects, setLocalProjects] = useState<any[]>([]);

  useEffect(() => {
    // Wait for DataContext to finish its initial load before fetching projects
    if (dataLoading) return;
    loadAllProjects()
      .then(() => setLoading(false))
      .catch((err) => {
        console.error("Failed to load all projects:", err);
        setLoading(false);
      });
  }, [loadAllProjects, dataLoading]);

  // Build the display list from allProjects + mock fallback
  const projectsList = useMemo(() => {
    // If we got remote projects, use them. Otherwise, flatten mock data.
    if (allProjects.length > 0) {
      return [...allProjects, ...localProjects];
    }
    // Flatten mock data
    const mocked: any[] = [];
    for (const [cid, projects] of Object.entries(mockProjects)) {
      for (const p of projects as any[]) {
        mocked.push({ ...p, clientId: cid });
      }
    }
    return [...mocked, ...localProjects];
  }, [allProjects, localProjects]);

  // Enrich with client name
  const enrichedProjects = useMemo(() => {
    return projectsList.map((p) => {
      const client = clients.find((c) => c.id === p.clientId);
      return {
        ...p,
        clientName: client?.name || p.clientId || "Unknown",
        clientRate: client?.rate || 0,
      };
    });
  }, [projectsList, clients]);

  // Apply filters
  const filteredProjects = useMemo(() => {
    let result = enrichedProjects;
    if (statusFilter) {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (clientFilter) {
      result = result.filter((p) => p.clientId === clientFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.clientName?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [enrichedProjects, statusFilter, clientFilter, searchQuery]);

  // Summary stats
  const activeProjects = enrichedProjects.filter((p) => p.status === "In Progress");
  const totalValue = enrichedProjects.reduce((sum, p) => sum + (p.totalValue || 0), 0);
  const activeValue = activeProjects.reduce((sum, p) => sum + (p.totalValue || 0), 0);
  const totalHoursLogged = enrichedProjects.reduce((sum, p) => sum + (p.hours || 0), 0);
  const totalEstimated = enrichedProjects.reduce((sum, p) => sum + (p.estimatedHours || 0), 0);
  const avgCompletion = totalEstimated > 0 ? Math.round((totalHoursLogged / totalEstimated) * 100) : 0;

  // Unique clients that have projects
  const clientsWithProjects = useMemo(() => {
    const ids = new Set(enrichedProjects.map((p) => p.clientId));
    return clients.filter((c) => ids.has(c.id));
  }, [enrichedProjects, clients]);

  const statusFilters = ["In Progress", "Not Started", "On Hold", "Complete"];

  const handleAddProject = async (project: any, clientId?: string) => {
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }
    // Check per-client project limit
    const maxPerClient = limit("projectsPerClient");
    if (maxPerClient !== null) {
      const clientProjectCount = enrichedProjects.filter(
        (p) => p.clientId === clientId && p.status !== "Complete",
      ).length;
      if (clientProjectCount >= maxPerClient) {
        const clientName = clients.find((c) => c.id === clientId)?.name || "this client";
        setLimitModalClientName(clientName);
        setLimitModalCount(clientProjectCount);
        setShowLimitModal(true);
        setShowProjectModal(false);
        return;
      }
    }
    const saved = await addProject(clientId, project);
    setLocalProjects((prev) => [...prev, { ...saved, clientId }]);
    // Reload from server
    loadAllProjects();
    toast.success("Project added");
  };

  return (
    <motion.div
      data-tour="projects-view"
      className="max-w-7xl mx-auto px-6 lg:px-12 py-12"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[24px] tracking-tight mb-1" style={{ fontWeight: 600 }}>
            Projects
          </h1>
          <p className="text-[14px] text-muted-foreground">
            {enrichedProjects.length} projects across {clientsWithProjects.length} clients
          </p>
        </div>
        <button
          onClick={() => setShowProjectModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[14px] rounded-lg hover:bg-primary/90 transition-all duration-200"
          style={{ fontWeight: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        >
          <Plus className="w-4 h-4" />
          Add project
        </button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={item} className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-6 group hover:-translate-y-0.5 transition-all duration-300 shadow-[0_1px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent/60 flex items-center justify-center group-hover:bg-primary/8 transition-colors">
              <FolderKanban className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
              Active projects
            </div>
          </div>
          <div
            className="text-[32px] leading-none tracking-tight text-primary tabular-nums"
            style={{ fontWeight: 600 }}
          >
            {activeProjects.length}
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5">{enrichedProjects.length} total</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 group hover:-translate-y-0.5 transition-all duration-300 shadow-[0_1px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent/60 flex items-center justify-center group-hover:bg-primary/8 transition-colors">
              <DollarSign className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
              Active value
            </div>
          </div>
          <div
            className="text-[32px] leading-none tracking-tight text-primary tabular-nums"
            style={{ fontWeight: 600 }}
          >
            ${activeValue.toLocaleString()}
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5">${totalValue.toLocaleString()} total</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 group hover:-translate-y-0.5 transition-all duration-300 shadow-[0_1px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent/60 flex items-center justify-center group-hover:bg-primary/8 transition-colors">
              <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
              Hours logged
            </div>
          </div>
          <div className="text-[32px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}>
            {totalHoursLogged}h
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5">of {totalEstimated}h estimated</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 group hover:-translate-y-0.5 transition-all duration-300 shadow-[0_1px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent/60 flex items-center justify-center group-hover:bg-primary/8 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
              Avg. completion
            </div>
          </div>
          <div className="text-[32px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}>
            {avgCompletion}%
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5">across all projects</div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="mb-6">
        <div className="flex gap-2 flex-wrap items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-[14px] hover:bg-accent/40 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 w-56"
              style={{ fontWeight: 500 }}
            />
          </div>

          {/* Client filter */}
          <div className="relative">
            <select
              value={clientFilter || ""}
              onChange={(e) => setClientFilter(e.target.value || null)}
              className="appearance-none px-4 py-2 pr-8 bg-card border border-border rounded-lg text-[14px] hover:bg-accent/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ fontWeight: 500 }}
            >
              <option value="">All clients</option>
              {clientsWithProjects.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <div className="h-8 w-px bg-border self-center mx-1" />

          {/* Status pills */}
          <button
            onClick={() => setStatusFilter(null)}
            className={`px-3 py-2 text-[13px] rounded-lg border transition-all duration-200 ${
              !statusFilter
                ? "bg-primary/8 border-primary/20 text-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
            style={{ fontWeight: 500 }}
          >
            All
          </button>
          {statusFilters.map((sf) => (
            <button
              key={sf}
              onClick={() => setStatusFilter(statusFilter === sf ? null : sf)}
              className={`px-3 py-2 text-[13px] rounded-lg border transition-all duration-200 ${
                statusFilter === sf
                  ? "bg-primary/8 border-primary/20 text-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
              style={{ fontWeight: 500 }}
            >
              {sf}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Projects Table */}
      <motion.div variants={item}>
        {filteredProjects.length > 0 ? (
          <div
            className="bg-card border border-border rounded-xl overflow-hidden"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)" }}
          >
            <table className="w-full">
              <thead>
                <tr className="bg-accent/30 border-b border-border">
                  <th className="text-left px-6 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                    Project
                  </th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                    Client
                  </th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                    Progress
                  </th>
                  <th className="text-right px-4 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                    Value
                  </th>
                  <th className="text-left px-4 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                    Timeline
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project, index) => {
                  const pct =
                    project.estimatedHours > 0
                      ? Math.min(100, Math.round((project.hours / project.estimatedHours) * 100))
                      : 0;
                  const sc = statusColors[project.status] || statusColors["In Progress"];

                  return (
                    <motion.tr
                      key={`${project.clientId}-${project.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 + index * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/projects/${project.clientId}/${project.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="text-[14px]" style={{ fontWeight: 500 }}>
                          {project.name}
                        </div>
                        {project.description && (
                          <div className="text-[12px] text-muted-foreground truncate max-w-[240px] mt-0.5">
                            {project.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] text-primary" style={{ fontWeight: 600 }}>
                              {project.clientName?.charAt(0)}
                            </span>
                          </div>
                          <span className="text-[13px] text-muted-foreground">{project.clientName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded-full ${sc.bg} ${sc.text}`}
                          style={{ fontWeight: 500 }}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {project.status}
                        </div>
                      </td>
                      <td className="px-4 py-4 min-w-[160px]">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-accent/60 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{
                                background:
                                  pct > 100
                                    ? "#c27272"
                                    : pct >= 90
                                      ? project.status === "Complete"
                                        ? "#a1a1aa"
                                        : "#bfa044"
                                      : "linear-gradient(90deg, #5ea1bf, #7fb8d1)",
                              }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.2 + index * 0.05, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                            />
                          </div>
                          <span
                            className="text-[12px] text-muted-foreground tabular-nums flex-shrink-0"
                            style={{ fontWeight: 500 }}
                          >
                            {project.hours}/{project.estimatedHours}h
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="text-[14px] tabular-nums" style={{ fontWeight: 500 }}>
                          ${(project.totalValue || 0).toLocaleString()}
                        </div>
                        {project.revenue > 0 && (
                          <div className="text-[11px] text-muted-foreground tabular-nums">
                            ${project.revenue.toLocaleString()} earned
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-[13px] text-muted-foreground">
                          {project.startDate}
                          {project.endDate ? ` \u2014 ${project.endDate}` : ""}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="bg-card border border-border rounded-xl p-12 text-center"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)" }}
          >
            <div className="w-12 h-12 rounded-xl bg-accent/60 flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-[16px] mb-1" style={{ fontWeight: 600 }}>
              {searchQuery || statusFilter || clientFilter ? "No matching projects" : "No projects yet"}
            </div>
            <p className="text-[14px] text-muted-foreground mb-6">
              {searchQuery || statusFilter || clientFilter
                ? "Try adjusting your filters"
                : "Create your first project to start tracking scope and budget"}
            </p>
            {!searchQuery && !statusFilter && !clientFilter && (
              <button
                onClick={() => setShowProjectModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[14px] rounded-lg hover:bg-primary/90 transition-all"
                style={{ fontWeight: 500 }}
              >
                <Plus className="w-4 h-4" />
                Add project
              </button>
            )}
          </div>
        )}
      </motion.div>

      <AddProjectModal
        open={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSave={handleAddProject}
        clients={clients}
      />
      <LimitEnforcementModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitKey="projectsPerClient"
        currentCount={limitModalCount}
        resourceLabel={`active projects for ${limitModalClientName}`}
        actionLabel={`add another project to ${limitModalClientName}`}
      />
    </motion.div>
  );
}
