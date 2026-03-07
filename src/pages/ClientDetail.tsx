import { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@radix-ui/react-tooltip";
import { useParams, Link, useNavigate } from "react-router";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useData } from "../data/DataContext";
import { useAuth } from "@/data/AuthContext";
import { NotificationEvents } from "@/data/notificationsApi";
import { EditClientModal, LogSessionModal, AddProjectModal, EditSessionModal } from "../components/Modals";
import * as dataApi from "../data/dataApi";
import * as portalApi from "../data/portalApi";
import ClientNotes from "../components/ClientNotes";
import ClientDetailsPanel from "../components/ClientDetailsPanel";
import EmailActivityLog from "../components/EmailActivityLog";
import BulkSessionActions from "../components/BulkSessionActions";
import { supabase } from "@/integrations/supabase/client";
import { usePlan } from "@/data/PlanContext";
import { useRoleAccess } from "@/data/useRoleAccess";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

// Status indicator color based on usage percentage
// Blue (#5ea1bf) = healthy, muted yellow (#bfa044) = caution, muted red (#c27272) = critical
function getUsageBarColor(usagePct: number): string {
  if (usagePct >= 85) return "#c27272"; // critical - muted red
  if (usagePct >= 70) return "#bfa044"; // caution - muted yellow
  return "linear-gradient(90deg, #5ea1bf, #7fb8d1)"; // healthy - blue
}

function getUsageTextColor(usagePct: number): string {
  if (usagePct >= 85) return "#c27272";
  if (usagePct >= 70) return "#bfa044";
  return "#5ea1bf";
}

