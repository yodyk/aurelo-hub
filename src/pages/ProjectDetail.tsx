import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  ChevronLeft,
  ChevronDown,
  Clock,
  DollarSign,
  TrendingUp,
  Flame,
  Plus,
  Check,
  Circle,
  Trash2,
  FolderKanban,
  CalendarDays,
  FileText,
  Upload,
  Download,
  Loader2,
  StickyNote,
  BarChart3,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Target,
  Zap,
  Activity,
  Pencil,
  X,
  ExternalLink,
  Link2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useData } from "../data/DataContext";
import { usePlan } from "../data/PlanContext";
import * as dataApi from "../data/dataApi";
import ClientNotes from "../components/ClientNotes";

// ── Constants ──────────────────────────────────────────────────────

const BLUE = "#5ea1bf";
const GOLD = "#bfa044";
const RED = "#c27272";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const statusOptions = ["Not Started", "In Progress", "On Hold", "Complete"] as const;

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  "In Progress": { bg: "bg-primary/8", text: "text-primary", dot: "bg-primary" },
  "Not Started": {
    bg: "bg-stone-100 dark:bg-stone-800",
    text: "text-stone-600 dark:text-stone-400",
    dot: "bg-stone-400",
  },
  "On Hold": { bg: "bg-stone-100 dark:bg-stone-800", text: "text-stone-500 dark:text-stone-400", dot: "bg-stone-400" },
  Complete: { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-500 dark:text-zinc-400", dot: "bg-zinc-400" },
};

// ── Link type configs ──────────────────────────────────────────────

interface ExternalLink {
  id: string;
  label: string;
  url: string;
  type: string;
}

const LINK_TYPES: { value: string; label: string; icon: string; color: string }[] = [
  { value: "google-drive", label: "Google Drive", icon: "📁", color: "#4285F4" },
  { value: "dropbox", label: "Dropbox", icon: "📦", color: "#0061FF" },
  { value: "figma", label: "Figma", icon: "🎨", color: "#A259FF" },
  { value: "notion", label: "Notion", icon: "📝", color: "#000000" },
  { value: "github", label: "GitHub", icon: "🐙", color: "#333333" },
  { value: "miro", label: "Miro", icon: "🟡", color: "#FFD02F" },
  { value: "slack", label: "Slack", icon: "💬", color: "#4A154B" },
  { value: "other", label: "Other", icon: "🔗", color: "#666666" },
];

function detectLinkType(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("drive.google") || u.includes("docs.google")) return "google-drive";
  if (u.includes("dropbox.com")) return "dropbox";
  if (u.includes("figma.com")) return "figma";
  if (u.includes("notion.")) return "notion";
  if (u.includes("github.com")) return "github";
  if (u.includes("miro.com")) return "miro";
  if (u.includes("slack.com")) return "slack";
  return "other";
}

function getLinkTypeConfig(type: string) {
  return LINK_TYPES.find((t) => t.value === type) || LINK_TYPES[LINK_TYPES.length - 1];
}

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(d: string | undefined): string {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function daysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const now = new Date();
    return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

// ── Tab type ───────────────────────────────────────────────────────

type TabId = "overview" | "work" | "notes";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "work", label: "Work", icon: Clock },
  { id: "notes", label: "Notes & Docs", icon: StickyNote },
];

// ── Main Component ─────────────────────────────────────────────────

