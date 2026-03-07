import { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@radix-ui/react-tooltip";
import { useParams, Link, useNavigate, useSearchParams } from "react-router";
import {
  ChevronLeft,
  FileText,
  Lightbulb,
  StickyNote,
  ExternalLink,
  Link2,
  AlertTriangle,
  Copy,
  Check,
  Upload,
  Globe,
  Mail,
  Loader2,
  Trash2,
  Download,
  Pencil,
  CheckSquare,
  Square,
  Send,
  Flag,
  ShieldAlert,
  FolderOpen,
  Settings as SettingsIcon,
  LayoutDashboard,
  Phone,
  MapPin,
  ClipboardList,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useData } from "../data/DataContext";
import { useAuth } from "@/data/AuthContext";
import { NotificationEvents } from "@/data/notificationsApi";
import { LogSessionModal, AddProjectModal, EditSessionModal } from "../components/Modals";
import * as dataApi from "../data/dataApi";
import * as portalApi from "../data/portalApi";
import ClientNotes from "../components/ClientNotes";
import EmailActivityLog from "../components/EmailActivityLog";
import BulkSessionActions from "../components/BulkSessionActions";
import { supabase } from "@/integrations/supabase/client";
import * as settingsApi from "@/data/settingsApi";
import { usePlan } from "@/data/PlanContext";
import { useRoleAccess } from "@/data/useRoleAccess";

// ── Animation variants ──────────────────────────────────────────────
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

// ── Helpers ─────────────────────────────────────────────────────────
function getUsageBarColor(usagePct: number): string {
  if (usagePct >= 85) return "#c27272";
  if (usagePct >= 70) return "#bfa044";
  return "linear-gradient(90deg, #5ea1bf, #7fb8d1)";
}

function getUsageTextColor(usagePct: number): string {
  if (usagePct >= 85) return "#c27272";
  if (usagePct >= 70) return "#bfa044";
  return "#5ea1bf";
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  low: { color: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--accent))', icon: '○' },
  medium: { color: 'hsl(45 60% 50%)', bg: 'hsl(45 60% 50% / 0.1)', icon: '◑' },
  high: { color: 'hsl(var(--destructive))', bg: 'hsl(var(--destructive) / 0.1)', icon: '●' },
};

const RISK_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  low: { color: 'hsl(142 71% 45%)', bg: 'hsl(142 71% 45% / 0.1)', icon: '✓' },
  medium: { color: 'hsl(45 60% 50%)', bg: 'hsl(45 60% 50% / 0.1)', icon: '⚠' },
  high: { color: 'hsl(var(--destructive))', bg: 'hsl(var(--destructive) / 0.1)', icon: '✕' },
};

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  Active: { bg: "bg-primary/8", text: "text-primary", dot: "bg-primary" },
  Prospect: { bg: "bg-stone-100", text: "text-stone-500", dot: "bg-stone-400" },
  Archived: { bg: "bg-zinc-100", text: "text-zinc-500", dot: "bg-zinc-400" },
};

// ── Tab definitions ─────────────────────────────────────────────────
type TabId = "overview" | "details" | "projects" | "sessions" | "retainer" | "files" | "notes" | "portal" | "settings";

function getTabsForClient(client: any, canViewFinancials: boolean): { id: TabId; label: string; icon: any }[] {
  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "details", label: "Details", icon: ClipboardList },
    { id: "projects", label: "Projects", icon: FileText },
    {
      id: "sessions",
      label: "Sessions",
      icon: ({ className }: { className?: string }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];
  if (canViewFinancials && client?.model === "Retainer") {
    tabs.push({
      id: "retainer",
      label: "Retainer",
      icon: ({ className }: { className?: string }) => (
        <div className={`w-4 h-4 rounded bg-primary/20 flex items-center justify-center ${className || ""}`}>
          <div className="w-2 h-2 rounded-sm bg-primary" />
        </div>
      ),
    });
  }
  tabs.push(
    { id: "files", label: "Files", icon: FolderOpen },
    { id: "notes", label: "Notes", icon: StickyNote },
    { id: "portal", label: "Portal", icon: Link2 },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  );
  return tabs;
}