export default function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { workspaceId, clients, sessions, updateClient, addSession, updateSession, deleteSession, getProjects, loadProjectsForClient, addProject, netMultiplier, workCategoryNames } =
    useData();
  const { isAtLeast } = usePlan();
  const { canViewFinancials } = useRoleAccess();
  const [viewMode, setViewMode] = useState<"gross" | "net">("gross");
  const [expandedSections, setExpandedSections] = useState({
    insights: true,
    projects: true,
    retainer: true,
    sessions: true,
    files: false,
    notes: true,
    emailLog: false,
    portal: false,
    danger: false,
  });
  const [copied, setCopied] = useState(false);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
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
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Retainer warning thresholds that have been sent (with timestamps and notification IDs)
  const [sentThresholds, setSentThresholds] = useState<Record<number, { sentAt: string; notificationId: string }>>({});
  const [resending, setResending] = useState<number | null>(null);
  const [sendingManualUpdate, setSendingManualUpdate] = useState(false);
  const [confirmSendUpdate, setConfirmSendUpdate] = useState(false);
  // Email delivery statuses keyed by notification_id
  const [emailStatuses, setEmailStatuses] = useState<Record<string, { event_type: string; created_at: string }>>({});

  // Helper to get delivery status label + color
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

  const client = clients.find((c) => c.id === clientId);

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
    // Load client logos if Studio
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

        // Fetch latest email delivery status for each notification
        if (notifIds.length > 0) {
          const { data: events } = await supabase
            .from('email_events')
            .select('notification_id, event_type, created_at')
            .in('notification_id', notifIds)
            .order('created_at', { ascending: false });
          if (events) {
            const statusMap: Record<string, { event_type: string; created_at: string }> = {};
            for (const ev of events) {
              // Keep the latest (most significant) event per notification
              if (ev.notification_id && !statusMap[ev.notification_id]) {
                statusMap[ev.notification_id] = { event_type: ev.event_type, created_at: ev.created_at };
              }
            }
            setEmailStatuses(statusMap);
          }
        }
      });
  }, [clientId, workspaceId, clients]);

  // Also get from context (for newly added projects)
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
          <div className="text-[16px]" style={{ fontWeight: 500 }}>
            Client not found
          </div>
          <Link to="/clients" className="text-[14px] text-primary hover:text-primary/80 mt-2 inline-block">
            Back to clients
          </Link>
        </div>
      </div>
    );
  }

  const clientSessions = sessions.filter((s) => s.clientId === clientId);
  const totalClients = clients.filter((c) => c.status === "Active").length;
  const totalRevenue = clients
    .filter((c) => c.status === "Active")
    .reduce((s: number, c: any) => s + (c.monthlyEarnings || 0), 0);
  const revenueShare = totalRevenue > 0 ? Math.round(((client.monthlyEarnings || 0) / totalRevenue) * 100) : 0;
  const lastMonthEarnings = Math.round((client.monthlyEarnings || 0) * 0.88);
  const revenueTrend =
    (client.monthlyEarnings || 0) > lastMonthEarnings
      ? "up"
      : (client.monthlyEarnings || 0) < lastMonthEarnings
        ? "down"
        : "flat";
  const totalHours = clientSessions.reduce((s: number, sess: any) => s + sess.duration, 0);
  const billableHours = clientSessions
    .filter((s: any) => s.billable)
    .reduce((s: number, sess: any) => s + sess.duration, 0);
  const utilizationRate = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    Active: { bg: "bg-primary/8", text: "text-primary", dot: "bg-primary" },
    Prospect: { bg: "bg-stone-100", text: "text-stone-500", dot: "bg-stone-400" },
    Archived: { bg: "bg-zinc-100", text: "text-zinc-500", dot: "bg-zinc-400" },
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
      } catch (e) {
        console.error("Copy failed:", e);
      }
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
    } catch (err: any) {
      toast.error(err.message || "Failed to generate portal link");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleTogglePortal = async (active: boolean) => {
    if (!clientId) return;
    try {
      const config = await portalApi.togglePortal(clientId, active);
      setPortalConfig(config);
      toast.success(active ? "Portal activated" : "Portal deactivated");
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle portal");
    }
  };

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
      } catch (err) {
        console.error('[ClientDetail] Failed to create session notification:', err);
      }
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

  // File upload
  const handleFileUpload = async (file: File) => {
    if (!clientId) return;
    setUploading(true);
    try {
      const result = await dataApi.uploadFile(workspaceId!, clientId, file);
      setFiles((prev) => [...prev, result]);
      toast.success("File uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (fileName: string) => {
    if (!clientId) return;
    try {
      await dataApi.deleteFile(workspaceId!, clientId, fileName);
      setFiles((prev) => prev.filter((f) => f.name !== fileName));
      toast.success("File deleted");
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  // Archive
  const handleArchive = async () => {
    await updateClient(client.id, { status: "Archived" });
    toast.success(`${client.name} archived`);
    navigate("/clients");
  };

  // ── Bulk session selection ─────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === clientSessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(clientSessions.map((s: any) => s.id)));
    }
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
    a.href = url;
    a.download = `${client.name.replace(/\s+/g, "-")}-sessions.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${selectedSessions.length} sessions exported`);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} sessions?`)) return;
    try {
      for (const id of selectedIds) await deleteSession(id);
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} sessions deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete sessions");
    }
  };

  const handleBulkInvoice = async () => {
    try {
      // Get workspace ID
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .limit(1)
        .maybeSingle();
      if (!memberData) throw new Error('No workspace found');
      const wsId = memberData.workspace_id;

      // Get next invoice number
      const { data: seqData } = await supabase
        .from('invoice_sequences')
        .select('next_number')
        .eq('workspace_id', wsId)
        .maybeSingle();

      let nextNum = seqData?.next_number || 1001;
      const number = `INV-${nextNum}`;

      // Build line items
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
        workspace_id: wsId,
        number,
        client_id: clientId!,
        client_name: client.name,
        client_email: client.contactEmail || null,
        line_items: lineItems as any,
        subtotal,
        tax_rate: 0,
        tax_amount: 0,
        total: subtotal,
        currency: 'USD',
        status: 'draft',
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        issued_date: new Date().toISOString().split('T')[0],
        created_from_sessions: Array.from(selectedIds),
      });
      if (insertErr) throw new Error(insertErr.message);

      // Increment sequence
      if (seqData) {
        await supabase.from('invoice_sequences').update({ next_number: nextNum + 1 }).eq('workspace_id', wsId);
      } else {
        await supabase.from('invoice_sequences').insert({ workspace_id: wsId, next_number: nextNum + 1 });
      }

      setSelectedIds(new Set());
      toast.success(`Draft invoice ${number} created`);
      navigate("/invoicing");
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
    }
  };

  // File drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div className="w-full min-w-0 max-w-7xl mx-auto px-6 lg:px-12 py-6 md:py-12" variants={container} initial="hidden" animate="show">
      {/* Back link */}
      <motion.div variants={item}>
        <Link
          to="/clients"
          className="inline-flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground mb-8 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to clients
        </Link>
      </motion.div>

      {/* Header Panel */}
      <motion.div
        variants={item}
        className="bg-card border border-border rounded-xl p-5 md:p-8 mb-8 md:mb-12 relative overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)" }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-primary/[0.03] to-transparent rounded-bl-full pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8 relative">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-primary/8 rounded-xl flex items-center justify-center overflow-hidden">
              {clientFaviconUrl ? (
                <img src={clientFaviconUrl} alt={client.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="text-[20px] text-primary" style={{ fontWeight: 600 }}>
                  {client.name.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-[20px] md:text-[28px] tracking-tight mb-1.5 flex items-center gap-2" style={{ fontWeight: 600 }}>
                {client.name}
              </h1>
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 ${statusColors[client.status]?.bg} ${statusColors[client.status]?.text} text-[11px] rounded-full`}
                  style={{ fontWeight: 500 }}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${statusColors[client.status]?.dot}`} />
                  {client.status}
                </div>
                <div className="text-[13px] text-muted-foreground px-2.5 py-0.5 bg-accent/60 rounded-full">
                  {client.model}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {client.contactName} &middot; {client.contactEmail}
                </span>
                {client.website && (
                  <a
                    href={`https://${client.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {client.website}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => navigate(`/clients/${clientId}/edit`)}
              className="px-3 py-1.5 text-[13px] border border-border rounded-lg hover:bg-accent/40 transition-all"
              style={{ fontWeight: 500 }}
            >
              Edit
            </button>
          {canViewFinancials && (
            <div className="inline-flex gap-0 bg-accent/60 rounded-lg p-0.5 self-start">
              <button
                onClick={() => setViewMode("gross")}
                className={`px-4 py-1.5 text-[13px] rounded-md transition-all duration-200 ${
                  viewMode === "gross" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ fontWeight: 500, boxShadow: viewMode === "gross" ? "0 1px 3px rgba(0,0,0,0.04)" : "none" }}
                title="Gross: total billed"
              >
                Gross
              </button>
              <button
                onClick={() => setViewMode("net")}
                className={`px-4 py-1.5 text-[13px] rounded-md transition-all duration-200 ${
                  viewMode === "net" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ fontWeight: 500, boxShadow: viewMode === "net" ? "0 1px 3px rgba(0,0,0,0.04)" : "none" }}
                title="Net: minus payment fees and estimated taxes"
              >
                Net
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Primary Metrics */}
        {canViewFinancials && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8 pb-8 border-b border-border">
          <div>
            <div className="text-[13px] text-muted-foreground mb-2" style={{ fontWeight: 500 }}>
              This month earnings
            </div>
            <div className="text-[28px] md:text-[42px] leading-none tracking-tight text-foreground" style={{ fontWeight: 600 }}>
              $
              {viewMode === "gross"
                ? (client.monthlyEarnings || 0).toLocaleString()
                : Math.round((client.monthlyEarnings || 0) * netMultiplier).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[13px] text-muted-foreground mb-2" style={{ fontWeight: 500 }}>
              Effective rate
            </div>
            <div className="text-[28px] md:text-[42px] leading-none tracking-tight text-foreground" style={{ fontWeight: 600 }}>
              $
              {viewMode === "gross"
                ? client.trueHourlyRate || client.rate || 0
                : Math.round((client.trueHourlyRate || client.rate || 0) * netMultiplier)}
            </div>
          </div>
        </div>
        )}

        {/* Secondary Metrics */}
        <div className={`grid ${canViewFinancials ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'} gap-4 md:gap-8`}>
          {canViewFinancials && (
          <div className="p-4 rounded-lg bg-accent/30 transition-colors hover:bg-accent/50">
            <div className="text-[12px] text-muted-foreground mb-2" style={{ fontWeight: 500 }}>
              Lifetime revenue
            </div>
            <div className="text-[20px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}>
              ${(client.lifetimeRevenue || 0).toLocaleString()}
            </div>
          </div>
          )}
          <div className="p-4 rounded-lg bg-accent/30 transition-colors hover:bg-accent/50">
            <div className="text-[12px] text-muted-foreground mb-2" style={{ fontWeight: 500 }}>
              Hours logged
            </div>
            <div className="text-[20px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}>
              {client.hoursLogged || 0}
            </div>
          </div>
          {canViewFinancials && client.model === "Retainer" &&
            (() => {
              const hoursUsed = (client.retainerTotal || 0) - (client.retainerRemaining || 0);
              const usagePct = client.retainerTotal ? Math.round((hoursUsed / client.retainerTotal) * 100) : 0;
              return (
                <div className="p-4 rounded-lg bg-accent/30 transition-colors hover:bg-accent/50">
                  <div className="text-[12px] text-muted-foreground mb-2" style={{ fontWeight: 500 }}>
                    Retainer used
                  </div>
                  <div className="text-[20px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}>
                    {hoursUsed}h
                    <span className="text-[13px] text-muted-foreground ml-1">/ {client.retainerTotal || 0}h</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-accent/60 rounded-full overflow-hidden relative">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: getUsageBarColor(usagePct) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${usagePct}%` }}
                      transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                    {/* Threshold markers */}
                    {[70, 85, 90].map(t => (
                      <div
                        key={t}
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3"
                        style={{ left: `${t}%`, background: 'var(--muted-foreground)', opacity: 0.25 }}
                      />
                    ))}
                  </div>
                  {/* Sent threshold indicators */}
                  {Object.keys(sentThresholds).length > 0 && (
                    <TooltipProvider delayDuration={200}>
                      <div className="mt-2 flex items-center gap-2">
                        {[70, 85, 90].map(t => {
                          const thresholdData = sentThresholds[t];
                          const sent = !!thresholdData;
                          const sentAt = thresholdData?.sentAt;
                          const deliveryInfo = sent ? getDeliveryStatus(thresholdData.notificationId) : null;
                          const color = t >= 90 ? 'hsl(var(--destructive))' : t >= 85 ? 'hsl(45 60% 50%)' : 'hsl(var(--primary))';
                          const dot = (
                            <div className="flex items-center gap-1 cursor-default">
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                  background: sent ? color : 'hsl(var(--muted-foreground))',
                                  opacity: sent ? 1 : 0.2,
                                }}
                              />
                              <span
                                className="text-[10px]"
                                style={{
                                  fontWeight: 500,
                                  color: sent ? color : 'hsl(var(--muted-foreground))',
                                  opacity: sent ? 1 : 0.4,
                                }}
                              >
                                {t}%
                              </span>
                            </div>
                          );
                          if (!sent) return (
                            <Tooltip key={t}>
                              <TooltipTrigger asChild>{dot}</TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="bg-popover text-popover-foreground border border-border rounded-lg px-3 py-2 text-[11px] shadow-md z-50"
                              >
                                <span className="text-muted-foreground">{t}% warning not sent</span>
                                <button
                                  className="mt-1.5 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                                  style={{ fontWeight: 600 }}
                                  disabled={resending === t}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!workspaceId || !client) return;
                                    setResending(t);
                                    try {
                                      const hoursUsed = (client.retainerTotal || 0) - (client.retainerRemaining || 0);
                                      const currentPct = client.retainerTotal ? (hoursUsed / client.retainerTotal) * 100 : 0;
                                      const { data: wsData } = await supabase.from('workspaces').select('name').eq('id', workspaceId).maybeSingle();
                                      await NotificationEvents.retainerWarning(workspaceId, client.name, currentPct, {
                                        clientEmail: client.contactEmail,
                                        hoursRemaining: client.retainerRemaining || 0,
                                        hoursTotal: client.retainerTotal || 0,
                                        workspaceName: wsData?.name,
                                        clientId: client.id,
                                      });
                                      setSentThresholds(prev => ({ ...prev, [t]: { sentAt: new Date().toISOString(), notificationId: '' } }));
                                      toast.success(`${t}% retainer warning sent`);
                                    } catch (err) {
                                      console.error('Send failed:', err);
                                      toast.error('Failed to send warning');
                                    } finally {
                                      setResending(null);
                                    }
                                  }}
                                >
                                  {resending === t ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                  Send now
                                </button>
                              </TooltipContent>
                            </Tooltip>
                          );
                          return (
                            <Tooltip key={t}>
                              <TooltipTrigger asChild>{dot}</TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="bg-popover text-popover-foreground border border-border rounded-lg px-3 py-2 text-[11px] shadow-md z-50"
                              >
                                <span style={{ fontWeight: 600 }}>{t}% warning sent</span>
                                <br />
                                <span className="text-muted-foreground">
                                  {format(new Date(sentAt), 'MMM d, yyyy · h:mm a')}
                                </span>
                                {deliveryInfo && (
                                  <div className="mt-1 flex items-center gap-1" style={{ color: deliveryInfo.color }}>
                                    <span className="text-[10px]">{deliveryInfo.icon}</span>
                                    <span className="text-[10px]" style={{ fontWeight: 600 }}>{deliveryInfo.label}</span>
                                  </div>
                                )}
                                <button
                                  className="mt-1.5 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                                  style={{ fontWeight: 600 }}
                                  disabled={resending === t}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!workspaceId || !client) return;
                                    setResending(t);
                                    try {
                                      const hoursUsed = (client.retainerTotal || 0) - (client.retainerRemaining || 0);
                                      const currentPct = client.retainerTotal ? (hoursUsed / client.retainerTotal) * 100 : 0;
                                      const { data: wsData } = await supabase.from('workspaces').select('name').eq('id', workspaceId).maybeSingle();
                                      await NotificationEvents.retainerWarning(workspaceId, client.name, currentPct, {
                                        clientEmail: client.contactEmail,
                                        hoursRemaining: client.retainerRemaining || 0,
                                        hoursTotal: client.retainerTotal || 0,
                                        workspaceName: wsData?.name,
                                        clientId: client.id,
                                      });
                                      setSentThresholds(prev => ({ ...prev, [t]: { sentAt: new Date().toISOString(), notificationId: '' } }));
                                      toast.success(`${t}% retainer warning resent`);
                                    } catch (err) {
                                      console.error('Resend failed:', err);
                                      toast.error('Failed to resend warning');
                                    } finally {
                                      setResending(null);
                                    }
                                  }}
                                >
                                  {resending === t ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                  Resend
                                </button>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </TooltipProvider>
                  )}
                </div>
              );
            })()}
        </div>
      </motion.div>

      {/* Client Details Panel (Pro+) */}
      <motion.div variants={item} className="mb-3">
        <ClientDetailsPanel client={client} onSave={handleEditSave} />
      </motion.div>

      {/* Collapsible Sections */}
      <motion.div variants={item} className="space-y-3">
        {/* Insights Section */}
        {canViewFinancials && (
        <CollapsibleSection
          label="Insights"
          icon={Lightbulb}
          count={revenueShare > 40 ? 4 : 3}
          isOpen={expandedSections.insights}
          onToggle={() => toggleSection("insights")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {revenueShare > 40 && (
              <div className="p-4 rounded-lg bg-primary/[0.04] border border-primary/10">
                <div className="text-[13px] text-primary mb-1" style={{ fontWeight: 500 }}>
                  Client dependency
                </div>
                <div className="text-[13px] text-muted-foreground">
                  This client accounts for{" "}
                  <span className="text-foreground" style={{ fontWeight: 500 }}>
                    {revenueShare}%
                  </span>{" "}
                  of your monthly revenue. Consider diversifying.
                </div>
              </div>
            )}
            <div className="p-4 rounded-lg bg-accent/30">
              <div className="text-[13px] mb-1" style={{ fontWeight: 500 }}>
                Revenue trend
              </div>
              <div className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                {revenueTrend === "up" && <span className="text-primary">↑</span>}
                {revenueTrend === "down" && <span className="text-muted-foreground">↓</span>}
                {revenueTrend === "flat" && <span className="text-muted-foreground">→</span>}
                {revenueTrend === "up" ? "Up" : revenueTrend === "down" ? "Down" : "Flat"} vs. last month (
                {revenueTrend === "up" ? "+" : ""}
                {lastMonthEarnings > 0
                  ? Math.round((((client.monthlyEarnings || 0) - lastMonthEarnings) / lastMonthEarnings) * 100)
                  : 0}
                %)
              </div>
            </div>
            <div className="p-4 rounded-lg bg-accent/30">
              <div className="text-[13px] mb-1" style={{ fontWeight: 500 }}>
                Utilization rate
              </div>
              <div className="text-[13px] text-muted-foreground">
                <span className="text-foreground" style={{ fontWeight: 500 }}>
                  {utilizationRate}%
                </span>{" "}
                billable — {billableHours}h billable of {totalHours}h total
              </div>
            </div>
            <div className="p-4 rounded-lg bg-accent/30">
              <div className="text-[13px] mb-1" style={{ fontWeight: 500 }}>
                Pacing
              </div>
              <div className="text-[13px] text-muted-foreground">
                On pace for{" "}
                <span className="text-foreground" style={{ fontWeight: 500 }}>
                  ${Math.round((client.monthlyEarnings || 0) * 1.15).toLocaleString()}
                </span>{" "}
                this month
              </div>
            </div>
          </div>
        </CollapsibleSection>
        )}

        {/* Projects Section */}
        <CollapsibleSection
          label="Projects"
          icon={FileText}
          count={projects.length}
          isOpen={expandedSections.projects}
          onToggle={() => toggleSection("projects")}
          action={
            <button
              onClick={() => setShowProjectModal(true)}
              className="text-[12px] text-primary hover:text-primary/80 transition-colors"
              style={{ fontWeight: 500 }}
            >
              Add project
            </button>
          }
        >
          {projects.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-accent/30 border-b border-border">
                    <th className="text-left px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Project
                    </th>
                    <th className="text-left px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Status
                    </th>
                    {canViewFinancials && (
                    <th
                      className="text-right px-4 py-2.5 text-[12px] text-muted-foreground"
                      style={{ fontWeight: 500 }}
                    >
                      Value
                    </th>
                    )}
                    <th
                      className="text-right px-4 py-2.5 text-[12px] text-muted-foreground"
                      style={{ fontWeight: 500 }}
                    >
                      Hours
                    </th>
                    <th className="text-left px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Dates
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project: any) => (
                    <tr
                      key={project.id}
                      className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/projects/${clientId}/${project.id}`)}
                    >
                      <td className="px-4 py-3 text-[14px]" style={{ fontWeight: 500 }}>
                        {project.name}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded-full ${
                            project.status === "In Progress" ? "bg-primary/8 text-primary" : "bg-zinc-100 text-zinc-500"
                          }`}
                          style={{ fontWeight: 500 }}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${project.status === "In Progress" ? "bg-primary" : "bg-zinc-400"}`}
                          />
                          {project.status}
                        </div>
                      </td>
                      {canViewFinancials && (
                      <td className="px-4 py-3 text-[14px] text-right tabular-nums" style={{ fontWeight: 500 }}>
                        ${(project.totalValue || 0).toLocaleString()}
                        {(() => {
                          if (!project.totalValue || project.totalValue <= 0) return null;
                          if (!project.hours || project.hours <= 0) return (
                            <div className="text-[11px] text-muted-foreground mt-0.5">${project.totalValue.toLocaleString()} total</div>
                          );
                          const effRate = Math.round(project.totalValue / project.hours);
                          const rateColor = effRate < (client.rate * 0.5) ? '#c27272' : effRate < client.rate ? '#bfa044' : '#5ea1bf';
                          return (
                            <div className="text-[11px] mt-0.5 tabular-nums" style={{ fontWeight: 500, color: rateColor }}>
                              ${effRate}/hr effective
                            </div>
                          );
                        })()}
                      </td>
                      )}
                      <td className="px-4 py-3 text-[14px] text-right tabular-nums text-muted-foreground">
                        {project.hours || 0}/{project.estimatedHours || 0}h
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">
                        {project.startDate}
                        {project.endDate ? ` — ${project.endDate}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          ) : (
            <div className="text-[14px] text-muted-foreground py-4">No projects yet</div>
          )}
        </CollapsibleSection>

        {/* Retainer Section */}
        {canViewFinancials && client.model === "Retainer" && (
          <CollapsibleSection
            label="Retainer"
            icon={() => (
              <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-sm bg-primary" />
              </div>
            )}
            isOpen={expandedSections.retainer}
            onToggle={() => toggleSection("retainer")}
          >
            {(() => {
              const hoursUsed = (client.retainerTotal || 0) - (client.retainerRemaining || 0);
              const usagePct = client.retainerTotal ? Math.round((hoursUsed / client.retainerTotal) * 100) : 0;
              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline mb-4">
                    <div className="text-[14px] text-muted-foreground">
                      <span style={{ fontWeight: 500 }} className="text-foreground">
                        {hoursUsed}h
                      </span>{" "}
                      used of {client.retainerTotal || 0}h
                      <span className="text-muted-foreground ml-1.5">({client.retainerRemaining || 0}h remaining)</span>
                    </div>
                    <div
                      className="text-[22px] tabular-nums"
                      style={{ fontWeight: 600, color: getUsageTextColor(usagePct) }}
                    >
                      {usagePct}%
                    </div>
                  </div>
                  <div className="h-3 bg-accent/60 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: getUsageBarColor(usagePct) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${usagePct}%` }}
                      transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                  </div>
                  {usagePct >= 70 && (
                    <div
                      className="mt-3 text-[13px] flex items-center gap-1.5"
                      style={{ color: getUsageTextColor(usagePct) }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: getUsageTextColor(usagePct) }}
                      />
                      {usagePct >= 85
                        ? "Running low — consider discussing renewal or overage terms"
                        : "Over 70% used — monitor remaining hours"}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                    <div>
                      <div className="text-[12px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
                        Monthly price
                      </div>
                      <div className="text-[15px] tabular-nums" style={{ fontWeight: 600 }}>
                        ${((client.retainerTotal || 0) * (client.rate || 0)).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[12px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
                        Rate
                      </div>
                      <div className="text-[15px] tabular-nums" style={{ fontWeight: 600 }}>
                        ${client.rate || 0}/hr
                      </div>
                    </div>
                    <div>
                      <div className="text-[12px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
                        Reset day
                      </div>
                      <div className="text-[15px]" style={{ fontWeight: 600 }}>
                        1st of month
                      </div>
                    </div>
                  </div>
                  {/* Manual send retainer update */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="text-[13px]" style={{ fontWeight: 500 }}>Send retainer update</div>
                        <div className="text-[12px] text-muted-foreground">
                          Manually send a usage summary {client.contactEmail ? `to ${client.contactEmail}` : '(no client email set)'}
                        </div>
                      </div>
                      {!confirmSendUpdate ? (
                        <button
                          disabled={!client.contactEmail}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                          style={{ fontWeight: 500 }}
                          onClick={() => setConfirmSendUpdate(true)}
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send update
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1.5 text-[12px] rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
                            style={{ fontWeight: 500 }}
                            onClick={() => setConfirmSendUpdate(false)}
                            disabled={sendingManualUpdate}
                          >
                            Cancel
                          </button>
                          <button
                            disabled={sendingManualUpdate}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                            style={{ fontWeight: 500 }}
                            onClick={async () => {
                              if (!workspaceId || !client) return;
                              setSendingManualUpdate(true);
                              try {
                                const hoursUsed = (client.retainerTotal || 0) - (client.retainerRemaining || 0);
                                const currentPct = client.retainerTotal ? (hoursUsed / client.retainerTotal) * 100 : 0;
                                const { data: wsData } = await supabase.from('workspaces').select('name').eq('id', workspaceId).maybeSingle();
                                await NotificationEvents.retainerWarning(workspaceId, client.name, currentPct, {
                                  clientEmail: client.contactEmail,
                                  hoursRemaining: client.retainerRemaining || 0,
                                  hoursTotal: client.retainerTotal || 0,
                                  workspaceName: wsData?.name,
                                  clientId: client.id,
                                });
                                toast.success('Retainer update sent');
                              } catch (err) {
                                console.error('Manual retainer update failed:', err);
                                toast.error('Failed to send retainer update');
                              } finally {
                                setSendingManualUpdate(false);
                                setConfirmSendUpdate(false);
                              }
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
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 p-3 rounded-lg bg-accent/40 border border-border text-[12px] text-muted-foreground flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                            <span>This will send a retainer usage email to <strong className="text-foreground">{client.contactEmail}</strong> with the current usage snapshot. Continue?</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })()}
          </CollapsibleSection>
        )}

        {/* Time Sessions Section */}
        <CollapsibleSection
          label="Time sessions"
          icon={({ className }: { className?: string }) => (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          )}
          count={clientSessions.length}
          isOpen={expandedSections.sessions}
          onToggle={() => toggleSection("sessions")}
          action={
            <button
              onClick={() => setShowLogModal(true)}
              className="text-[12px] text-primary hover:text-primary/80 transition-colors"
              style={{ fontWeight: 500 }}
            >
              Log session
            </button>
          }
        >
          {clientSessions.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-accent/30 border-b border-border">
                    <th className="w-10 px-2 py-2.5">
                      <button
                        onClick={toggleSelectAll}
                        className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {selectedIds.size === clientSessions.length && clientSessions.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Date
                    </th>
                    <th className="text-left px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Description
                    </th>
                    <th className="text-left px-4 py-2.5 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Tags
                    </th>
                    <th
                      className="text-right px-4 py-2.5 text-[12px] text-muted-foreground"
                      style={{ fontWeight: 500 }}
                    >
                      Duration
                    </th>
                    {canViewFinancials && (
                    <th
                      className="text-right px-4 py-2.5 text-[12px] text-muted-foreground"
                      style={{ fontWeight: 500 }}
                    >
                      Cost
                    </th>
                    )}
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {clientSessions.map((session: any) => (
                    <tr
                      key={session.id}
                      className={`group border-b border-border last:border-0 hover:bg-accent/30 transition-colors ${selectedIds.has(session.id) ? "bg-primary/[0.04]" : ""}`}
                    >
                      <td className="px-2 py-3">
                        <button
                          onClick={() => toggleSelect(session.id)}
                          className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {selectedIds.has(session.id) ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground tabular-nums">{session.date}</td>
                      <td className="px-4 py-3 text-[14px]">
                        <div>
                          {session.task}
                          {session.allocationType && session.allocationType !== "general" && (
                            <span
                              className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 bg-primary/6 text-[10px] rounded-full text-primary border border-primary/10 align-middle"
                              style={{ fontWeight: 500 }}
                            >
                              {session.allocationType === "retainer" ? "Retainer" : session.projectName || "Project"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {(session.workTags || []).map((tag: string) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-accent/80 text-[11px] rounded-full text-muted-foreground"
                              style={{ fontWeight: 500 }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[14px] text-right tabular-nums">{session.duration}h</td>
                      {canViewFinancials && (
                      <td className="px-4 py-3 text-[14px] text-right tabular-nums" style={{ fontWeight: 500 }}>
                        <div className="flex items-center justify-end gap-2">
                          ${session.revenue}
                          {session.billable ? (
                            <span
                              className="px-1.5 py-0.5 bg-primary/8 text-primary text-[10px] rounded-full"
                              style={{ fontWeight: 500 }}
                            >
                              Billable
                            </span>
                          ) : (
                            <span
                              className="px-1.5 py-0.5 bg-accent/80 text-muted-foreground text-[10px] rounded-full"
                              style={{ fontWeight: 500 }}
                            >
                              Non-billable
                            </span>
                          )}
                        </div>
                      </td>
                      )}
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSession(session); }}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-all"
                            title="Edit session"
                          >
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
            <div className="text-[14px] text-muted-foreground py-4">No sessions logged for this client</div>
          )}
        </CollapsibleSection>

        {/* Files Section */}
        <CollapsibleSection
          label="Files"
          icon={FileText}
          count={files.length}
          isOpen={expandedSections.files}
          onToggle={() => toggleSection("files")}
          action={
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[12px] text-primary hover:text-primary/80 transition-colors"
              style={{ fontWeight: 500 }}
            >
              Upload
            </button>
          }
        >
          {files.length > 0 && (
            <div className="space-y-2 mb-4">
              {files.map((f: any) => (
                <div
                  key={f.name}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-accent/30 transition-colors group"
                >
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>
                      {f.name.replace(/^\d+-/, "")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{formatFileSize(f.size)}</div>
                  </div>
                  {f.url && (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent/60 text-muted-foreground transition-all"
                    >
                      <Download className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={() => handleFileDelete(f.name)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent/60 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 hover:bg-accent/30 transition-colors cursor-pointer"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
              {uploading ? "Uploading..." : "Drop files here or click to upload"}
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
            }}
          />
        </CollapsibleSection>

        {/* Notes Section */}
        <CollapsibleSection
          label="Notes"
          icon={StickyNote}
          isOpen={expandedSections.notes}
          onToggle={() => toggleSection("notes")}
        >
          {clientId && <ClientNotes clientId={clientId} projects={projects} />}
        </CollapsibleSection>

        {/* Email Activity Log */}
        {client.model === "Retainer" && (
          <CollapsibleSection
            label="Email activity"
            icon={Mail}
            isOpen={expandedSections.emailLog}
            onToggle={() => toggleSection("emailLog")}
          >
            <EmailActivityLog clientId={clientId} />
          </CollapsibleSection>
        )}

        {/* Portal Link Section */}
        <CollapsibleSection
          label="Client portal"
          icon={Link2}
          isOpen={expandedSections.portal}
          onToggle={() => toggleSection("portal")}
        >
          <div className="space-y-4">
            <div className="text-[13px] text-muted-foreground">
              Generate a read-only portal link to share with this client. They'll see project progress, time logged, and{" "}
              {client.showPortalCosts !== false ? "billing totals" : "activity only (costs hidden)"}.
            </div>

            {!portalConfig ? (
              <button
                onClick={handleGeneratePortal}
                disabled={portalLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-[13px] bg-primary/8 text-primary rounded-lg hover:bg-primary/12 transition-all disabled:opacity-60"
                style={{ fontWeight: 500 }}
              >
                {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                Generate portal link
              </button>
            ) : (
              <>
                {/* Active/inactive toggle */}
                <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${portalConfig.active ? "bg-[#5ea1bf]" : "bg-zinc-300"}`} />
                    <span className="text-[13px]" style={{ fontWeight: 500 }}>
                      {portalConfig.active ? "Portal is live" : "Portal is deactivated"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleTogglePortal(!portalConfig.active)}
                    className={`px-3 py-1 text-[12px] rounded-md transition-all ${
                      portalConfig.active
                        ? "text-zinc-500 hover:bg-zinc-100"
                        : "text-primary bg-primary/8 hover:bg-primary/12"
                    }`}
                    style={{ fontWeight: 500 }}
                  >
                    {portalConfig.active ? "Deactivate" : "Activate"}
                  </button>
                </div>

                {/* Portal URL */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div
                    className="flex-1 min-w-0 px-3 py-2 text-[13px] bg-accent/30 border border-border rounded-lg text-muted-foreground truncate tabular-nums"
                    style={{ fontFamily: "ui-monospace, monospace" }}
                  >
                    {window.location.origin}/portal/{portalConfig.token}
                  </div>
                  <div className="flex gap-2">
                  <button
                    onClick={handleCopyPortalLink}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] bg-primary/8 text-primary rounded-lg hover:bg-primary/12 transition-all flex-1 sm:flex-none justify-center"
                    style={{ fontWeight: 500 }}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <a
                    href={`/portal/${portalConfig.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all flex-1 sm:flex-none justify-center"
                    style={{ fontWeight: 500 }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Preview
                  </a>
                  </div>
                </div>

                {/* Cost visibility note */}
                <div className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                  {client.showPortalCosts !== false
                    ? "Billing totals are visible to the client on this portal"
                    : "Financial data is hidden — client sees hours and activity only"}
                </div>

                {/* Client logos are now managed in the Edit Client modal */}

                {/* Regenerate */}
                <button
                  onClick={handleGeneratePortal}
                  disabled={portalLoading}
                  className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  {portalLoading ? "Generating..." : "Regenerate link (invalidates old link)"}
                </button>
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Danger Zone */}
        <CollapsibleSection
          label="Danger zone"
          icon={AlertTriangle}
          isOpen={expandedSections.danger}
          onToggle={() => toggleSection("danger")}
          variant="danger"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[14px] mb-1" style={{ fontWeight: 500 }}>
                Archive this client
              </div>
              <div className="text-[13px] text-muted-foreground">
                This will hide the client from active views. Data will be preserved.
              </div>
            </div>
            {!confirmArchive ? (
              <button
                onClick={() => setConfirmArchive(true)}
                className="px-4 py-2 text-[13px] text-[#c27272] border border-[rgba(194,114,114,0.3)] rounded-lg hover:bg-[rgba(194,114,114,0.08)] transition-all"
                style={{ fontWeight: 500 }}
              >
                Archive client
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmArchive(false)}
                  className="px-3 py-1.5 text-[13px] rounded-lg border border-border text-muted-foreground hover:bg-accent/40 transition-all"
                  style={{ fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  className="px-3 py-1.5 text-[13px] rounded-lg bg-[rgba(194,114,114,0.1)] border border-[rgba(194,114,114,0.3)] text-[#b05656] hover:bg-[rgba(194,114,114,0.18)] transition-all"
                  style={{ fontWeight: 500 }}
                >
                  Confirm archive
                </button>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </motion.div>

      {/* Modals */}
      <EditClientModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        client={client}
        onSave={handleEditSave}
        workspaceId={workspaceId}
        isStudio={isAtLeast('studio')}
        clientFaviconUrl={clientFaviconUrl}
        clientLogoUrl={clientLogoUrl}
        onLogoChange={(type, url) => {
          if (type === 'favicon') setClientFaviconUrl(url);
          else setClientLogoUrl(url);
        }}
      />
      <LogSessionModal
        open={showLogModal}
        onClose={() => setShowLogModal(false)}
        onSave={handleLogSession}
        clients={clients}
        preSelectedClient={clientId}
      />
      <AddProjectModal open={showProjectModal} onClose={() => setShowProjectModal(false)} onSave={handleAddProject} />
      <EditSessionModal
        open={!!editingSession}
        onClose={() => setEditingSession(null)}
        session={editingSession}
        onSave={handleUpdateSession}
        onDelete={handleDeleteSession}
        clients={clients}
      />
      <BulkSessionActions
        selectedCount={selectedIds.size}
        selectedSessions={selectedSessions}
        onClearSelection={() => setSelectedIds(new Set())}
        onDeleteSelected={handleBulkDelete}
        onExportSelected={handleBulkExport}
        onGenerateInvoice={handleBulkInvoice}
      />
    </motion.div>
  );
}

// Reusable Collapsible Section Component
function CollapsibleSection({
  label,
  icon: Icon,
  count,
  isOpen,
  onToggle,
  children,
  action,
  variant,
}: {
  label: string;
  icon: any;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  action?: React.ReactNode;
  variant?: "danger";
}) {
  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden ${
        variant === "danger" ? "border-[rgba(194,114,114,0.3)]" : "border-border"
      }`}
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)" }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="w-full flex items-center justify-between px-4 md:px-6 py-4 hover:bg-accent/30 transition-all duration-200 group cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${variant === "danger" ? "text-[#c27272]" : "text-muted-foreground"}`} />
          <div className="text-[14px] flex items-center gap-2" style={{ fontWeight: 500 }}>
            {label}
            {count !== undefined && (
              <span
                className="text-[12px] text-muted-foreground bg-accent/80 px-1.5 py-0.5 rounded-full tabular-nums"
                style={{ fontWeight: 500 }}
              >
                {count}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-6 pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