export default function ProjectDetail() {
  const { clientId, projectId } = useParams();
  const navigate = useNavigate();
  const { clients, sessions, allProjects, loadAllProjects, loadProjectsForClient, updateProject } = useData();
  const { can } = usePlan();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Editing states
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  // Milestones
  const [newMilestone, setNewMilestone] = useState("");
  const [addingMilestone, setAddingMilestone] = useState(false);

  // External links
  const [addingLink, setAddingLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");

  const client = clients.find((c: any) => c.id === clientId);

  // Load project data
  useEffect(() => {
    if (!clientId) return;
    let mounted = true;

    loadAllProjects().catch(() => {});

    Promise.all([loadProjectsForClient(clientId), dataApi.loadFiles(clientId)])
      .then(([loadedProjects, loadedFiles]) => {
        if (!mounted) return;
        setProjects(loadedProjects);
        const found = loadedProjects.find((p: any) => String(p.id) === String(projectId));
        setProject(found || null);
        setFiles(loadedFiles);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load project detail:", err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [clientId, projectId, loadProjectsForClient, loadAllProjects]);

  // Close status menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────

  const projectSessions = useMemo(() => {
    return sessions
      .filter((s: any) => s.clientId === clientId && String(s.projectId) === String(projectId))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, clientId, projectId]);

  const allProjectsFlat = useMemo(() => {
    if (allProjects.length > 0) return allProjects;
    return projects.map((p) => ({ ...p, clientId }));
  }, [allProjects, projects, clientId]);

  const budgetData = useMemo(() => {
    if (!project) return null;
    const hoursLogged = project.hours || 0;
    const estimatedHours = project.estimatedHours || 0;
    const totalValue = project.totalValue || 0;
    const revenueEarned = project.revenue || 0;
    const rate = client?.rate || 0;
    const hoursPct = estimatedHours > 0 ? Math.round((hoursLogged / estimatedHours) * 100) : 0;
    const budgetPct = totalValue > 0 ? Math.round((revenueEarned / totalValue) * 100) : 0;
    const effectiveRate = hoursLogged > 0 ? Math.round(revenueEarned / hoursLogged) : rate;
    const hoursRemaining = Math.max(0, estimatedHours - hoursLogged);
    const budgetRemaining = Math.max(0, totalValue - revenueEarned);

    let burnRate = 0;
    let projectedEnd: string | null = null;
    if (project.startDate && hoursLogged > 0) {
      const start = new Date(project.startDate);
      const now = new Date();
      const daysElapsed = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      burnRate = Math.round((hoursLogged / daysElapsed) * 10) / 10;
      if (burnRate > 0 && hoursRemaining > 0) {
        const daysToFinish = Math.ceil(hoursRemaining / burnRate);
        const projDate = new Date(now.getTime() + daysToFinish * 24 * 60 * 60 * 1000);
        projectedEnd = projDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }
    }

    return {
      hoursLogged,
      estimatedHours,
      totalValue,
      revenueEarned,
      hoursPct,
      budgetPct,
      effectiveRate,
      hoursRemaining,
      budgetRemaining,
      burnRate,
      projectedEnd,
      rate,
    };
  }, [project, client]);

  const insights = useMemo(() => {
    if (!project || !budgetData) return null;
    const completedProjects = allProjectsFlat.filter((p: any) => p.status === "Complete" && p.hours > 0);

    const avgRate =
      completedProjects.length > 0
        ? Math.round(
            completedProjects.reduce((s: number, p: any) => s + (p.revenue || 0) / (p.hours || 1), 0) /
              completedProjects.length,
          )
        : budgetData.rate;
    const rateVsAvg = budgetData.effectiveRate - avgRate;

    const avgOverrun =
      completedProjects.length > 0
        ? Math.round(
            completedProjects.reduce((s: number, p: any) => {
              const est = p.estimatedHours || 1;
              return s + (((p.hours || 0) - est) / est) * 100;
            }, 0) / completedProjects.length,
          )
        : 0;

    let weeklyPace = 0;
    if (project.startDate && budgetData.hoursLogged > 0) {
      const start = new Date(project.startDate);
      const now = new Date();
      const weeksElapsed = Math.max(1, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
      weeklyPace = Math.round((budgetData.hoursLogged / weeksElapsed) * 10) / 10;
    }

    const daysLeft = daysUntil(project.endDate);
    let deadlineRisk: "low" | "medium" | "high" = "low";
    if (daysLeft !== null && budgetData.hoursRemaining > 0) {
      const hoursPerDay = budgetData.burnRate || 1;
      const daysNeeded = Math.ceil(budgetData.hoursRemaining / hoursPerDay);
      if (daysNeeded > daysLeft * 1.2) deadlineRisk = "high";
      else if (daysNeeded > daysLeft * 0.8) deadlineRisk = "medium";
    }

    return {
      avgRate,
      rateVsAvg,
      avgOverrun,
      weeklyPace,
      daysLeft,
      deadlineRisk,
      completedCount: completedProjects.length,
    };
  }, [project, budgetData, allProjectsFlat]);

  const milestones: { id: string; text: string; completed: boolean }[] = project?.milestones || [];
  const externalLinks: ExternalLink[] = project?.externalLinks || [];

  // ── Handlers ─────────────────────────────────────────────────────

  const handleUpdateProject = async (updates: any) => {
    if (!clientId || !projectId) return;
    try {
      await updateProject(clientId, projectId, updates);
      setProject((prev: any) => ({ ...prev, ...updates }));
    } catch (err) {
      console.error("Failed to update project:", err);
      toast.error("Failed to update project");
    }
  };

  const handleSaveName = async () => {
    if (editName.trim() && editName !== project?.name) {
      await handleUpdateProject({ name: editName.trim() });
      toast.success("Project name updated");
    }
    setEditingName(false);
  };

  const handleSaveDescription = async () => {
    await handleUpdateProject({ description: editDescription.trim() });
    toast.success("Description updated");
    setEditingDescription(false);
  };

  const handleStatusChange = async (status: string) => {
    await handleUpdateProject({ status });
    setShowStatusMenu(false);
    toast.success(`Status changed to ${status}`);
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.trim()) return;
    const updated = [...milestones, { id: Date.now().toString(), text: newMilestone.trim(), completed: false }];
    await handleUpdateProject({ milestones: updated });
    setNewMilestone("");
    setAddingMilestone(false);
    toast.success("Milestone added");
  };

  const handleToggleMilestone = async (id: string) => {
    const updated = milestones.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m));
    await handleUpdateProject({ milestones: updated });
  };

  const handleDeleteMilestone = async (id: string) => {
    const updated = milestones.filter((m) => m.id !== id);
    await handleUpdateProject({ milestones: updated });
    toast.success("Milestone removed");
  };

  const handleAddLink = async () => {
    if (!newLinkUrl.trim()) return;
    let url = newLinkUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    const type = detectLinkType(url);
    const config = getLinkTypeConfig(type);
    const link: ExternalLink = {
      id: Date.now().toString(),
      label: newLinkLabel.trim() || config.label,
      url,
      type,
    };
    const updated = [...externalLinks, link];
    await handleUpdateProject({ externalLinks: updated });
    setNewLinkUrl("");
    setNewLinkLabel("");
    setAddingLink(false);
    toast.success("Link added");
  };

  const handleDeleteLink = async (id: string) => {
    const updated = externalLinks.filter((l) => l.id !== id);
    await handleUpdateProject({ externalLinks: updated });
    toast.success("Link removed");
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clientId) return;
    setUploading(true);
    try {
      const saved = await dataApi.uploadFile(clientId, file);
      setFiles((prev) => [...prev, saved]);
      toast.success("File uploaded");
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Loading / Not Found ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="text-center text-muted-foreground py-24">
          <div className="w-12 h-12 rounded-xl bg-accent/60 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-[16px] mb-1" style={{ fontWeight: 500 }}>
            Project not found
          </div>
          <Link to="/projects" className="text-[14px] text-primary hover:text-primary/80 mt-2 inline-block">
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  const sc = statusColors[project.status] || statusColors["In Progress"];
  const completedMilestones = milestones.filter((m) => m.completed).length;
  const milestonePct = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

  // ── Render ───────────────────────────────────────────────────────

  return (
    <motion.div className="max-w-7xl mx-auto px-6 lg:px-12 py-10" variants={container} initial="hidden" animate="show">
      {/* Back link */}
      <motion.div variants={item} className="mb-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontWeight: 500 }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to projects
        </Link>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* HEADER                                                      */}
      {/* ════════════════════════════════════════════════════════════ */}
      <motion.div variants={item} className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Project name */}
            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  className="text-[24px] tracking-tight bg-transparent border-b-2 border-primary/40 focus:border-primary outline-none py-0.5 w-full"
                  style={{ fontWeight: 600 }}
                />
                <button onClick={handleSaveName} className="p-1 rounded hover:bg-accent/60 text-primary">
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="p-1 rounded hover:bg-accent/60 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h1
                className="text-[24px] tracking-tight mb-2 cursor-pointer hover:text-primary/80 transition-colors group flex items-center gap-2"
                style={{ fontWeight: 600 }}
                onClick={() => {
                  setEditName(project.name);
                  setEditingName(true);
                }}
              >
                {project.name}
                <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </h1>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-3 flex-wrap">
              {client && (
                <Link
                  to={`/clients/${clientId}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/40 hover:bg-accent/60 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  <div className="w-5 h-5 rounded bg-primary/8 flex items-center justify-center">
                    <span className="text-[9px] text-primary" style={{ fontWeight: 600 }}>
                      {client.name?.charAt(0)}
                    </span>
                  </div>
                  {client.name}
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </Link>
              )}

              {/* Status dropdown */}
              <div className="relative" ref={statusRef}>
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] ${sc.bg} ${sc.text} cursor-pointer hover:opacity-80 transition-opacity`}
                  style={{ fontWeight: 500 }}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {project.status}
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {showStatusMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl overflow-hidden z-30 min-w-[140px]"
                      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
                    >
                      {statusOptions.map((status) => {
                        const ssc = statusColors[status];
                        return (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(status)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-accent/40 transition-colors ${project.status === status ? "bg-accent/30" : ""}`}
                            style={{ fontWeight: 500 }}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${ssc.dot}`} />
                            {status}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" />
                {formatDate(project.startDate)}
                {project.endDate && (
                  <>
                    <span className="mx-0.5">—</span>
                    {formatDate(project.endDate)}
                  </>
                )}
              </div>

              {project.endDate &&
                project.status !== "Complete" &&
                (() => {
                  const d = daysUntil(project.endDate);
                  if (d === null) return null;
                  return (
                    <span
                      className={`text-[12px] px-2 py-0.5 rounded-full ${d < 0 ? "bg-[#c27272]/10 text-[#c27272]" : d <= 7 ? "bg-[#bfa044]/10 text-[#bfa044]" : "bg-accent/40 text-muted-foreground"}`}
                      style={{ fontWeight: 500 }}
                    >
                      {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Due today" : `${d}d left`}
                    </span>
                  );
                })()}
            </div>

            {/* Description */}
            {editingDescription ? (
              <div className="mt-3">
                <textarea
                  autoFocus
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-[14px] text-muted-foreground bg-transparent border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={2}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveDescription}
                    className="px-3 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-lg"
                    style={{ fontWeight: 500 }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingDescription(false)}
                    className="px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground rounded-lg"
                    style={{ fontWeight: 500 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p
                className="text-[14px] text-muted-foreground mt-2 cursor-pointer hover:text-foreground/70 transition-colors"
                onClick={() => {
                  setEditDescription(project.description || "");
                  setEditingDescription(true);
                }}
              >
                {project.description || "Add a description..."}
              </p>
            )}

            {/* External links — inline row */}
            {(externalLinks.length > 0 || addingLink) && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {externalLinks.map((link) => {
                  const config = getLinkTypeConfig(link.type);
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-accent/40 text-[12px] transition-all"
                      style={{ fontWeight: 500 }}
                    >
                      <span className="text-[13px]">{config.icon}</span>
                      <span className="text-foreground">{link.label}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteLink(link.id);
                        }}
                        className="ml-0.5 opacity-0 group-hover/link:opacity-100 p-0.5 rounded hover:bg-accent/60 text-muted-foreground hover:text-[#c27272] transition-all"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </a>
                  );
                })}
              </div>
            )}

            {/* Add link UI */}
            {addingLink ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  autoFocus
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="Paste URL (Dropbox, Google Drive, Figma...)"
                  className="flex-1 text-[13px] px-3 py-1.5 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddLink();
                    if (e.key === "Escape") setAddingLink(false);
                  }}
                />
                <input
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  placeholder="Label (optional)"
                  className="w-36 text-[13px] px-3 py-1.5 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddLink();
                  }}
                />
                <button
                  onClick={handleAddLink}
                  disabled={!newLinkUrl.trim()}
                  className="p-1.5 rounded-lg hover:bg-accent/60 text-primary disabled:opacity-40"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setAddingLink(false);
                    setNewLinkUrl("");
                    setNewLinkLabel("");
                  }}
                  className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingLink(true)}
                className="mt-2 inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary transition-colors"
                style={{ fontWeight: 500 }}
              >
                <Link2 className="w-3 h-3" />
                Add shared link
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* TAB BAR                                                     */}
      {/* ════════════════════════════════════════════════════════════ */}
      <motion.div variants={item} className="mb-6">
        <div className="flex items-center gap-1 border-b border-border">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-[13px] transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ fontWeight: isActive ? 600 : 500 }}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="project-tab-indicator"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-foreground rounded-t"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* TAB: OVERVIEW                                               */}
      {/* ════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Summary Cards */}
            {budgetData && (
              <div className="grid grid-cols-4 gap-4 mb-8">
                <div
                  className="bg-card border border-border rounded-xl p-5"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-accent/60 flex items-center justify-center">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Budget
                    </span>
                  </div>
                  <div className="text-[24px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 700 }}>
                    ${budgetData.revenueEarned.toLocaleString()}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-1 tabular-nums">
                    of ${budgetData.totalValue.toLocaleString()} · {budgetData.budgetPct}%
                  </div>
                </div>
                <div
                  className="bg-card border border-border rounded-xl p-5"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-accent/60 flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Hours
                    </span>
                  </div>
                  <div className="text-[24px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 700 }}>
                    {budgetData.hoursLogged}h
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-1 tabular-nums">
                    of {budgetData.estimatedHours}h ·{" "}
                    <span
                      style={{
                        color: budgetData.hoursPct > 100 ? RED : budgetData.hoursPct > 85 ? GOLD : BLUE,
                        fontWeight: 500,
                      }}
                    >
                      {budgetData.hoursPct}%
                    </span>
                  </div>
                </div>
                <div
                  className="bg-card border border-border rounded-xl p-5"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-accent/60 flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Effective rate
                    </span>
                  </div>
                  <div
                    className="text-[24px] leading-none tracking-tight tabular-nums"
                    style={{ fontWeight: 700, color: BLUE }}
                  >
                    ${budgetData.effectiveRate}/h
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-1">Client rate: ${budgetData.rate}/h</div>
                </div>
                <div
                  className="bg-card border border-border rounded-xl p-5"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-accent/60 flex items-center justify-center">
                      <Flame className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Burn rate
                    </span>
                  </div>
                  <div className="text-[24px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 700 }}>
                    {budgetData.burnRate}h/d
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-1">
                    {budgetData.hoursRemaining > 0 ? `${budgetData.hoursRemaining}h remaining` : "Estimate complete"}
                  </div>
                </div>
              </div>
            )}

            {/* Budget Health */}
            {budgetData && budgetData.totalValue > 0 && (
              <div
                className="bg-card border border-border rounded-xl p-6 mb-8"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[14px]" style={{ fontWeight: 600 }}>
                    Budget health
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
                        Hours consumed
                      </span>
                      <span
                        className="text-[13px] tabular-nums"
                        style={{
                          fontWeight: 600,
                          color: budgetData.hoursPct > 100 ? RED : budgetData.hoursPct > 85 ? GOLD : BLUE,
                        }}
                      >
                        {budgetData.hoursPct}%
                      </span>
                    </div>
                    <div className="h-2 bg-accent/60 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: budgetData.hoursPct > 100 ? RED : budgetData.hoursPct > 85 ? GOLD : BLUE,
                          opacity: 0.6,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(budgetData.hoursPct, 100)}%` }}
                        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1.5 tabular-nums">
                      {budgetData.hoursLogged}h of {budgetData.estimatedHours}h
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
                        Revenue earned
                      </span>
                      <span className="text-[13px] tabular-nums" style={{ fontWeight: 600, color: BLUE }}>
                        {budgetData.budgetPct}%
                      </span>
                    </div>
                    <div className="h-2 bg-accent/60 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: BLUE, opacity: 0.6 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(budgetData.budgetPct, 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1.5 tabular-nums">
                      ${budgetData.revenueEarned.toLocaleString()} of ${budgetData.totalValue.toLocaleString()}
                    </div>
                  </div>
                </div>

                {budgetData.projectedEnd && project.status !== "Complete" && (
                  <div className="mt-5 pt-5 border-t border-border flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
                        Projected finish
                      </span>
                      <span className="text-[13px]" style={{ fontWeight: 600 }}>
                        {budgetData.projectedEnd}
                      </span>
                    </div>
                    {project.endDate &&
                      (() => {
                        const deadline = new Date(project.endDate);
                        const projected = new Date(budgetData.projectedEnd!);
                        const diff = Math.ceil((projected.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <span
                            className={`inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full ${diff > 0 ? "bg-[#c27272]/10 text-[#c27272]" : "bg-[#5ea1bf]/10 text-[#5ea1bf]"}`}
                            style={{ fontWeight: 500 }}
                          >
                            {diff > 0 ? (
                              <>
                                <AlertTriangle className="w-3 h-3" />
                                {diff}d past deadline
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3" />
                                {Math.abs(diff)}d ahead
                              </>
                            )}
                          </span>
                        );
                      })()}
                  </div>
                )}
              </div>
            )}

            {/* Project Insights */}
            <div className="relative mb-8">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-[14px]" style={{ fontWeight: 600 }}>
                  Project insights
                </span>
              </div>

              {!can("fullInsights") && (
                <div
                  className="absolute inset-0 z-10 backdrop-blur-sm bg-background/40 rounded-xl flex items-center justify-center"
                  style={{ top: 32 }}
                >
                  <div
                    className="bg-card border border-border rounded-xl p-6 text-center max-w-sm"
                    style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#5ea1bf]/10 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-5 h-5 text-[#5ea1bf]" />
                    </div>
                    <h3 className="text-[15px] mb-1" style={{ fontWeight: 600 }}>
                      Unlock project insights
                    </h3>
                    <p className="text-[13px] text-muted-foreground mb-4">
                      See how this project compares, deadline risk analysis, and profitability forecasting.
                    </p>
                    <button
                      onClick={() => navigate("/settings?tab=billing")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[13px] rounded-lg hover:opacity-90 transition-all"
                      style={{ fontWeight: 500 }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Upgrade to Pro
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div
                  className="bg-card border border-border rounded-xl p-5"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 600 }}>
                      Rate comparison
                    </span>
                  </div>
                  <div className="text-[22px] leading-none tabular-nums mb-1" style={{ fontWeight: 700, color: BLUE }}>
                    ${insights?.avgRate || budgetData?.rate || 0}/h
                  </div>
                  <div className="text-[12px] text-muted-foreground">Portfolio average</div>
                  {insights && insights.rateVsAvg !== 0 && (
                    <div
                      className={`mt-3 inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full ${insights.rateVsAvg > 0 ? "bg-[#5ea1bf]/10 text-[#5ea1bf]" : "bg-[#c27272]/10 text-[#c27272]"}`}
                      style={{ fontWeight: 500 }}
                    >
                      {insights.rateVsAvg > 0 ? "+" : ""}
                      {insights.rateVsAvg}/h vs avg
                    </div>
                  )}
                </div>
                <div
                  className="bg-card border border-border rounded-xl p-5"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 600 }}>
                      Weekly pace
                    </span>
                  </div>
                  <div className="text-[22px] leading-none tabular-nums mb-1" style={{ fontWeight: 700 }}>
                    {insights?.weeklyPace || 0}h/wk
                  </div>
                  <div className="text-[12px] text-muted-foreground">Current velocity</div>
                  {insights && budgetData && budgetData.hoursRemaining > 0 && insights.weeklyPace > 0 && (
                    <div className="text-[12px] text-muted-foreground mt-3">
                      ~{Math.ceil(budgetData.hoursRemaining / insights.weeklyPace)} weeks to finish
                    </div>
                  )}
                </div>
                <div
                  className="bg-card border border-border rounded-xl p-5"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 600 }}>
                      Deadline risk
                    </span>
                  </div>
                  {(() => {
                    const risk = insights?.deadlineRisk || "low";
                    const rc = {
                      low: { label: "On track", color: BLUE, bg: "bg-[#5ea1bf]/10" },
                      medium: { label: "Watch closely", color: GOLD, bg: "bg-[#bfa044]/10" },
                      high: { label: "At risk", color: RED, bg: "bg-[#c27272]/10" },
                    }[risk];
                    return (
                      <>
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] ${rc.bg}`}
                          style={{ fontWeight: 600, color: rc.color }}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: rc.color }} />
                          {rc.label}
                        </div>
                        {insights?.daysLeft !== null && insights?.daysLeft !== undefined && (
                          <div className="text-[12px] text-muted-foreground mt-3 tabular-nums">
                            {insights.daysLeft < 0
                              ? `${Math.abs(insights.daysLeft)} days past due`
                              : `${insights.daysLeft} days remaining`}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {insights && insights.completedCount > 0 && (
                <div
                  className="mt-4 bg-card border border-border rounded-xl p-5"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[13px]" style={{ fontWeight: 600 }}>
                      Scope creep analysis
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    Across {insights.completedCount} completed projects, the average overrun was{" "}
                    <span
                      style={{
                        fontWeight: 600,
                        color: insights.avgOverrun > 10 ? RED : insights.avgOverrun > 0 ? GOLD : BLUE,
                      }}
                    >
                      {insights.avgOverrun > 0 ? "+" : ""}
                      {insights.avgOverrun}%
                    </span>{" "}
                    over estimate.
                    {budgetData && budgetData.hoursPct > 0 && (
                      <>
                        {" "}
                        This project is currently at <span style={{ fontWeight: 600 }}>{budgetData.hoursPct}%</span> of
                        estimate.
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: WORK                                                   */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === "work" && (
          <motion.div
            key="work"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-2 gap-6">
              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[14px]" style={{ fontWeight: 600 }}>
                      Milestones
                    </span>
                    {milestones.length > 0 && (
                      <span className="text-[12px] text-muted-foreground tabular-nums">
                        ({completedMilestones}/{milestones.length})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setAddingMilestone(true)}
                    className="inline-flex items-center gap-1 text-[12px] text-primary hover:text-primary/80 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                <div
                  className="bg-card border border-border rounded-xl overflow-hidden"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  {milestones.length > 0 && (
                    <div className="px-5 pt-4 pb-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-muted-foreground" style={{ fontWeight: 500 }}>
                          {completedMilestones} of {milestones.length} complete
                        </span>
                        <span
                          className="text-[11px] tabular-nums"
                          style={{ fontWeight: 600, color: milestonePct === 100 ? GOLD : BLUE }}
                        >
                          {milestonePct}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-accent/50 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: milestonePct === 100 ? GOLD : BLUE, opacity: 0.6 }}
                          initial={{ width: 0 }}
                          animate={{ width: `${milestonePct}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="px-4 py-2">
                    {milestones.length === 0 && !addingMilestone && (
                      <div className="py-6 text-center">
                        <p className="text-[13px] text-muted-foreground mb-3">No milestones yet</p>
                        <button
                          onClick={() => setAddingMilestone(true)}
                          className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:text-primary/80"
                          style={{ fontWeight: 500 }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add first milestone
                        </button>
                      </div>
                    )}
                    {milestones.map((m, i) => (
                      <div
                        key={m.id}
                        className={`flex items-center gap-3 py-2.5 group ${i < milestones.length - 1 ? "border-b border-border/50" : ""}`}
                      >
                        <button onClick={() => handleToggleMilestone(m.id)} className="flex-shrink-0">
                          {m.completed ? (
                            <Check className="w-4 h-4 text-[#5ea1bf]" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
                          )}
                        </button>
                        <span
                          className={`text-[13px] flex-1 ${m.completed ? "text-muted-foreground line-through" : ""}`}
                          style={{ fontWeight: 500 }}
                        >
                          {m.text}
                        </span>
                        <button
                          onClick={() => handleDeleteMilestone(m.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent/60 text-muted-foreground hover:text-[#c27272] transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {addingMilestone && (
                      <div className="flex items-center gap-2 py-2">
                        <Circle className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                        <input
                          autoFocus
                          value={newMilestone}
                          onChange={(e) => setNewMilestone(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddMilestone();
                            if (e.key === "Escape") {
                              setAddingMilestone(false);
                              setNewMilestone("");
                            }
                          }}
                          placeholder="Milestone name..."
                          className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-muted-foreground/50"
                          style={{ fontWeight: 500 }}
                        />
                        <button onClick={handleAddMilestone} className="p-1 rounded hover:bg-accent/60 text-primary">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setAddingMilestone(false);
                            setNewMilestone("");
                          }}
                          className="p-1 rounded hover:bg-accent/60 text-muted-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Session History */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[14px]" style={{ fontWeight: 600 }}>
                    Session history
                  </span>
                  <span className="text-[12px] text-muted-foreground tabular-nums">({projectSessions.length})</span>
                </div>
                <div
                  className="bg-card border border-border rounded-xl overflow-hidden"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                >
                  {projectSessions.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-[13px] text-muted-foreground">No sessions logged to this project yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50 max-h-[420px] overflow-y-auto">
                      {projectSessions.slice(0, 25).map((session: any) => (
                        <div key={session.id} className="px-5 py-3 hover:bg-accent/20 transition-colors">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[13px] truncate flex-1 pr-3" style={{ fontWeight: 500 }}>
                              {session.task || session.description || "Work session"}
                            </span>
                            <span className="text-[13px] tabular-nums flex-shrink-0" style={{ fontWeight: 600 }}>
                              {session.duration}h
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">
                              {session.date ? formatDate(session.date) : "—"}
                            </span>
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                              {session.billable ? `$${(session.revenue || 0).toLocaleString()}` : "Non-billable"}
                            </span>
                          </div>
                          {session.workTags && session.workTags.length > 0 && (
                            <div className="flex gap-1 mt-1.5">
                              {session.workTags.map((tag: string) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-accent/40 text-muted-foreground"
                                  style={{ fontWeight: 500 }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: NOTES & DOCS                                          */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === "notes" && (
          <motion.div
            key="notes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Full ClientNotes — filtered to this project, bidirectional */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <StickyNote className="w-4 h-4 text-muted-foreground" />
                <span className="text-[14px]" style={{ fontWeight: 600 }}>
                  Project notes
                </span>
              </div>
              {clientId && (
                <ClientNotes
                  clientId={clientId}
                  projects={projects}
                  filterProjectId={projectId}
                  filterProjectName={project?.name}
                />
              )}
            </div>

            {/* Files */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[14px]" style={{ fontWeight: 600 }}>
                    Files & documents
                  </span>
                  <span className="text-[12px] text-muted-foreground tabular-nums">({files.length})</span>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1 text-[12px] text-primary hover:text-primary/80 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  Upload
                </button>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadFile} />
              <div
                className="bg-card border border-border rounded-xl overflow-hidden"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
              >
                {files.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileText className="w-5 h-5 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-[13px] text-muted-foreground mb-3">No files uploaded</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:text-primary/80"
                      style={{ fontWeight: 500 }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload a file
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {files.map((file: any) => (
                      <div
                        key={file.name || file.fileName}
                        className="px-5 py-3 flex items-center justify-between hover:bg-accent/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>
                              {file.name || file.fileName}
                            </div>
                            {file.size && (
                              <div className="text-[11px] text-muted-foreground">
                                {(file.size / 1024).toFixed(1)} KB
                              </div>
                            )}
                          </div>
                        </div>
                        {file.url && (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