// ── SectionCard (reused in tabs) ────────────────────────────────────
function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-card border border-border rounded-xl p-5 md:p-6 ${className}`}
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════
export default function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workspaceId, clients, sessions, updateClient, addSession, updateSession, deleteSession, getProjects, loadProjectsForClient, addProject, netMultiplier, workCategoryNames } =
    useData();
  const { user } = useAuth();
  const { isAtLeast } = usePlan();
  const { canViewFinancials } = useRoleAccess();
  const [viewMode, setViewMode] = useState<"gross" | "net">("gross");

  // Modal states
  const [showLogModal, setShowLogModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Files
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Projects
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  // Confirm archive
  const [confirmArchive, setConfirmArchive] = useState(false);

  // Edit session
  const [editingSession, setEditingSession] = useState<any>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Portal
  const [portalConfig, setPortalConfig] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null);
  const [clientFaviconUrl, setClientFaviconUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Retainer warning thresholds
  const [sentThresholds, setSentThresholds] = useState<Record<number, { sentAt: string; notificationId: string }>>({});
  const [resending, setResending] = useState<number | null>(null);
  const [sendingManualUpdate, setSendingManualUpdate] = useState(false);
  const [confirmSendUpdate, setConfirmSendUpdate] = useState(false);
  const [emailStatuses, setEmailStatuses] = useState<Record<string, { event_type: string; created_at: string }>>({});

  const client = clients.find((c) => c.id === clientId);

  // Tab state
  const visibleTabs = useMemo(() => getTabsForClient(client, canViewFinancials), [client, canViewFinancials]);
  const initialTab = (searchParams.get("tab") as TabId) || "overview";
  const [activeTab, setActiveTab] = useState<TabId>(visibleTabs.some(t => t.id === initialTab) ? initialTab : "overview");

  const handleTabChange = (tab: TabId) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSearchParams(tab === "overview" ? {} : { tab }, { replace: true });
  };

  // Sync URL → state
  useEffect(() => {
    const urlTab = searchParams.get("tab") as TabId;
    if (urlTab && visibleTabs.some(t => t.id === urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  // Helper to get delivery status
  const getDeliveryStatus = (notificationId: string | undefined) => {
    if (!notificationId) return null;
    const status = emailStatuses[notificationId];
    if (!status) return { label: 'Sent', color: 'hsl(var(--muted-foreground))', icon: '→' };
    const map: Record<string, { label: string; color: string; icon: string }> = {
      sent: { label: 'Sent', color: 'hsl(var(--muted-foreground))', icon: '→' },
      delivered: { label: 'Delivered', color: 'hsl(142 71% 45%)', icon: '✓' },
      opened: { label: 'Opened', color: 'hsl(var(--primary))', icon: '👁' },
      bounced: { label: 'Bounced', color: 'hsl(var(--destructive))', icon: '✕' },
      complained: { label: 'Complained', color: 'hsl(var(--destructive))', icon: '⚠' },
      delayed: { label: 'Delayed', color: 'hsl(45 60% 50%)', icon: '⏳' },
      clicked: { label: 'Clicked', color: 'hsl(var(--primary))', icon: '↗' },
    };
    return map[status.event_type] || { label: status.event_type, color: 'hsl(var(--muted-foreground))', icon: '?' };
  };

  // Load files, projects, portal config, client logo
  useEffect(() => {
    if (!clientId) return;
    if (workspaceId) dataApi.loadFiles(workspaceId, clientId).then(setFiles);
    loadProjectsForClient(clientId).then((p) => {
      setProjects(p);
      setProjectsLoaded(true);
    });
    portalApi.getPortalConfig(clientId).then((config) => {
      if (config) setPortalConfig(config);
    });
    if (workspaceId && isAtLeast('studio')) {
      supabase.storage.from('logos').list(workspaceId, { limit: 30 }).then(({ data: files }) => {
        const faviconMatch = files?.find((f: any) => f.name.startsWith(`client-${clientId}-favicon.`));
        if (faviconMatch) {
          setClientFaviconUrl(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${workspaceId}/${faviconMatch.name}`);
        }
        const logoMatch = files?.find((f: any) => f.name.startsWith(`client-${clientId}.`) && !f.name.includes('-favicon'));
        if (logoMatch) {
          setClientLogoUrl(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${workspaceId}/${logoMatch.name}`);
        }
      });
    }
  }, [clientId, loadProjectsForClient, workspaceId, isAtLeast]);

  // Load sent retainer warning thresholds + email delivery statuses
  useEffect(() => {
    if (!clientId || !workspaceId) return;
    supabase
      .from('notifications')
      .select('id, title, created_at, email_sent')
      .eq('workspace_id', workspaceId)
      .eq('event_type', 'retainer_warning')
      .like('title', `%${clients.find(c => c.id === clientId)?.name || ''}%`)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (!data) return;
        const map: Record<number, { sentAt: string; notificationId: string }> = {};
        const notifIds: string[] = [];
        for (const n of data) {
          notifIds.push(n.id);
          const match = n.title.match(/(\d+)%/);
          if (match) {
            const pct = parseInt(match[1]);
            const bucket = pct >= 90 ? 90 : pct >= 85 ? 85 : pct >= 70 ? 70 : null;
            if (bucket && !map[bucket]) map[bucket] = { sentAt: n.created_at, notificationId: n.id };
          }
        }
        setSentThresholds(map);
        if (notifIds.length > 0) {
          const { data: events } = await supabase
            .from('email_events')
            .select('notification_id, event_type, created_at')
            .in('notification_id', notifIds)
            .order('created_at', { ascending: false });
          if (events) {
            const statusMap: Record<string, { event_type: string; created_at: string }> = {};
            for (const ev of events) {
              if (ev.notification_id && !statusMap[ev.notification_id]) {
                statusMap[ev.notification_id] = { event_type: ev.event_type, created_at: ev.created_at };
              }
            }
            setEmailStatuses(statusMap);
          }
        }
      });
  }, [clientId, workspaceId, clients]);

  useEffect(() => {
    if (clientId) {
      const ctxProjects = getProjects(clientId);
      if (ctxProjects.length > 0) setProjects(ctxProjects);
    }
  }, [clientId, getProjects]);

  if (!client) {
    return (
      <div className="w-full min-w-0 max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="text-center text-muted-foreground py-24">
          <div className="text-[48px] mb-4">?</div>
          <div className="text-[16px]" style={{ fontWeight: 500 }}>Client not found</div>
          <Link to="/clients" className="text-[14px] text-primary hover:text-primary/80 mt-2 inline-block">Back to clients</Link>
        </div>
      </div>
    );
  }

  // ── Computed values ─────────────────────────────────────────────
  const clientSessions = sessions.filter((s) => s.clientId === clientId);
  const totalRevenue = clients.filter((c) => c.status === "Active").reduce((s: number, c: any) => s + (c.monthlyEarnings || 0), 0);
  const revenueShare = totalRevenue > 0 ? Math.round(((client.monthlyEarnings || 0) / totalRevenue) * 100) : 0;
  const lastMonthEarnings = Math.round((client.monthlyEarnings || 0) * 0.88);
  const revenueTrend = (client.monthlyEarnings || 0) > lastMonthEarnings ? "up" : (client.monthlyEarnings || 0) < lastMonthEarnings ? "down" : "flat";
  const totalHours = clientSessions.reduce((s: number, sess: any) => s + sess.duration, 0);
  const billableHours = clientSessions.filter((s: any) => s.billable).reduce((s: number, sess: any) => s + sess.duration, 0);
  const utilizationRate = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;

  const priorityLevel = client.priorityLevel || 'medium';
  const riskLevel = client.riskLevel || 'low';
  const priorityCfg = PRIORITY_CONFIG[priorityLevel] || PRIORITY_CONFIG.medium;
  const riskCfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.low;

  // ── Handlers (unchanged) ──────────────────────────────────────
  const handleEditSave = async (updates: any) => {
    await updateClient(client.id, updates);
    toast.success("Client updated");
  };

  const handleLogSession = async (session: any) => {
    await addSession(session);
    toast.success("Session logged");
    if (workspaceId) {
      try {
        const clientName = clients.find(c => c.id === session.clientId)?.name || 'Client';
        const hours = typeof session.duration === 'number' ? session.duration : 0;
        await NotificationEvents.sessionLogged(workspaceId, clientName, hours, { clientId: session.clientId });
      } catch (err) { console.error('[ClientDetail] Failed to create session notification:', err); }
    }
  };

  const handleUpdateSession = async (sessionId: string, updates: any) => {
    await updateSession(sessionId, updates);
    toast.success("Session updated");
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
    toast.success("Session deleted");
  };

  const handleAddProject = async (project: any) => {
    const saved = await addProject(client.id, project);
    setProjects((prev) => [...prev, saved]);
    toast.success("Project added");
  };

  const handleFileUpload = async (file: File) => {
    if (!clientId) return;
    setUploading(true);
    try {
      const result = await dataApi.uploadFile(workspaceId!, clientId, file);
      setFiles((prev) => [...prev, result]);
      toast.success("File uploaded");
    } catch (err: any) { toast.error(err.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const handleFileDelete = async (fileName: string) => {
    if (!clientId) return;
    try {
      await dataApi.deleteFile(workspaceId!, clientId, fileName);
      setFiles((prev) => prev.filter((f) => f.name !== fileName));
      toast.success("File deleted");
    } catch (err: any) { toast.error(err.message || "Delete failed"); }
  };

  const handleArchive = async () => {
    await updateClient(client.id, { status: "Archived" });
    toast.success(`${client.name} archived`);
    navigate("/clients");
  };

  const handleCopyPortalLink = () => {
    if (portalConfig?.token) {
      const portalUrl = `${window.location.origin}/portal/${portalConfig.token}`;
      try {
        const textarea = document.createElement("textarea");
        textarea.value = portalUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (e) { console.error("Copy failed:", e); }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGeneratePortal = async () => {
    if (!clientId) return;
    setPortalLoading(true);
    try {
      const config = await portalApi.generatePortalToken(clientId);
      setPortalConfig(config);
      toast.success("Portal link generated");
    } catch (err: any) { toast.error(err.message || "Failed to generate portal link"); }
    finally { setPortalLoading(false); }
  };

  const handleTogglePortal = async (active: boolean) => {
    if (!clientId) return;
    try {
      const config = await portalApi.togglePortal(clientId, active);
      setPortalConfig(config);
      toast.success(active ? "Portal activated" : "Portal deactivated");
    } catch (err: any) { toast.error(err.message || "Failed to toggle portal"); }
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === clientSessions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(clientSessions.map((s: any) => s.id)));
  };
  const selectedSessions = clientSessions.filter((s: any) => selectedIds.has(s.id));

  const handleBulkExport = () => {
    const rows = selectedSessions.map((s: any) =>
      [s.date, client.name, s.task || "", s.duration, s.revenue, s.billable ? "Yes" : "No"].join(",")
    );
    const csv = ["Date,Client,Task,Duration,Revenue,Billable", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${client.name.replace(/\s+/g, "-")}-sessions.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${selectedSessions.length} sessions exported`);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} sessions?`)) return;
    try {
      for (const id of selectedIds) await deleteSession(id);
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} sessions deleted`);
    } catch (err: any) { toast.error(err.message || "Failed to delete sessions"); }
  };

  const handleBulkInvoice = async () => {
    try {
      const { data: memberData } = await supabase.from('workspace_members').select('workspace_id').limit(1).maybeSingle();
      if (!memberData) throw new Error('No workspace found');
      const wsId = memberData.workspace_id;
      const { data: seqData } = await supabase.from('invoice_sequences').select('next_number').eq('workspace_id', wsId).maybeSingle();
      let nextNum = seqData?.next_number || 1001;
      const number = `INV-${nextNum}`;
      const lineItems = selectedSessions.map((s: any) => ({
        id: crypto.randomUUID(),
        description: `${s.task || "Work session"} (${s.date})`,
        quantity: s.duration,
        rate: s.duration > 0 ? s.revenue / s.duration : 0,
        amount: s.revenue,
        sessionIds: [s.id],
      }));
      const subtotal = lineItems.reduce((sum: number, li: any) => sum + li.amount, 0);
      const { error: insertErr } = await supabase.from('invoices').insert({
        workspace_id: wsId, number, client_id: clientId!, client_name: client.name,
        client_email: client.contactEmail || null, line_items: lineItems as any,
        subtotal, tax_rate: 0, tax_amount: 0, total: subtotal, currency: 'USD',
        status: 'draft', due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        issued_date: new Date().toISOString().split('T')[0], created_from_sessions: Array.from(selectedIds),
      });
      if (insertErr) throw new Error(insertErr.message);
      if (seqData) await supabase.from('invoice_sequences').update({ next_number: nextNum + 1 }).eq('workspace_id', wsId);
      else await supabase.from('invoice_sequences').insert({ workspace_id: wsId, next_number: nextNum + 1 });
      setSelectedIds(new Set());
      toast.success(`Draft invoice ${number} created`);
      navigate("/invoicing");
    } catch (err: any) { toast.error(err.message || "Failed to create invoice"); }
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); };
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════
  return (
    <motion.div className="w-full min-w-0 max-w-6xl mx-auto px-6 lg:px-12 py-6 md:py-12" variants={container} initial="hidden" animate="show">
      {/* Back link */}
      <motion.div variants={item}>
        <Link to="/clients" className="inline-flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground mb-6 transition-colors group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to clients
        </Link>
      </motion.div>

      {/* Client identity bar */}
      <motion.div variants={item} className="mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/8 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
            {clientFaviconUrl ? (
              <img src={clientFaviconUrl} alt={client.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="text-[18px] text-primary" style={{ fontWeight: 600 }}>{client.name.charAt(0)}</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-[20px] md:text-[24px] tracking-tight mb-1" style={{ fontWeight: 600 }}>{client.name}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-2.5 py-0.5 ${statusColors[client.status]?.bg} ${statusColors[client.status]?.text} text-[11px] rounded-full`} style={{ fontWeight: 500 }}>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusColors[client.status]?.dot}`} />
                    {client.status}
                  </div>
                  <div className="text-[12px] text-muted-foreground px-2 py-0.5 bg-accent/60 rounded-full">{client.model}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Inline flag badges */}
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px]" style={{ fontWeight: 600, color: priorityCfg.color, background: priorityCfg.bg }}>
                  <Flag className="w-3 h-3" /> {priorityLevel.charAt(0).toUpperCase() + priorityLevel.slice(1)} Priority
                </span>
                {riskLevel !== 'low' && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px]" style={{ fontWeight: 600, color: riskCfg.color, background: riskCfg.bg }}>
                    <ShieldAlert className="w-3 h-3" /> {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
                  </span>
                )}
                <button
                  onClick={() => navigate(`/clients/${clientId}/edit`)}
                  className="px-3 py-1.5 text-[13px] border border-border rounded-lg hover:bg-accent/40 transition-all"
                  style={{ fontWeight: 500 }}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab layout */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Vertical tab nav */}
        <motion.nav variants={item} className="w-full md:w-48 flex-shrink-0">
          <div className="md:sticky md:top-[80px] flex md:flex-col gap-0.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 border-b md:border-b-0 border-border -mx-6 px-6 md:mx-0 md:px-0">
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-auto md:w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] text-left transition-all duration-200 relative whitespace-nowrap ${
                    isActive ? "bg-primary/8 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="client-tab-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full hidden md:block"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <tab.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </motion.nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeTab === "overview" && (
                <OverviewTab
                  client={client}
                  clientFaviconUrl={clientFaviconUrl}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  netMultiplier={netMultiplier}
                  canViewFinancials={canViewFinancials}
                  revenueShare={revenueShare}
                  revenueTrend={revenueTrend}
                  lastMonthEarnings={lastMonthEarnings}
                  utilizationRate={utilizationRate}
                  billableHours={billableHours}
                  totalHours={totalHours}
                  projects={projects}
                  clientSessions={clientSessions}
                  priorityLevel={priorityLevel}
                  riskLevel={riskLevel}
                  priorityCfg={priorityCfg}
                  riskCfg={riskCfg}
                />
              )}
              {activeTab === "projects" && (
                <ProjectsTab
                  projects={projects}
                  client={client}
                  canViewFinancials={canViewFinancials}
                  onAddProject={() => setShowProjectModal(true)}
                  onNavigate={(pId: string) => navigate(`/projects/${clientId}/${pId}`)}
                />
              )}
              {activeTab === "sessions" && (
                <SessionsTab
                  clientSessions={clientSessions}
                  client={client}
                  canViewFinancials={canViewFinancials}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                  onLogSession={() => setShowLogModal(true)}
                  onEditSession={setEditingSession}
                />
              )}
              {activeTab === "retainer" && (
                <RetainerTab
                  client={client}
                  workspaceId={workspaceId}
                  sentThresholds={sentThresholds}
                  setSentThresholds={setSentThresholds}
                  resending={resending}
                  setResending={setResending}
                  sendingManualUpdate={sendingManualUpdate}
                  setSendingManualUpdate={setSendingManualUpdate}
                  confirmSendUpdate={confirmSendUpdate}
                  setConfirmSendUpdate={setConfirmSendUpdate}
                  emailStatuses={emailStatuses}
                  getDeliveryStatus={getDeliveryStatus}
                />
              )}
              {activeTab === "files" && (
                <FilesTab
                  files={files}
                  uploading={uploading}
                  fileInputRef={fileInputRef}
                  onUpload={handleFileUpload}
                  onDelete={handleFileDelete}
                  onDrop={handleDrop}
                  formatFileSize={formatFileSize}
                />
              )}
              {activeTab === "notes" && (
                <NotesTab clientId={clientId} projects={projects} />
              )}
              {activeTab === "portal" && (
                <PortalTab
                  client={client}
                  clientId={clientId}
                  portalConfig={portalConfig}
                  portalLoading={portalLoading}
                  copied={copied}
                  onCopyPortalLink={handleCopyPortalLink}
                  onGeneratePortal={handleGeneratePortal}
                  onTogglePortal={handleTogglePortal}
                />
              )}
              {activeTab === "settings" && (
                <SettingsTab
                  client={client}
                  clientId={clientId}
                  confirmArchive={confirmArchive}
                  setConfirmArchive={setConfirmArchive}
                  onArchive={handleArchive}
                  onNavigateEdit={() => navigate(`/clients/${clientId}/edit`)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <LogSessionModal open={showLogModal} onClose={() => setShowLogModal(false)} onSave={handleLogSession} clients={clients} preSelectedClient={clientId} />
      <AddProjectModal open={showProjectModal} onClose={() => setShowProjectModal(false)} onSave={handleAddProject} />
      <EditSessionModal open={!!editingSession} onClose={() => setEditingSession(null)} session={editingSession} onSave={handleUpdateSession} onDelete={handleDeleteSession} clients={clients} />
      <BulkSessionActions selectedCount={selectedIds.size} selectedSessions={selectedSessions} onClearSelection={() => setSelectedIds(new Set())} onDeleteSelected={handleBulkDelete} onExportSelected={handleBulkExport} onGenerateInvoice={handleBulkInvoice} />
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Overview Tab
// ═══════════════════════════════════════════════════════════════════
function OverviewTab({
  client, clientFaviconUrl, viewMode, setViewMode, netMultiplier, canViewFinancials,
  revenueShare, revenueTrend, lastMonthEarnings, utilizationRate, billableHours, totalHours,
  projects, clientSessions, priorityLevel, riskLevel, priorityCfg, riskCfg,
}: any) {
  return (
    <>
      {/* Contact & Details */}
      <SectionCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-[13px] text-muted-foreground mb-1" style={{ fontWeight: 600 }}>Contact</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[14px]">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{client.contactName}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{client.contactEmail}</span>
              </div>
              {client.website && (
                <a href={`https://${client.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[14px] text-primary hover:text-primary/80 transition-colors">
                  <Globe className="w-3.5 h-3.5" />
                  {client.website}
                </a>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                  <span className="text-[13px]">📞</span>
                  {client.phone}
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                  <span className="text-[13px]">📍</span>
                  {client.address}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-[13px] text-muted-foreground mb-1" style={{ fontWeight: 600 }}>Flags</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">Priority</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px]" style={{ fontWeight: 600, color: priorityCfg.color, background: priorityCfg.bg }}>
                  <span className="text-[11px]">{priorityCfg.icon}</span>
                  {priorityLevel.charAt(0).toUpperCase() + priorityLevel.slice(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">Risk</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px]" style={{ fontWeight: 600, color: riskCfg.color, background: riskCfg.bg }}>
                  <span className="text-[11px]">{riskCfg.icon}</span>
                  {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Financial metrics */}
      {canViewFinancials && (
        <SectionCard>
          <div className="flex items-center justify-between mb-5">
            <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 600 }}>Financial Overview</div>
            <div className="inline-flex gap-0 bg-accent/60 rounded-lg p-0.5">
              {(["gross", "net"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-[12px] rounded-md transition-all duration-200 capitalize ${
                    viewMode === mode ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={{ fontWeight: 500, boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,0.04)" : "none" }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>This month</div>
              <div className="text-[24px] md:text-[28px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}>
                ${viewMode === "gross" ? (client.monthlyEarnings || 0).toLocaleString() : Math.round((client.monthlyEarnings || 0) * netMultiplier).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Effective rate</div>
              <div className="text-[24px] md:text-[28px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}>
                ${viewMode === "gross" ? client.trueHourlyRate || client.rate || 0 : Math.round((client.trueHourlyRate || client.rate || 0) * netMultiplier)}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Lifetime revenue</div>
              <div className="text-[24px] md:text-[28px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}>
                ${(client.lifetimeRevenue || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Hours logged</div>
              <div className="text-[24px] md:text-[28px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}>
                {client.hoursLogged || 0}
              </div>
            </div>
          </div>

          {/* Retainer mini bar if applicable */}
          {client.model === "Retainer" && (() => {
            const hoursUsed = (client.retainerTotal || 0) - (client.retainerRemaining || 0);
            const usagePct = client.retainerTotal ? Math.round((hoursUsed / client.retainerTotal) * 100) : 0;
            return (
              <div className="mt-5 pt-5 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Retainer: {hoursUsed}h / {client.retainerTotal || 0}h</div>
                  <div className="text-[14px] tabular-nums" style={{ fontWeight: 600, color: getUsageTextColor(usagePct) }}>{usagePct}%</div>
                </div>
                <div className="h-1.5 bg-accent/60 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: getUsageBarColor(usagePct) }} initial={{ width: 0 }} animate={{ width: `${usagePct}%` }} transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }} />
                </div>
              </div>
            );
          })()}
        </SectionCard>
      )}

      {/* Activity summary */}
      <SectionCard>
        <div className="text-[13px] text-muted-foreground mb-4" style={{ fontWeight: 600 }}>Activity</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-lg bg-accent/30">
            <div className="text-[12px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Projects</div>
            <div className="text-[18px] tabular-nums" style={{ fontWeight: 600 }}>{projects.length}</div>
          </div>
          <div className="p-3.5 rounded-lg bg-accent/30">
            <div className="text-[12px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Sessions</div>
            <div className="text-[18px] tabular-nums" style={{ fontWeight: 600 }}>{clientSessions.length}</div>
          </div>
          <div className="p-3.5 rounded-lg bg-accent/30">
            <div className="text-[12px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Utilization</div>
            <div className="text-[18px] tabular-nums" style={{ fontWeight: 600 }}>{utilizationRate}%</div>
          </div>
          {canViewFinancials && (
            <div className="p-3.5 rounded-lg bg-accent/30">
              <div className="text-[12px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Revenue share</div>
              <div className="text-[18px] tabular-nums" style={{ fontWeight: 600 }}>{revenueShare}%</div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Insights */}
      {canViewFinancials && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-muted-foreground" />
            <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 600 }}>Insights</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {revenueShare > 40 && (
              <div className="p-4 rounded-lg bg-primary/[0.04] border border-primary/10">
                <div className="text-[13px] text-primary mb-1" style={{ fontWeight: 500 }}>Client dependency</div>
                <div className="text-[13px] text-muted-foreground">
                  This client accounts for <span className="text-foreground" style={{ fontWeight: 500 }}>{revenueShare}%</span> of your monthly revenue. Consider diversifying.
                </div>
              </div>
            )}
            <div className="p-4 rounded-lg bg-accent/30">
              <div className="text-[13px] mb-1" style={{ fontWeight: 500 }}>Revenue trend</div>
              <div className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                {revenueTrend === "up" && <span className="text-primary">↑</span>}
                {revenueTrend === "down" && <span className="text-muted-foreground">↓</span>}
                {revenueTrend === "flat" && <span className="text-muted-foreground">→</span>}
                {revenueTrend === "up" ? "Up" : revenueTrend === "down" ? "Down" : "Flat"} vs. last month (
                {revenueTrend === "up" ? "+" : ""}
                {lastMonthEarnings > 0 ? Math.round(((client.monthlyEarnings || 0) - lastMonthEarnings) / lastMonthEarnings * 100) : 0}%)
              </div>
            </div>
            <div className="p-4 rounded-lg bg-accent/30">
              <div className="text-[13px] mb-1" style={{ fontWeight: 500 }}>Utilization rate</div>
              <div className="text-[13px] text-muted-foreground">
                <span className="text-foreground" style={{ fontWeight: 500 }}>{utilizationRate}%</span> billable — {billableHours}h billable of {totalHours}h total
              </div>
            </div>
            <div className="p-4 rounded-lg bg-accent/30">
              <div className="text-[13px] mb-1" style={{ fontWeight: 500 }}>Pacing</div>
              <div className="text-[13px] text-muted-foreground">
                On pace for <span className="text-foreground" style={{ fontWeight: 500 }}>${Math.round((client.monthlyEarnings || 0) * 1.15).toLocaleString()}</span> this month
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Custom fields display */}
      <CustomFieldsDisplay client={client} />
    </>
  );
}

// ── Custom Fields Display (handles both workspace + client-specific) ──
function CustomFieldsDisplay({ client }: { client: any }) {
  const [wsSchemas, setWsSchemas] = useState<any[]>([]);

  useEffect(() => {
    settingsApi.loadSetting('custom_fields_schema').then((schemas) => {
      if (Array.isArray(schemas)) setWsSchemas(schemas);
    });
  }, []);

  const cf = client.customFields;
  let wsValues: Record<string, string | boolean> = {};
  let clientSpecific: any[] = [];

  if (cf && typeof cf === 'object' && !Array.isArray(cf) && 'workspace' in cf) {
    wsValues = cf.workspace || {};
    clientSpecific = Array.isArray(cf.client) ? cf.client : [];
  } else if (Array.isArray(cf)) {
    // Legacy format
    clientSpecific = cf;
  }

  const wsFieldsWithValues = wsSchemas.filter(s => s.label && wsValues[s.id] !== undefined && wsValues[s.id] !== '' && wsValues[s.id] !== false);
  const clientFieldsWithValues = clientSpecific.filter((f: any) => f.label && (f.value !== '' && f.value !== undefined));

  if (wsFieldsWithValues.length === 0 && clientFieldsWithValues.length === 0) return null;

  const renderValue = (type: string, value: any): React.ReactNode => {
    if (type === 'toggle' || type === 'checkbox') {
      return value ? <span className="text-primary text-[12px]" style={{ fontWeight: 500 }}>Yes</span> : <span className="text-muted-foreground text-[12px]">No</span>;
    }
    if (typeof value === 'string' && value) {
      return <span className="text-[13px] text-foreground">{value}</span>;
    }
    return <span className="text-muted-foreground">—</span>;
  };

  return (
    <SectionCard>
      <div className="text-[13px] text-muted-foreground mb-4" style={{ fontWeight: 600 }}>Custom Fields</div>
      <div className="space-y-2">
        {wsFieldsWithValues.map((schema: any) => (
          <div key={schema.id} className="flex items-center justify-between py-1.5">
            <span className="text-[13px] text-muted-foreground flex items-center gap-1.5" style={{ fontWeight: 500 }}>
              <Globe className="w-3 h-3 text-muted-foreground/40" />
              {schema.label}
            </span>
            <div className="text-right max-w-[60%]">{renderValue(schema.type, wsValues[schema.id])}</div>
          </div>
        ))}
        {clientFieldsWithValues.map((field: any, i: number) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>{field.label}</span>
            <div className="text-right max-w-[60%]">{renderValue(field.type, field.value)}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Projects Tab
// ═══════════════════════════════════════════════════════════════════
function ProjectsTab({ projects, client, canViewFinancials, onAddProject, onNavigate }: any) {
  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-5">
        <div className="text-[15px]" style={{ fontWeight: 600 }}>Projects <span className="text-muted-foreground text-[13px] ml-1.5">({projects.length})</span></div>
        <button onClick={onAddProject} className="px-3 py-1.5 text-[13px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all" style={{ fontWeight: 500 }}>
          Add project
        </button>
      </div>
      {projects.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-accent/30 border-b border-border">
                  <th className="text-left px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Project</th>
                  <th className="text-left px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Status</th>
                  {canViewFinancials && <th className="text-right px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Value</th>}
                  <th className="text-right px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Hours</th>
                  <th className="text-left px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Dates</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project: any) => (
                  <tr key={project.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => onNavigate(project.id)}>
                    <td className="px-4 py-3 text-[14px]" style={{ fontWeight: 500 }}>{project.name}</td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded-full ${project.status === "In Progress" ? "bg-primary/8 text-primary" : "bg-zinc-100 text-zinc-500"}`} style={{ fontWeight: 500 }}>
                        <div className={`w-1.5 h-1.5 rounded-full ${project.status === "In Progress" ? "bg-primary" : "bg-zinc-400"}`} />
                        {project.status}
                      </div>
                    </td>
                    {canViewFinancials && (
                      <td className="px-4 py-3 text-[14px] text-right tabular-nums" style={{ fontWeight: 500 }}>
                        ${(project.totalValue || 0).toLocaleString()}
                        {(() => {
                          if (!project.totalValue || project.totalValue <= 0 || !project.hours || project.hours <= 0) return null;
                          const effRate = Math.round(project.totalValue / project.hours);
                          const rateColor = effRate < (client.rate * 0.5) ? '#c27272' : effRate < client.rate ? '#bfa044' : '#5ea1bf';
                          return <div className="text-[11px] mt-0.5 tabular-nums" style={{ fontWeight: 500, color: rateColor }}>${effRate}/hr effective</div>;
                        })()}
                      </td>
                    )}
                    <td className="px-4 py-3 text-[14px] text-right tabular-nums text-muted-foreground">{project.hours || 0}/{project.estimatedHours || 0}h</td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">{project.startDate}{project.endDate ? ` — ${project.endDate}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <div className="text-[14px]" style={{ fontWeight: 500 }}>No projects yet</div>
          <div className="text-[13px] mt-1">Add your first project to start tracking</div>
        </div>
      )}
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sessions Tab
// ═══════════════════════════════════════════════════════════════════
function SessionsTab({ clientSessions, client, canViewFinancials, selectedIds, onToggleSelect, onToggleSelectAll, onLogSession, onEditSession }: any) {
  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-5">
        <div className="text-[15px]" style={{ fontWeight: 600 }}>Time Sessions <span className="text-muted-foreground text-[13px] ml-1.5">({clientSessions.length})</span></div>
        <button onClick={onLogSession} className="px-3 py-1.5 text-[13px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all" style={{ fontWeight: 500 }}>
          Log session
        </button>
      </div>
      {clientSessions.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-accent/30 border-b border-border">
                  <th className="w-10 px-2 py-2.5">
                    <button onClick={onToggleSelectAll} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      {selectedIds.size === clientSessions.length && clientSessions.length > 0 ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Date</th>
                  <th className="text-left px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Description</th>
                  <th className="text-left px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Tags</th>
                  <th className="text-right px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Duration</th>
                  {canViewFinancials && <th className="text-right px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Cost</th>}
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {clientSessions.map((session: any) => (
                  <tr key={session.id} className={`group border-b border-border last:border-0 hover:bg-accent/30 transition-colors ${selectedIds.has(session.id) ? "bg-primary/[0.04]" : ""}`}>
                    <td className="px-2 py-3">
                      <button onClick={() => onToggleSelect(session.id)} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        {selectedIds.has(session.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground tabular-nums">{session.date}</td>
                    <td className="px-4 py-3">
                      <div className="text-[14px]" style={{ fontWeight: 500 }}>{session.task || "—"}</div>
                      {session.projectName && <div className="text-[12px] text-muted-foreground mt-0.5">{session.projectName}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(session.workTags || []).map((tag: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 bg-accent/80 text-muted-foreground text-[10px] rounded-full" style={{ fontWeight: 500 }}>{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[14px] text-right tabular-nums" style={{ fontWeight: 500 }}>{session.duration}h</td>
                    {canViewFinancials && (
                      <td className="px-4 py-3 text-right">
                        <div className="text-[14px] tabular-nums" style={{ fontWeight: 500 }}>${session.revenue.toLocaleString()}</div>
                        {!session.billable && <span className="px-1.5 py-0.5 bg-accent/80 text-muted-foreground text-[10px] rounded-full" style={{ fontWeight: 500 }}>Non-billable</span>}
                      </td>
                    )}
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); onEditSession(session); }} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-all" title="Edit session">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <div className="w-8 h-8 mx-auto mb-3 opacity-30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div className="text-[14px]" style={{ fontWeight: 500 }}>No sessions logged</div>
          <div className="text-[13px] mt-1">Log your first session to start tracking</div>
        </div>
      )}
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Retainer Tab
// ═══════════════════════════════════════════════════════════════════
function RetainerTab({ client, workspaceId, sentThresholds, setSentThresholds, resending, setResending, sendingManualUpdate, setSendingManualUpdate, confirmSendUpdate, setConfirmSendUpdate, emailStatuses, getDeliveryStatus }: any) {
  const hoursUsed = (client.retainerTotal || 0) - (client.retainerRemaining || 0);
  const usagePct = client.retainerTotal ? Math.round((hoursUsed / client.retainerTotal) * 100) : 0;

  return (
    <>
      <SectionCard>
        <div className="text-[15px] mb-5" style={{ fontWeight: 600 }}>Retainer Usage</div>
        <div className="flex justify-between items-baseline mb-4">
          <div className="text-[14px] text-muted-foreground">
            <span style={{ fontWeight: 500 }} className="text-foreground">{hoursUsed}h</span> used of {client.retainerTotal || 0}h
            <span className="text-muted-foreground ml-1.5">({client.retainerRemaining || 0}h remaining)</span>
          </div>
          <div className="text-[24px] tabular-nums" style={{ fontWeight: 600, color: getUsageTextColor(usagePct) }}>{usagePct}%</div>
        </div>
        <div className="h-3 bg-accent/60 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: getUsageBarColor(usagePct) }} initial={{ width: 0 }} animate={{ width: `${usagePct}%` }} transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }} />
        </div>
        {usagePct >= 70 && (
          <div className="mt-3 text-[13px] flex items-center gap-1.5" style={{ color: getUsageTextColor(usagePct) }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getUsageTextColor(usagePct) }} />
            {usagePct >= 85 ? "Running low — consider discussing renewal or overage terms" : "Over 70% used — monitor remaining hours"}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <div className="text-[15px] mb-5" style={{ fontWeight: 600 }}>Retainer Details</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-[12px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Monthly price</div>
            <div className="text-[15px] tabular-nums" style={{ fontWeight: 600 }}>${((client.retainerTotal || 0) * (client.rate || 0)).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[12px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Rate</div>
            <div className="text-[15px] tabular-nums" style={{ fontWeight: 600 }}>${client.rate || 0}/hr</div>
          </div>
          <div>
            <div className="text-[12px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Reset day</div>
            <div className="text-[15px]" style={{ fontWeight: 600 }}>1st of month</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="text-[15px] mb-4" style={{ fontWeight: 600 }}>Send retainer update</div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-[13px] text-muted-foreground">
            Manually send a usage summary {client.contactEmail ? `to ${client.contactEmail}` : '(no client email set)'}
          </div>
          {!confirmSendUpdate ? (
            <button
              disabled={!client.contactEmail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              style={{ fontWeight: 500 }}
              onClick={() => setConfirmSendUpdate(true)}
            >
              <Send className="w-3.5 h-3.5" /> Send update
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-[13px] rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors" style={{ fontWeight: 500 }} onClick={() => setConfirmSendUpdate(false)} disabled={sendingManualUpdate}>Cancel</button>
              <button
                disabled={sendingManualUpdate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                style={{ fontWeight: 500 }}
                onClick={async () => {
                  if (!workspaceId || !client) return;
                  setSendingManualUpdate(true);
                  try {
                    const currentPct = client.retainerTotal ? (hoursUsed / client.retainerTotal) * 100 : 0;
                    const { data: wsData } = await supabase.from('workspaces').select('name').eq('id', workspaceId).maybeSingle();
                    await NotificationEvents.retainerWarning(workspaceId, client.name, currentPct, {
                      clientEmail: client.contactEmail, hoursRemaining: client.retainerRemaining || 0,
                      hoursTotal: client.retainerTotal || 0, workspaceName: wsData?.name, clientId: client.id,
                    });
                    toast.success('Retainer update sent');
                  } catch (err) { console.error('Manual retainer update failed:', err); toast.error('Failed to send retainer update'); }
                  finally { setSendingManualUpdate(false); setConfirmSendUpdate(false); }
                }}
              >
                {sendingManualUpdate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                {sendingManualUpdate ? 'Sending…' : 'Confirm & send'}
              </button>
            </div>
          )}
        </div>
        <AnimatePresence>
          {confirmSendUpdate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-3 p-3 rounded-lg bg-accent/40 border border-border text-[12px] text-muted-foreground flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                <span>This will send a retainer usage email to <strong className="text-foreground">{client.contactEmail}</strong> with the current usage snapshot. Continue?</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SectionCard>

      {/* Email activity for retainer */}
      <SectionCard>
        <div className="text-[15px] mb-4" style={{ fontWeight: 600 }}>Email Activity</div>
        <EmailActivityLog clientId={client.id} />
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Files Tab
// ═══════════════════════════════════════════════════════════════════
function FilesTab({ files, uploading, fileInputRef, onUpload, onDelete, onDrop, formatFileSize }: any) {
  return (
    <SectionCard>
      <div className="text-[15px] mb-5" style={{ fontWeight: 600 }}>Files <span className="text-muted-foreground text-[13px] ml-1.5">({files.length})</span></div>
      {files.length > 0 && (
        <div className="space-y-2 mb-4">
          {files.map((f: any) => (
            <div key={f.name} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/30 transition-colors group">
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>{f.name.replace(/^\d+-/, "")}</div>
                <div className="text-[11px] text-muted-foreground">{formatFileSize(f.size)}</div>
              </div>
              {f.url && (
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent/60 text-muted-foreground transition-all">
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}
              <button onClick={() => onDelete(f.name)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent/60 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border border-dashed border-border rounded-lg p-10 flex flex-col items-center gap-2 hover:bg-accent/30 transition-colors cursor-pointer"
      >
        {uploading ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
        <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>{uploading ? "Uploading..." : "Drop files here or click to upload"}</span>
      </div>
      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }} />
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Notes Tab
// ═══════════════════════════════════════════════════════════════════
function NotesTab({ clientId, projects }: { clientId?: string; projects: any[] }) {
  return (
    <SectionCard>
      <div className="text-[15px] mb-5" style={{ fontWeight: 600 }}>Notes</div>
      {clientId && <ClientNotes clientId={clientId} projects={projects} />}
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Portal Tab
// ═══════════════════════════════════════════════════════════════════
function PortalTab({ client, clientId, portalConfig, portalLoading, copied, onCopyPortalLink, onGeneratePortal, onTogglePortal }: any) {
  return (
    <SectionCard>
      <div className="text-[15px] mb-5" style={{ fontWeight: 600 }}>Client Portal</div>
      <div className="space-y-4">
        <div className="text-[13px] text-muted-foreground">
          Generate a read-only portal link to share with this client. They'll see project progress, time logged, and{" "}
          {client.showPortalCosts !== false ? "billing totals" : "activity only (costs hidden)"}.
        </div>
        {!portalConfig ? (
          <button onClick={onGeneratePortal} disabled={portalLoading} className="inline-flex items-center gap-2 px-4 py-2 text-[13px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-60" style={{ fontWeight: 500 }}>
            {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            Generate portal link
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${portalConfig.active ? "bg-[#5ea1bf]" : "bg-zinc-300"}`} />
                <span className="text-[13px]" style={{ fontWeight: 500 }}>{portalConfig.active ? "Portal is live" : "Portal is deactivated"}</span>
              </div>
              <button
                onClick={() => onTogglePortal(!portalConfig.active)}
                className={`px-3 py-1 text-[12px] rounded-md transition-all ${portalConfig.active ? "text-zinc-500 hover:bg-zinc-100" : "text-primary bg-primary/8 hover:bg-primary/12"}`}
                style={{ fontWeight: 500 }}
              >
                {portalConfig.active ? "Deactivate" : "Activate"}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 min-w-0 px-3 py-2 text-[13px] bg-accent/30 border border-border rounded-lg text-muted-foreground truncate tabular-nums" style={{ fontFamily: "ui-monospace, monospace" }}>
                {window.location.origin}/portal/{portalConfig.token}
              </div>
              <div className="flex gap-2">
                <button onClick={onCopyPortalLink} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] bg-primary/8 text-primary rounded-lg hover:bg-primary/12 transition-all flex-1 sm:flex-none justify-center" style={{ fontWeight: 500 }}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <a href={`/portal/${portalConfig.token}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all flex-1 sm:flex-none justify-center" style={{ fontWeight: 500 }}>
                  <ExternalLink className="w-3.5 h-3.5" /> Preview
                </a>
              </div>
            </div>
            <div className="text-[12px] text-muted-foreground flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              {client.showPortalCosts !== false ? "Billing totals are visible to the client on this portal" : "Financial data is hidden — client sees hours and activity only"}
            </div>
            <button onClick={onGeneratePortal} disabled={portalLoading} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors" style={{ fontWeight: 500 }}>
              {portalLoading ? "Generating..." : "Regenerate link (invalidates old link)"}
            </button>
          </>
        )}
      </div>
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Settings Tab (Edit + Danger Zone)
// ═══════════════════════════════════════════════════════════════════
function SettingsTab({ client, clientId, confirmArchive, setConfirmArchive, onArchive, onNavigateEdit }: any) {
  return (
    <>
      <SectionCard>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] mb-1" style={{ fontWeight: 600 }}>Edit client</div>
            <div className="text-[13px] text-muted-foreground">Update identity, financial terms, flags, custom fields, and branding</div>
          </div>
          <button onClick={onNavigateEdit} className="px-4 py-2 text-[13px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all" style={{ fontWeight: 500 }}>
            Edit client
          </button>
        </div>
      </SectionCard>

      <SectionCard className="border-[rgba(194,114,114,0.3)]">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-[#c27272]" />
          <div className="text-[15px]" style={{ fontWeight: 600 }}>Danger zone</div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[14px] mb-1" style={{ fontWeight: 500 }}>Archive this client</div>
            <div className="text-[13px] text-muted-foreground">This will hide the client from active views. Data will be preserved.</div>
          </div>
          {!confirmArchive ? (
            <button onClick={() => setConfirmArchive(true)} className="px-4 py-2 text-[13px] text-[#c27272] border border-[rgba(194,114,114,0.3)] rounded-lg hover:bg-[rgba(194,114,114,0.08)] transition-all" style={{ fontWeight: 500 }}>
              Archive client
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setConfirmArchive(false)} className="px-3 py-1.5 text-[13px] rounded-lg border border-border text-muted-foreground hover:bg-accent/40 transition-all" style={{ fontWeight: 500 }}>Cancel</button>
              <button onClick={onArchive} className="px-3 py-1.5 text-[13px] rounded-lg bg-[rgba(194,114,114,0.1)] border border-[rgba(194,114,114,0.3)] text-[#b05656] hover:bg-[rgba(194,114,114,0.18)] transition-all" style={{ fontWeight: 500 }}>
                Confirm archive
              </button>
            </div>
          )}
        </div>
      </SectionCard>
    </>
  );
}
