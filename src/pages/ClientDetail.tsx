import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
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
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  X,
  Plus,
  RefreshCw,
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
import ChecklistPanel from "../components/ChecklistPanel";
import EmailActivityLog from "../components/EmailActivityLog";
import BulkSessionActions from "../components/BulkSessionActions";
import { supabase } from "@/integrations/supabase/client";
import * as settingsApi from "@/data/settingsApi";
import { usePlan } from "@/data/PlanContext";
import { useRoleAccess } from "@/data/useRoleAccess";
import RecurringSessionsManager from "../components/RecurringSessionsManager";
import ClientAssignmentManager from "../components/ClientAssignmentManager";

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
  return "linear-gradient(90deg, #2e7d9a, #5bb8d4)";
}

function getUsageTextColor(usagePct: number): string {
  if (usagePct >= 85) return "#c27272";
  if (usagePct >= 70) return "#bfa044";
  return "#2e7d9a";
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  low: { color: 'var(--muted-foreground)', bg: 'var(--accent)', icon: '○' },
  medium: { color: 'hsl(35 45% 38%)', bg: 'hsl(45 30% 50% / 0.08)', icon: '◑' },
  high: { color: 'hsl(0 45% 40%)', bg: 'hsl(0 30% 50% / 0.08)', icon: '●' },
};

const RISK_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  low: { color: 'hsl(142 40% 35%)', bg: 'hsl(142 30% 50% / 0.08)', icon: '✓' },
  medium: { color: 'hsl(35 45% 38%)', bg: 'hsl(45 30% 50% / 0.08)', icon: '⚠' },
  high: { color: 'hsl(0 45% 40%)', bg: 'hsl(0 30% 50% / 0.08)', icon: '✕' },
};

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  Active: { bg: "bg-primary/8", text: "text-primary", dot: "bg-primary" },
  Prospect: { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning" },
  Archived: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground/50" },
};

function getRetainerPlanning(customFields: any): { pendingCarryoverHours?: number; nextCycleBaseHours?: number } {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) return {};
  const system = customFields._system;
  if (!system || typeof system !== 'object' || Array.isArray(system)) return {};
  const retainer = system.retainer;
  if (!retainer || typeof retainer !== 'object' || Array.isArray(retainer)) return {};
  return retainer;
}

function updateRetainerPlanning(customFields: any, updates: { pendingCarryoverHours?: number | null; nextCycleBaseHours?: number | null }) {
  const base = customFields && typeof customFields === 'object' && !Array.isArray(customFields) ? customFields : {};
  const system = base._system && typeof base._system === 'object' && !Array.isArray(base._system) ? base._system : {};
  const currentRetainer = system.retainer && typeof system.retainer === 'object' && !Array.isArray(system.retainer) ? system.retainer : {};
  const nextRetainer: Record<string, any> = { ...currentRetainer, ...updates };

  if (nextRetainer.pendingCarryoverHours == null || Number.isNaN(Number(nextRetainer.pendingCarryoverHours))) {
    delete nextRetainer.pendingCarryoverHours;
  }
  if (nextRetainer.nextCycleBaseHours == null || Number.isNaN(Number(nextRetainer.nextCycleBaseHours))) {
    delete nextRetainer.nextCycleBaseHours;
  }

  return {
    ...base,
    _system: {
      ...system,
      retainer: nextRetainer,
    },
  };
}

// ── Tab definitions ─────────────────────────────────────────────────
type TabId = "overview" | "details" | "projects" | "sessions" | "retainer" | "files" | "notes" | "checklists" | "portal" | "settings";

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
      icon: RefreshCw,
    });
  }
  tabs.push(
    { id: "files", label: "Files", icon: FolderOpen },
    { id: "notes", label: "Notes", icon: StickyNote },
    { id: "checklists", label: "Checklists", icon: CheckSquare },
    { id: "portal", label: "Portal", icon: Link2 },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  );
  return tabs;
}

// ── SectionCard (reused in tabs) ────────────────────────────────────
function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border/60 rounded-xl overflow-hidden ${className}`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)" }}>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}

function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h3 className="text-[14px] tracking-tight" style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>{children}</h3>
      {action}
    </div>
  );
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`p-4 rounded-xl ${accent ? 'bg-primary/[0.05] border border-primary/10' : 'bg-accent/30 border border-border/30'}`}>
      <div className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.06em' }}>{label}</div>
      <div className={`text-[20px] tabular-nums leading-none ${accent ? 'text-primary' : ''}`} style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div className="mt-1.5">{sub}</div>}
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
  const { workspaceId, clients, sessions, updateClient, deleteClient: deleteClientFromContext, addSession, updateSession, deleteSession, getProjects, loadProjectsForClient, addProject, netMultiplier, workCategoryNames } =
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
          setClientFaviconUrl(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${workspaceId}/${faviconMatch.name}?t=${Date.now()}`);
        }
        const logoMatch = files?.find((f: any) => f.name.startsWith(`client-${clientId}.`) && !f.name.includes('-favicon'));
        if (logoMatch) {
          setClientLogoUrl(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${workspaceId}/${logoMatch.name}?t=${Date.now()}`);
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
      <div className="w-full min-w-0 px-6 lg:px-12 py-12">
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

  const handlePermanentDelete = async () => {
    try {
      // Also clean up storage files for this client
      try {
        const fileList = await dataApi.loadFiles(workspaceId!, clientId!);
        await Promise.all(fileList.map((f: any) => dataApi.deleteFile(workspaceId!, clientId!, f.name)));
      } catch (_) { /* ignore storage cleanup errors */ }
      await deleteClientFromContext(client.id);
      toast.success(`${client.name} permanently deleted`);
      navigate("/clients");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete client");
    }
  };

  const handleRestore = async () => {
    await updateClient(client.id, { status: "Active" });
    toast.success(`${client.name} restored to active`);
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

  const handleEmailPortalLink = async (recipientEmail: string, message?: string) => {
    if (!clientId) throw new Error("No client");
    const result = await portalApi.emailPortalLink(clientId, recipientEmail, message);
    // Refresh portal config in case it was just generated
    const config = await portalApi.getPortalConfig(clientId);
    if (config) setPortalConfig(config);
    return result;
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
    <motion.div className="w-full min-w-0 page-wrapper" variants={container} initial="hidden" animate="show">
      {/* ── Client Header ─────────────────────────────────────────── */}
      <motion.div variants={item} className="mb-3">
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Status accent bar */}
          <div className="h-[3px]" style={{
            background: client.status === 'Active' ? 'var(--primary)' : client.status === 'Prospect' ? 'var(--warning)' : 'var(--muted-foreground)',
            opacity: client.status === 'Archived' ? 0.3 : 0.7,
          }} />

          <div className="p-4 md:p-5">
            {/* Top row: avatar + name + actions */}
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-border/50"
                style={{ background: 'color-mix(in srgb, var(--primary) 6%, transparent)' }}>
                {clientFaviconUrl ? (
                  <img src={clientFaviconUrl} alt={client.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-[18px] text-primary" style={{ fontWeight: 700 }}>{client.name.charAt(0)}</div>
                )}
              </div>

              {/* Name + status */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-[22px] md:text-[24px] truncate" style={{ fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15 }}>{client.name}</h1>
                  <div className={`status-badge ${statusColors[client.status]?.bg} ${statusColors[client.status]?.text}`}>
                    <div className={`w-1.5 h-1.5 rounded-circle ${statusColors[client.status]?.dot}`} />
                    {client.status}
                  </div>
                </div>
                {/* Contact strip */}
                {(client.contactName || client.contactEmail || client.phone) && (
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-0.5 mt-1 text-[13px] text-muted-foreground">
                    {client.contactName && <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 opacity-40" />{client.contactName}</span>}
                    {client.contactEmail && <a href={`mailto:${client.contactEmail}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors"><Mail className="w-3.5 h-3.5 opacity-40" />{client.contactEmail}</a>}
                    {client.phone && <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors"><Phone className="w-3.5 h-3.5 opacity-40" />{client.phone}</a>}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                <button
                  onClick={() => navigate(`/clients/${clientId}/edit`)}
                  className="px-3 py-1.5 text-[12px] border border-border/80 rounded-lg hover:bg-accent/50 transition-all flex items-center gap-1.5"
                  style={{ fontWeight: 500 }}
                >
                  <Pencil className="w-3 h-3" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              </div>
            </div>

            {/* Metadata strip */}
            <div className="flex flex-wrap items-center gap-2.5 mt-3.5 pt-3.5 border-t border-border/40">
              <span className="text-[12px] text-muted-foreground px-2.5 py-1 bg-accent/60 rounded-md" style={{ fontWeight: 600 }}>{client.model}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] rounded-md" style={{ fontWeight: 600, color: priorityCfg.color, background: priorityCfg.bg }}>
                <Flag className="w-3 h-3" /> {priorityLevel.charAt(0).toUpperCase() + priorityLevel.slice(1)}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] rounded-md" style={{ fontWeight: 600, color: riskCfg.color, background: riskCfg.bg }}>
                <ShieldAlert className="w-3 h-3" /> {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
              </span>
              {client.website && (
                <>
                  <div className="w-px h-4 bg-border/60 hidden sm:block" />
                  <a href={`https://${client.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 transition-colors" style={{ fontWeight: 500 }}>
                    <Globe className="w-3.5 h-3.5" />{client.website}<ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                </>
              )}
              {client.address && (
                <>
                  <div className="w-px h-4 bg-border/60 hidden sm:block" />
                  <span className="text-[12px] text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 opacity-40" />{client.address}</span>
                </>
              )}
              {client.startDate && (
                <>
                  <div className="w-px h-4 bg-border/60 hidden sm:block" />
                  <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Since {format(parseISO(client.startDate), 'MMM yyyy')}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab layout */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Vertical tab nav — wrapped in card */}
        <motion.nav variants={item} className="w-full lg:w-44 flex-shrink-0">
          <div className="bg-card border border-border/60 rounded-xl overflow-hidden lg:sticky lg:top-[72px]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-x-visible p-1.5 border-b lg:border-b-0 border-border/0">
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-auto lg:w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-left transition-all duration-150 relative whitespace-nowrap ${
                      isActive ? "bg-primary/[0.07] text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                    }`}
                    style={{ fontWeight: isActive ? 600 : 450 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="client-tab-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-primary rounded-r-full hidden lg:block"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <tab.icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/50"}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
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
              {activeTab === "details" && (
                <DetailsTab client={client} onUpdateClient={handleEditSave} />
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
                <>
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
                  <div className="mt-6 bg-card border border-border/50 rounded-xl p-5">
                    <RecurringSessionsManager
                      clients={clients}
                      projects={projects}
                      fixedClientId={clientId}
                    />
                  </div>
                </>
              )}
              {activeTab === "retainer" && (
                <RetainerTab
                  client={client}
                  clientId={clientId}
                  workspaceId={workspaceId}
                  clientSessions={clientSessions}
                  onUpdateClient={async (updates: any) => {
                    await dataApi.updateClient(workspaceId, clientId!, updates);
                    updateClient(clientId!, updates);
                  }}
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
              {activeTab === "checklists" && workspaceId && clientId && (
                <ChecklistsTab clientId={clientId} workspaceId={workspaceId} />
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
                  onRestore={handleRestore}
                  onPermanentDelete={handlePermanentDelete}
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
  // Build a simple 7-day sparkline from sessions
  const last7Days = useMemo(() => {
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const hours = clientSessions
        .filter((s: any) => s.rawDate === dateStr)
        .reduce((sum: number, s: any) => sum + s.duration, 0);
      days.push(hours);
    }
    return days;
  }, [clientSessions]);

  const maxHours = Math.max(...last7Days, 1);
  const sparkPoints = last7Days.map((h, i) => {
    const x = (i / 6) * 200;
    const y = 40 - (h / maxHours) * 36;
    return `${x},${y}`;
  }).join(' ');
  const sparkFillPoints = `0,40 ${sparkPoints} 200,40`;

  return (
    <>
      {/* Financial metrics */}
      {canViewFinancials && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue card */}
          <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <div className="p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[12px] text-muted-foreground" style={{ fontWeight: 600 }}>Financial Overview</div>
                <div className="inline-flex gap-0 bg-accent/60 rounded-md p-0.5">
                  {(["gross", "net"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-2.5 py-0.5 text-[11px] rounded-sm transition-all duration-200 capitalize ${
                        viewMode === mode ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={{ fontWeight: 600, boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1" style={{ fontWeight: 600, letterSpacing: '0.06em' }}>This month</div>
                  <div className="text-[22px] leading-none tracking-tighter tabular-nums" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
                    ${viewMode === "net" ? Math.round((client.monthlyEarnings || 0) * netMultiplier).toLocaleString() : (client.monthlyEarnings || 0).toLocaleString()}
                  </div>
                  {revenueTrend !== 'flat' && (
                    <div className={`flex items-center gap-0.5 mt-1 text-[11px] ${revenueTrend === 'up' ? 'text-success' : 'text-destructive'}`} style={{ fontWeight: 600 }}>
                      {revenueTrend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {revenueTrend === 'up' ? '+' : ''}{Math.abs(Math.round(((client.monthlyEarnings || 0) - lastMonthEarnings) / Math.max(lastMonthEarnings, 1) * 100))}% vs last
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1" style={{ fontWeight: 600, letterSpacing: '0.06em' }}>Eff. rate</div>
                  <div className="text-[22px] leading-none tracking-tighter tabular-nums" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
                    ${client.trueHourlyRate ? (viewMode === "net" ? Math.round(client.trueHourlyRate * netMultiplier) : client.trueHourlyRate.toFixed(2)) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1" style={{ fontWeight: 600, letterSpacing: '0.06em' }}>Lifetime</div>
                  <div className="text-[22px] leading-none tracking-tighter tabular-nums" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
                    ${viewMode === "net" ? Math.round((client.lifetimeRevenue || 0) * netMultiplier).toLocaleString() : (client.lifetimeRevenue || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1" style={{ fontWeight: 600, letterSpacing: '0.06em' }}>Hours</div>
                  <div className="text-[22px] leading-none tracking-tighter tabular-nums" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
                    {client.hoursLogged || 0}
                  </div>
                </div>
              </div>

              {/* Retainer mini bar */}
              {client.model === "Retainer" && (() => {
                const hoursUsed = (client.retainerTotal || 0) - (client.retainerRemaining || 0);
                const usagePct = client.retainerTotal ? Math.round((hoursUsed / client.retainerTotal) * 100) : 0;
                return (
                  <div className="mt-4 pt-4 border-t border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] text-muted-foreground" style={{ fontWeight: 500 }}>Retainer: {hoursUsed}h / {client.retainerTotal || 0}h</div>
                      <div className="text-[13px] tabular-nums" style={{ fontWeight: 700, color: getUsageTextColor(usagePct) }}>{usagePct}%</div>
                    </div>
                    <div className="h-1.5 bg-accent/60 rounded-sm overflow-hidden">
                      <motion.div className="h-full rounded-sm" style={{ background: getUsageBarColor(usagePct) }} initial={{ width: 0 }} animate={{ width: `${usagePct}%` }} transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 7-day activity sparkline card */}
          <div className="bg-card border border-border/60 rounded-xl overflow-hidden flex flex-col" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <div className="p-4 md:p-5 flex flex-col flex-1 justify-between">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1" style={{ fontWeight: 600, letterSpacing: '0.06em' }}>7-Day Activity</div>
                <div className="text-[26px] leading-none tracking-tighter tabular-nums" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
                  {last7Days.reduce((a, b) => a + b, 0).toFixed(1)}h
                </div>
                <div className="text-[10px] text-muted-foreground mt-1" style={{ fontWeight: 500 }}>total this week</div>
              </div>
              <div className="mt-3">
                <svg viewBox="0 0 200 44" className="w-full" style={{ height: 48 }}>
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon points={sparkFillPoints} fill="url(#sparkGrad)" />
                  <polyline points={sparkPoints} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {last7Days.map((h, i) => {
                    const x = (i / 6) * 200;
                    const y = 40 - (h / maxHours) * 36;
                    return h > 0 ? <circle key={i} cx={x} cy={y} r="2.5" fill="var(--primary)" /> : null;
                  })}
                </svg>
                <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-1 px-0.5" style={{ fontWeight: 600 }}>
                  {last7Days.map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return <span key={i}>{format(d, 'EEE')}</span>;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard>
          <SectionHeader>Activity</SectionHeader>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Projects" value={projects.length} />
            <MetricCard label="Sessions" value={clientSessions.length} />
            <MetricCard label="Utilization" value={`${utilizationRate}%`} accent={utilizationRate >= 80} />
            {canViewFinancials && <MetricCard label="Revenue share" value={`${revenueShare}%`} accent={revenueShare > 40} />}
          </div>
        </SectionCard>

        {canViewFinancials && (
          <SectionCard>
            <SectionHeader>
              <span className="flex items-center gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-primary/60" />
                Insights
              </span>
            </SectionHeader>
            <div className="space-y-2.5">
              {revenueShare > 40 && (
                <div className="p-3.5 rounded-xl bg-primary/[0.04] border border-primary/10">
                  <div className="text-[12px] text-primary mb-1" style={{ fontWeight: 600 }}>Client dependency</div>
                  <div className="text-[12px] text-muted-foreground leading-relaxed">
                    <span className="text-foreground" style={{ fontWeight: 600 }}>{revenueShare}%</span> of monthly revenue. Consider diversifying.
                  </div>
                </div>
              )}
              <div className="p-3.5 rounded-xl bg-accent/30 border border-border/30">
                <div className="text-[12px] mb-1" style={{ fontWeight: 600 }}>Utilization rate</div>
                <div className="text-[12px] text-muted-foreground leading-relaxed">
                  <span className="text-foreground" style={{ fontWeight: 600 }}>{utilizationRate}%</span> billable — {billableHours}h of {totalHours}h total
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-accent/30 border border-border/30">
                <div className="text-[12px] mb-1" style={{ fontWeight: 600 }}>Pacing</div>
                <div className="text-[12px] text-muted-foreground leading-relaxed">
                  On pace for <span className="text-foreground" style={{ fontWeight: 600 }}>${Math.round((client.monthlyEarnings || 0) * 1.15).toLocaleString()}</span> this month
                </div>
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      {/* Team assignments */}
      <SectionCard>
        <ClientAssignmentManager clientId={client.id} />
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Details Tab (Standard Fields + Custom Fields — all inline-editable)
// ═══════════════════════════════════════════════════════════════════
function DetailsTab({ client, onUpdateClient }: { client: any; onUpdateClient: (updates: any) => Promise<void> }) {
  const [wsSchemas, setWsSchemas] = useState<any[]>([]);
  const { isAtLeast } = usePlan();
  const { canViewFinancials } = useRoleAccess();
  const navigate = useNavigate();

  // Editable state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [saving, setSaving] = useState(false);

  // Shared links state
  const [addingLink, setAddingLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  // New custom field form
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'textarea' | 'toggle' | 'select'>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

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
    clientSpecific = cf;
  }

  const wsFieldsWithValues = wsSchemas.filter(s => s.label);
  const clientFieldsWithValues = clientSpecific.filter((f: any) => f.label);

  const startEdit = (fieldId: string, currentValue: any) => {
    setEditingField(fieldId);
    setEditValue(currentValue ?? '');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Save a standard client field
  const saveStandardField = async (fieldKey: string, value: any) => {
    setSaving(true);
    try {
      await onUpdateClient({ [fieldKey]: value });
      toast.success('Field updated');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); setEditingField(null); }
  };

  const saveWsField = async (fieldId: string, value: any) => {
    setSaving(true);
    try {
      const currentCf = client.customFields && typeof client.customFields === 'object' && !Array.isArray(client.customFields)
        ? client.customFields
        : { workspace: {}, client: clientSpecific };
      const newCf = {
        ...currentCf,
        workspace: { ...currentCf.workspace, [fieldId]: value },
      };
      await onUpdateClient({ customFields: newCf });
      toast.success('Field updated');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); setEditingField(null); }
  };

  const saveClientField = async (index: number, value: any) => {
    setSaving(true);
    try {
      const currentCf = client.customFields && typeof client.customFields === 'object' && !Array.isArray(client.customFields)
        ? client.customFields
        : { workspace: wsValues, client: [...clientSpecific] };
      const newClientFields = [...(currentCf.client || [])];
      newClientFields[index] = { ...newClientFields[index], value };
      const newCf = { ...currentCf, client: newClientFields };
      await onUpdateClient({ customFields: newCf });
      toast.success('Field updated');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); setEditingField(null); }
  };

  const deleteClientField = async (index: number) => {
    setSaving(true);
    try {
      const currentCf = client.customFields && typeof client.customFields === 'object' && !Array.isArray(client.customFields)
        ? client.customFields
        : { workspace: wsValues, client: [...clientSpecific] };
      const newClientFields = [...(currentCf.client || [])];
      newClientFields.splice(index, 1);
      const newCf = { ...currentCf, client: newClientFields };
      await onUpdateClient({ customFields: newCf });
      toast.success('Field removed');
    } catch { toast.error('Failed to remove'); }
    finally { setSaving(false); }
  };

  const addClientField = async () => {
    if (!newFieldLabel.trim()) return;
    setSaving(true);
    try {
      const currentCf = client.customFields && typeof client.customFields === 'object' && !Array.isArray(client.customFields)
        ? client.customFields
        : { workspace: wsValues, client: [...clientSpecific] };
      const newField: any = {
        id: crypto.randomUUID(),
        label: newFieldLabel.trim(),
        type: newFieldType,
        value: newFieldType === 'toggle' ? false : '',
      };
      if (newFieldType === 'select' && newFieldOptions.trim()) {
        newField.options = newFieldOptions.split(',').map(o => o.trim()).filter(Boolean);
      }
      const newCf = { ...currentCf, client: [...(currentCf.client || []), newField] };
      await onUpdateClient({ customFields: newCf });
      setNewFieldLabel('');
      setNewFieldType('text');
      setNewFieldOptions('');
      setShowAddField(false);
      toast.success('Custom field added');
    } catch { toast.error('Failed to add field'); }
    finally { setSaving(false); }
  };

  const toggleWsField = async (fieldId: string, currentValue: boolean) => {
    await saveWsField(fieldId, !currentValue);
  };

  const toggleClientField = async (index: number, currentValue: boolean) => {
    await saveClientField(index, !currentValue);
  };

  // Render an inline-editable field
  const renderEditableField = (fieldKey: string, schema: { type: string; label: string; options?: string[] }, value: any, onSave: (val: any) => void, onToggle?: () => void) => {
    const isEditing = editingField === fieldKey;
    const type = schema.type;

    if (type === 'toggle' || type === 'checkbox') {
      return (
        <button onClick={onToggle} className={`relative w-9 h-5 rounded-circle transition-colors duration-200 ${value ? 'bg-primary' : 'bg-switch-background'}`}>
          <motion.div className="absolute top-0.5 w-4 h-4 rounded-circle bg-white shadow-sm" animate={{ left: value ? 18 : 2 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
        </button>
      );
    }

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 w-full">
          {type === 'textarea' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-[14px] bg-input-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={2}
              autoFocus
            />
          ) : type === 'select' ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-[14px] bg-input-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            >
              <option value="">Select...</option>
              {(schema.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : type === 'date' ? (
            <DatePicker
              value={editValue}
              onChange={(val) => { setEditValue(val); onSave(val); }}
              placeholder="Pick a date"
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-[14px] bg-input-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') onSave(editValue); if (e.key === 'Escape') cancelEdit(); }}
            />
          )}
          <button onClick={() => onSave(editValue)} disabled={saving} className="w-7 h-7 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          </button>
          <button onClick={cancelEdit} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent/60 text-muted-foreground transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      );
    }

    // Display mode
    let displayText = value;
    if (type === 'date' && value) {
      try { displayText = format(parseISO(value), 'MMM d, yyyy'); } catch { displayText = value; }
    }

    const displayValue = displayText !== undefined && displayText !== '' && displayText !== null
      ? <span className="text-[14px] text-foreground">{String(displayText)}</span>
      : <span className="text-[13px] text-muted-foreground/50 italic">Empty — click to set</span>;

    return (
      <button onClick={() => startEdit(fieldKey, value)} className="text-left group/field hover:bg-accent/40 -mx-1 px-1 py-0.5 rounded transition-colors w-full">
        <div className="flex items-center justify-between">
          {displayValue}
          <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover/field:text-muted-foreground/50 transition-all ml-2 flex-shrink-0" />
        </div>
      </button>
    );
  };

  // Standard fields definition
  const standardFields: { key: string; label: string; icon: any; type: string; options?: string[]; financialOnly?: boolean }[] = [
    { key: 'contactName', label: 'Contact Name', icon: User, type: 'text' },
    { key: 'contactEmail', label: 'Contact Email', icon: Mail, type: 'text' },
    { key: 'phone', label: 'Phone', icon: Phone, type: 'text' },
    { key: 'website', label: 'Website', icon: Globe, type: 'text' },
    { key: 'address', label: 'Address', icon: MapPin, type: 'text' },
    { key: 'startDate', label: 'Start / Sign-On Date', icon: ClipboardList, type: 'date' },
    { key: 'status', label: 'Status', icon: ClipboardList, type: 'select', options: ['Active', 'Prospect', 'Archived'] },
    { key: 'model', label: 'Billing Model', icon: ClipboardList, type: 'select', options: ['Hourly', 'Retainer', 'Project'] },
    { key: 'rate', label: 'Rate', icon: ClipboardList, type: 'text', financialOnly: true },
    { key: 'priorityLevel', label: 'Priority', icon: Flag, type: 'select', options: ['low', 'medium', 'high'] },
    { key: 'riskLevel', label: 'Risk', icon: ShieldAlert, type: 'select', options: ['low', 'medium', 'high'] },
    { key: 'portalGreeting', label: 'Portal Greeting', icon: ClipboardList, type: 'textarea' },
  ];

  const visibleStandardFields = standardFields.filter(f => !f.financialOnly || canViewFinancials);

  return (
    <>
      {/* Standard Client Details */}
      <SectionCard>
        <SectionHeader>Client Details</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleStandardFields.map((field) => {
            const val = (client as any)[field.key];
            const displayVal = field.key === 'rate' && val !== undefined && val !== '' && val !== null ? `$${val}` : val;
            return (
              <div key={field.key} className="p-3.5 rounded-xl bg-accent/20 border border-border/40">
                <div className="flex items-center gap-1.5 mb-2">
                  <field.icon className="w-3 h-3 text-muted-foreground/40" />
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.06em' }}>{field.label}</div>
                </div>
                {field.key === 'rate' ? (
                  renderEditableField(
                    `std-${field.key}`,
                    { type: 'text', label: field.label },
                    val ?? '',
                    (v) => saveStandardField(field.key, parseFloat(v) || 0),
                  )
                ) : (
                  renderEditableField(
                    `std-${field.key}`,
                    { type: field.type, label: field.label, options: field.options },
                    val ?? '',
                    (v) => saveStandardField(field.key, v || null),
                  )
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Shared links — interactive */}
      <SectionCard>
        <SectionHeader>Shared Links</SectionHeader>
        {(() => {
          const LINK_TYPES = [
            { value: "google-drive", label: "Google Drive", icon: "📁" },
            { value: "dropbox", label: "Dropbox", icon: "📦" },
            { value: "figma", label: "Figma", icon: "🎨" },
            { value: "notion", label: "Notion", icon: "📝" },
            { value: "github", label: "GitHub", icon: "🐙" },
            { value: "miro", label: "Miro", icon: "🟡" },
            { value: "slack", label: "Slack", icon: "💬" },
            { value: "other", label: "Other", icon: "🔗" },
          ];
          const detectType = (url: string) => {
            const u = url.toLowerCase();
            if (u.includes("drive.google") || u.includes("docs.google")) return "google-drive";
            if (u.includes("dropbox.com")) return "dropbox";
            if (u.includes("figma.com")) return "figma";
            if (u.includes("notion.")) return "notion";
            if (u.includes("github.com")) return "github";
            if (u.includes("miro.com")) return "miro";
            if (u.includes("slack.com")) return "slack";
            return "other";
          };
          const getConfig = (type: string) => LINK_TYPES.find(t => t.value === type) || LINK_TYPES[LINK_TYPES.length - 1];
          const links: { id: string; label: string; url: string; type: string }[] = Array.isArray(client.externalLinks) ? client.externalLinks : [];

          const handleAddLink = async () => {
            if (!newLinkUrl.trim()) return;
            let url = newLinkUrl.trim();
            if (!url.startsWith("http")) url = "https://" + url;
            const type = detectType(url);
            const config = getConfig(type);
            const link = { id: Date.now().toString(), label: newLinkLabel.trim() || config.label, url, type };
            await onUpdateClient({ externalLinks: [...links, link] });
            setNewLinkUrl('');
            setNewLinkLabel('');
            setAddingLink(false);
            toast.success('Link added');
          };
          const handleDeleteLink = async (id: string) => {
            await onUpdateClient({ externalLinks: links.filter(l => l.id !== id) });
            toast.success('Link removed');
          };

          return (
            <>
              {links.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {links.map((link) => {
                    const config = getConfig(link.type);
                    return (
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="group/link inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-accent/40 text-[12px] transition-all" style={{ fontWeight: 500 }}>
                        <span className="text-[13px]">{config.icon}</span>
                        <span className="text-foreground">{link.label}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteLink(link.id); }} className="ml-0.5 opacity-0 group-hover/link:opacity-100 p-0.5 rounded hover:bg-accent/60 text-muted-foreground hover:text-destructive transition-all">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </a>
                    );
                  })}
                </div>
              )}
              {addingLink ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input autoFocus value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="Paste URL (Dropbox, Google Drive, Figma...)" className="flex-1 text-[13px] px-3 py-1.5 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" onKeyDown={(e) => { if (e.key === 'Enter') handleAddLink(); if (e.key === 'Escape') setAddingLink(false); }} />
                  <div className="flex items-center gap-2">
                    <input value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} placeholder="Label (optional)" className="w-full sm:w-36 text-[13px] px-3 py-1.5 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" onKeyDown={(e) => { if (e.key === 'Enter') handleAddLink(); }} />
                    <button onClick={handleAddLink} disabled={!newLinkUrl.trim()} className="p-1.5 rounded-lg hover:bg-accent/60 text-primary disabled:opacity-40"><Check className="w-4 h-4" /></button>
                    <button onClick={() => { setAddingLink(false); setNewLinkUrl(''); setNewLinkLabel(''); }} className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingLink(true)} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary transition-colors" style={{ fontWeight: 500 }}>
                  <Link2 className="w-3 h-3" /> Add shared link
                </button>
              )}
            </>
          );
        })()}
      </SectionCard>

      {/* Workspace custom fields — inline editable */}
      {wsSchemas.length > 0 && (
        <SectionCard>
          <SectionHeader>
            <span className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-muted-foreground/40" />
              Workspace Fields
              <span className="text-[10px] text-muted-foreground/60 bg-accent/60 px-1.5 py-0.5 rounded-md ml-1" style={{ fontWeight: 500 }}>Shared</span>
            </span>
          </SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wsSchemas.filter(s => s.label).map((schema: any) => (
              <div key={schema.id} className="p-3.5 rounded-xl bg-accent/20 border border-border/40">
                <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.06em' }}>{schema.label}</div>
                  {renderEditableField(
                    `ws-${schema.id}`,
                    schema,
                    wsValues[schema.id],
                    (val) => saveWsField(schema.id, val),
                    (schema.type === 'toggle' || schema.type === 'checkbox') ? () => toggleWsField(schema.id, !!wsValues[schema.id]) : undefined,
                  )}
                </div>
              ))}
          </div>
        </SectionCard>
      )}

      {/* Client-specific custom fields */}
      <SectionCard>
        <SectionHeader action={
          <button
            onClick={() => setShowAddField(!showAddField)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] text-primary bg-primary/[0.06] border border-primary/10 rounded-xl hover:bg-primary/10 transition-colors"
            style={{ fontWeight: 500 }}
          >
            {showAddField ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showAddField ? 'Cancel' : 'Add field'}
          </button>
        }>Client-Specific Fields</SectionHeader>

          {/* Add new field form */}
          <AnimatePresence>
            {showAddField && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="p-4 rounded-lg bg-accent/30 border border-border/50 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Label</div>
                      <input
                        type="text"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        placeholder="e.g. Preferred Name"
                        className="w-full px-2.5 py-1.5 text-[14px] bg-input-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Type</div>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-[14px] bg-input-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Long text</option>
                        <option value="toggle">Toggle</option>
                        <option value="select">Dropdown</option>
                      </select>
                    </div>
                  </div>
                  {newFieldType === 'select' && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Options (comma-separated)</div>
                      <input
                        type="text"
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                        placeholder="Option 1, Option 2, Option 3"
                        className="w-full px-2.5 py-1.5 text-[14px] bg-input-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                  <button
                    onClick={addClientField}
                    disabled={!newFieldLabel.trim() || saving}
                    className="px-3 py-1.5 text-[13px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                    style={{ fontWeight: 500 }}
                  >
                    {saving ? 'Adding...' : 'Add field'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {clientFieldsWithValues.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clientFieldsWithValues.map((field: any, i: number) => {
                const realIndex = clientSpecific.indexOf(field);
                return (
                  <div key={i} className="p-3.5 rounded-lg bg-accent/20 border border-border/50 group relative">
                    <button
                      onClick={() => deleteClientField(realIndex)}
                      className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded text-muted-foreground/0 group-hover:text-muted-foreground/40 hover:!text-destructive hover:bg-destructive/10 transition-all"
                      title="Remove field"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>{field.label}</div>
                    {renderEditableField(
                      `cl-${realIndex}`,
                      field,
                      field.value,
                      (val) => saveClientField(realIndex, val),
                      (field.type === 'toggle' || field.type === 'checkbox') ? () => toggleClientField(realIndex, !!field.value) : undefined,
                    )}
                  </div>
                );
              })}
            </div>
          ) : !showAddField ? (
            <div className="text-center py-6">
              <ClipboardList className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
              <div className="text-[13px] text-muted-foreground/50">No client-specific fields yet</div>
            </div>
          ) : null}
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Projects Tab
// ═══════════════════════════════════════════════════════════════════
function ProjectsTab({ projects, client, canViewFinancials, onAddProject, onNavigate }: any) {
  return (
    <SectionCard>
      <SectionHeader action={
        <button onClick={onAddProject} className="px-3.5 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all" style={{ fontWeight: 600 }}>
          Add project
        </button>
      }>
        Projects <span className="text-muted-foreground/60 ml-1">({projects.length})</span>
      </SectionHeader>
      {projects.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-accent/40">
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Project</th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Status</th>
                  {canViewFinancials && <th className="text-right px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Value</th>}
                  <th className="text-right px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Hours</th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Dates</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project: any) => (
                  <tr key={project.id} className="border-t border-border/40 hover:bg-accent/20 transition-colors cursor-pointer" onClick={() => onNavigate(project.id)}>
                    <td className="px-4 py-3.5 text-[13px]" style={{ fontWeight: 600 }}>{project.name}</td>
                    <td className="px-4 py-3.5">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded-lg ${project.status === "In Progress" ? "bg-primary/[0.07] text-primary" : "bg-accent/60 text-muted-foreground"}`} style={{ fontWeight: 600 }}>
                        <div className={`w-1.5 h-1.5 rounded-circle ${project.status === "In Progress" ? "bg-primary" : "bg-muted-foreground/40"}`} />
                        {project.status}
                      </div>
                    </td>
                    {canViewFinancials && (
                      <td className="px-4 py-3.5 text-[13px] text-right tabular-nums" style={{ fontWeight: 600 }}>
                        ${(project.totalValue || 0).toLocaleString()}
                        {(() => {
                          if (!project.totalValue || project.totalValue <= 0 || !project.hours || project.hours <= 0) return null;
                          const effRate = Math.round(project.totalValue / project.hours);
                          const rateColor = effRate < (client.rate * 0.5) ? '#c27272' : effRate < client.rate ? '#bfa044' : '#2e7d9a';
                          return <div className="text-[10px] mt-0.5 tabular-nums" style={{ fontWeight: 600, color: rateColor }}>${effRate}/hr effective</div>;
                        })()}
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-[13px] text-right tabular-nums text-muted-foreground">{project.hours || 0}/{project.estimatedHours || 0}h</td>
                    <td className="px-4 py-3.5 text-[12px] text-muted-foreground">{project.startDate}{project.endDate ? ` — ${project.endDate}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-accent/40 flex items-center justify-center">
            <FileText className="w-5 h-5 text-muted-foreground/30" />
          </div>
          <div className="text-[14px]" style={{ fontWeight: 600 }}>No projects yet</div>
          <div className="text-[12px] text-muted-foreground/60 mt-1">Add your first project to start tracking</div>
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
      <SectionHeader action={
        <button onClick={onLogSession} className="px-3.5 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all" style={{ fontWeight: 600 }}>
          Log session
        </button>
      }>
        Time Sessions <span className="text-muted-foreground/60 ml-1">({clientSessions.length})</span>
      </SectionHeader>
      {clientSessions.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-accent/40">
                  <th className="w-10 px-2 py-3">
                    <button onClick={onToggleSelectAll} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      {selectedIds.size === clientSessions.length && clientSessions.length > 0 ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Date</th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Description</th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Tags</th>
                  <th className="text-right px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Duration</th>
                  {canViewFinancials && <th className="text-right px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Cost</th>}
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {clientSessions.map((session: any) => (
                  <tr key={session.id} className={`group border-t border-border/40 hover:bg-accent/20 transition-colors ${selectedIds.has(session.id) ? "bg-primary/[0.04]" : ""}`}>
                    <td className="px-2 py-3.5">
                      <button onClick={() => onToggleSelect(session.id)} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        {selectedIds.has(session.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-muted-foreground tabular-nums" style={{ fontWeight: 500 }}>{session.date}</td>
                    <td className="px-4 py-3.5">
                      <div className="text-[13px]" style={{ fontWeight: 600 }}>{session.task || "—"}</div>
                      {session.projectName && <div className="text-[11px] text-muted-foreground mt-0.5">{session.projectName}</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(session.workTags || []).map((tag: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 bg-accent/80 text-muted-foreground text-[10px] rounded-lg" style={{ fontWeight: 600 }}>{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-right tabular-nums" style={{ fontWeight: 600 }}>{session.duration}h</td>
                    {canViewFinancials && (
                      <td className="px-4 py-3.5 text-right">
                        <div className="text-[13px] tabular-nums" style={{ fontWeight: 600 }}>${session.revenue.toLocaleString()}</div>
                        {!session.billable && <span className="px-1.5 py-0.5 bg-accent/80 text-muted-foreground text-[10px] rounded-lg" style={{ fontWeight: 600 }}>Non-billable</span>}
                      </td>
                    )}
                    <td className="px-2 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); onEditSession(session); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-all" title="Edit session">
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
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-accent/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-muted-foreground/30"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div className="text-[14px]" style={{ fontWeight: 600 }}>No sessions logged</div>
          <div className="text-[12px] text-muted-foreground/60 mt-1">Log your first session to start tracking</div>
        </div>
      )}
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Retainer Tab
// ═══════════════════════════════════════════════════════════════════
function RetainerTab({ client, clientId, workspaceId, clientSessions, onUpdateClient, sentThresholds, setSentThresholds, resending, setResending, sendingManualUpdate, setSendingManualUpdate, confirmSendUpdate, setConfirmSendUpdate, emailStatuses, getDeliveryStatus }: any) {
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editingCycle, setEditingCycle] = useState(false);
  const [cycleStart, setCycleStart] = useState(client.retainerCycleStart || '');
  const [cycleDays, setCycleDays] = useState(client.retainerCycleDays || 30);
  const retainerPlanning = getRetainerPlanning(client.customFields);
  const scheduledCarryoverHours = Math.max(0, Number(retainerPlanning.pendingCarryoverHours || 0));
  const scheduledBaseHours = Math.max(0, Number(retainerPlanning.nextCycleBaseHours ?? client.retainerTotal ?? 0));
  const [editingResetPlan, setEditingResetPlan] = useState(false);
  const [plannedBaseHours, setPlannedBaseHours] = useState(String(scheduledBaseHours));
  const [plannedCarryoverHours, setPlannedCarryoverHours] = useState(String(scheduledCarryoverHours));

  const hoursUsed = (client.retainerTotal || 0) - (client.retainerRemaining || 0);
  const usagePct = client.retainerTotal ? Math.round((hoursUsed / client.retainerTotal) * 100) : 0;
  const retainerStatus = client.retainerStatus || 'active';
  const nextCycleHours = Math.max(0, (Number(plannedBaseHours) || 0) + (Number(plannedCarryoverHours) || 0));

  useEffect(() => {
    setPlannedBaseHours(String(scheduledBaseHours));
    setPlannedCarryoverHours(String(scheduledCarryoverHours));
  }, [scheduledBaseHours, scheduledCarryoverHours, client.id]);

  // Load retainer history
  useEffect(() => {
    if (!clientId || !workspaceId) return;
    setHistoryLoading(true);
    supabase
      .from('retainer_history')
      .select('*')
      .eq('client_id', clientId)
      .eq('workspace_id', workspaceId)
      .order('cycle_end', { ascending: false })
      .then(({ data }) => {
        setHistory(data || []);
        setHistoryLoading(false);
      });
  }, [clientId, workspaceId]);

  // Calculate cycle info
  const cycleStartDate = client.retainerCycleStart ? new Date(client.retainerCycleStart + 'T00:00:00') : null;
  const cycleEndDate = cycleStartDate ? new Date(cycleStartDate.getTime() + (client.retainerCycleDays || 30) * 86400000) : null;
  const daysLeft = cycleEndDate ? Math.max(0, Math.ceil((cycleEndDate.getTime() - Date.now()) / 86400000)) : null;
  const totalCycleDays = client.retainerCycleDays || 30;
  const daysPassed = daysLeft !== null ? totalCycleDays - daysLeft : 0;
  const cyclePct = totalCycleDays > 0 ? Math.round((daysPassed / totalCycleDays) * 100) : 0;

  const handleManualReset = async () => {
    setResetting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const nextBaseHours = Math.max(0, Number(retainerPlanning.nextCycleBaseHours ?? client.retainerTotal ?? 0));
      const carryoverHours = Math.max(0, Number(retainerPlanning.pendingCarryoverHours ?? 0));
      const nextCycleTotal = nextBaseHours + carryoverHours;

      // Snapshot current cycle to history
      if (client.retainerCycleStart) {
        await supabase.from('retainer_history').insert({
          workspace_id: workspaceId,
          client_id: clientId,
          cycle_start: client.retainerCycleStart,
          cycle_end: todayStr,
          hours_total: client.retainerTotal || 0,
          hours_used: hoursUsed,
          hours_remaining: client.retainerRemaining || 0,
          revenue: hoursUsed * (client.rate || 0),
          rate: client.rate || 0,
        });
      }
      await onUpdateClient({
        retainerTotal: nextCycleTotal,
        retainerRemaining: nextCycleTotal,
        retainerCycleStart: todayStr,
        customFields: updateRetainerPlanning(client.customFields, {
          nextCycleBaseHours: null,
          pendingCarryoverHours: null,
        }),
      });
      // Reload history
      const { data } = await supabase.from('retainer_history').select('*').eq('client_id', clientId).eq('workspace_id', workspaceId).order('cycle_end', { ascending: false });
      setHistory(data || []);
      setEditingResetPlan(false);
      toast.success(carryoverHours > 0 ? `Retainer reset with ${carryoverHours}h carried over` : 'Retainer reset successfully');
    } catch (err) {
      toast.error('Failed to reset retainer');
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await onUpdateClient({ retainerStatus: newStatus });
      toast.success(`Retainer ${newStatus === 'active' ? 'activated' : newStatus === 'paused' ? 'paused' : 'canceled'}`);
    } catch {
      toast.error('Failed to update retainer status');
    }
  };

  const handleSaveCycle = async () => {
    try {
      const updates: any = { retainerCycleDays: cycleDays };
      if (cycleStart) updates.retainerCycleStart = cycleStart;
      await onUpdateClient(updates);
      setEditingCycle(false);
      toast.success('Cycle settings updated');
    } catch {
      toast.error('Failed to update cycle settings');
    }
  };

  // Utilization efficiency for history insights
  const avgUtilization = history.length > 0
    ? Math.round(history.reduce((sum, h) => sum + (h.hours_total > 0 ? (h.hours_used / h.hours_total) * 100 : 0), 0) / history.length)
    : 0;
  const avgRevenue = history.length > 0
    ? Math.round(history.reduce((sum, h) => sum + (h.revenue || 0), 0) / history.length)
    : 0;

  return (
    <>
      {/* Status banner */}
      {retainerStatus !== 'active' && (
        <div className={`rounded-lg px-4 py-3 mb-1 flex items-center justify-between ${retainerStatus === 'paused' ? 'bg-warning/10 border border-warning/20' : 'bg-destructive/10 border border-destructive/20'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-circle ${retainerStatus === 'paused' ? 'bg-warning' : 'bg-destructive'}`} />
            <span className="text-[13px]" style={{ fontWeight: 600 }}>
              Retainer is {retainerStatus}
            </span>
          </div>
          <button onClick={() => handleStatusChange('active')} className="text-[12px] text-primary hover:text-primary/80 transition-colors" style={{ fontWeight: 500 }}>
            Resume
          </button>
        </div>
      )}

      {/* Usage */}
      <SectionCard>
        <SectionHeader>Retainer Usage</SectionHeader>
        <div className="flex justify-between items-baseline mb-4">
          <div className="text-[14px] text-muted-foreground">
            <span style={{ fontWeight: 500 }} className="text-foreground">{hoursUsed}h</span> used of {client.retainerTotal || 0}h
            <span className="text-muted-foreground ml-1.5">({client.retainerRemaining || 0}h remaining)</span>
          </div>
          <div className="text-[24px] tabular-nums" style={{ fontWeight: 600, color: getUsageTextColor(usagePct) }}>{usagePct}%</div>
        </div>
        <div className="h-3 bg-accent/60 rounded-circle overflow-hidden">
          <motion.div className="h-full rounded-circle" style={{ background: getUsageBarColor(usagePct) }} initial={{ width: 0 }} animate={{ width: `${usagePct}%` }} transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }} />
        </div>
        {usagePct >= 70 && (
          <div className="mt-3 text-[13px] flex items-center gap-1.5" style={{ color: getUsageTextColor(usagePct) }}>
            <div className="w-1.5 h-1.5 rounded-circle" style={{ backgroundColor: getUsageTextColor(usagePct) }} />
            {usagePct >= 85 ? "Running low — consider discussing renewal or overage terms" : "Over 70% used — monitor remaining hours"}
          </div>
        )}

        {/* Cycle timeline */}
        {cycleStartDate && cycleEndDate && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground" style={{ fontWeight: 500 }}>Cycle progress</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{daysLeft} days remaining</span>
            </div>
            <div className="h-1.5 bg-accent/60 rounded-circle overflow-hidden mb-2">
              <div className="h-full rounded-circle bg-primary/40 transition-all duration-500" style={{ width: `${cyclePct}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{format(cycleStartDate, 'MMM d')}</span>
              <span>{format(cycleEndDate, 'MMM d')}</span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Retainer Details & Controls */}
      <SectionCard>
        <SectionHeader>Retainer Details</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <MetricCard label="Monthly price" value={`$${((client.retainerTotal || 0) * (client.rate || 0)).toLocaleString()}`} />
          <MetricCard label="Rate" value={`$${client.rate || 0}/hr`} />
          <MetricCard label="Cycle length" value={`${client.retainerCycleDays || 30} days`} />
        </div>

        {/* Cycle settings */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 600 }}>Cycle settings</span>
            {!editingCycle ? (
              <button onClick={() => setEditingCycle(true)} className="text-[11px] text-primary hover:text-primary/80 transition-colors" style={{ fontWeight: 500 }}>Edit</button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingCycle(false)} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors" style={{ fontWeight: 500 }}>Cancel</button>
                <button onClick={handleSaveCycle} className="text-[11px] text-primary hover:text-primary/80 transition-colors" style={{ fontWeight: 500 }}>Save</button>
              </div>
            )}
          </div>
          {editingCycle ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block" style={{ fontWeight: 500 }}>Cycle start date</label>
                <input type="date" value={cycleStart} onChange={(e) => setCycleStart(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-input-background border border-border rounded-lg" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block" style={{ fontWeight: 500 }}>Cycle length (days)</label>
                <input type="number" value={cycleDays} onChange={(e) => setCycleDays(Number(e.target.value))} min={1} max={365} className="w-full px-3 py-2 text-[13px] bg-input-background border border-border rounded-lg" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
              <div className="flex items-center justify-between bg-accent/30 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Start date</span>
                <span style={{ fontWeight: 500 }}>{client.retainerCycleStart ? format(new Date(client.retainerCycleStart + 'T00:00:00'), 'MMM d, yyyy') : 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between bg-accent/30 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Cycle length</span>
                <span style={{ fontWeight: 500 }}>{client.retainerCycleDays || 30} days</span>
              </div>
            </div>
          )}
        </div>

        {/* Status controls */}
        <div className="border-t border-border pt-4 mt-4">
          <span className="text-[12px] text-muted-foreground mb-3 block" style={{ fontWeight: 600 }}>Retainer controls</span>
          <div className="flex flex-wrap gap-2">
            {/* Manual reset */}
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors" style={{ fontWeight: 500 }}>
                <TrendingUp className="w-3 h-3" /> Reset retainer
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 text-[12px] rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors" style={{ fontWeight: 500 }}>Cancel</button>
                <button onClick={handleManualReset} disabled={resetting} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50" style={{ fontWeight: 500 }}>
                  {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  {resetting ? 'Resetting…' : 'Confirm reset'}
                </button>
              </div>
            )}

            {/* Pause/Resume */}
            {retainerStatus === 'active' && (
              <button onClick={() => handleStatusChange('paused')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg border border-warning/30 text-warning hover:bg-warning/10 transition-colors" style={{ fontWeight: 500 }}>
                Pause retainer
              </button>
            )}

            {/* Cancel */}
            {retainerStatus !== 'canceled' && (
              <button onClick={() => handleStatusChange('canceled')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors" style={{ fontWeight: 500 }}>
                Cancel retainer
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center justify-between mb-3 gap-3">
            <div>
              <span className="text-[12px] text-muted-foreground block" style={{ fontWeight: 600 }}>Next reset adjustment</span>
              <span className="text-[11px] text-muted-foreground">Plan next cycle hours and any one-time carry-over.</span>
            </div>
            {!editingResetPlan ? (
              <button onClick={() => setEditingResetPlan(true)} className="text-[11px] text-primary hover:text-primary/80 transition-colors" style={{ fontWeight: 500 }}>Edit</button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPlannedBaseHours(String(scheduledBaseHours));
                    setPlannedCarryoverHours(String(scheduledCarryoverHours));
                    setEditingResetPlan(false);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await onUpdateClient({
                        customFields: updateRetainerPlanning(client.customFields, {
                          nextCycleBaseHours: Math.max(0, Number(plannedBaseHours) || 0),
                          pendingCarryoverHours: Math.max(0, Number(plannedCarryoverHours) || 0),
                        }),
                      });
                      setEditingResetPlan(false);
                      toast.success('Next reset updated');
                    } catch {
                      toast.error('Failed to save next reset');
                    }
                  }}
                  className="text-[11px] text-primary hover:text-primary/80 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {editingResetPlan ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block" style={{ fontWeight: 500 }}>Next cycle base hours</label>
                  <input type="number" value={plannedBaseHours} onChange={(e) => setPlannedBaseHours(e.target.value)} min={0} step="0.25" className="w-full px-3 py-2 text-[13px] bg-input-background border border-border rounded-lg tabular-nums" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block" style={{ fontWeight: 500 }}>Carry-over hours</label>
                  <input type="number" value={plannedCarryoverHours} onChange={(e) => setPlannedCarryoverHours(e.target.value)} min={0} step="0.25" className="w-full px-3 py-2 text-[13px] bg-input-background border border-border rounded-lg tabular-nums" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setPlannedCarryoverHours(String(client.retainerRemaining || 0))} className="px-2.5 py-1.5 text-[11px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors" style={{ fontWeight: 500 }}>
                  Use current leftover ({client.retainerRemaining || 0}h)
                </button>
                <span className="text-[11px] text-muted-foreground">Next cycle will start at <span className="text-foreground tabular-nums" style={{ fontWeight: 600 }}>{nextCycleHours}h</span>.</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px]">
              <div className="flex items-center justify-between bg-accent/30 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Base hours</span>
                <span className="tabular-nums" style={{ fontWeight: 500 }}>{scheduledBaseHours}h</span>
              </div>
              <div className="flex items-center justify-between bg-accent/30 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Carry-over</span>
                <span className="tabular-nums" style={{ fontWeight: 500 }}>{scheduledCarryoverHours}h</span>
              </div>
              <div className="flex items-center justify-between bg-accent/30 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Next reset starts at</span>
                <span className="tabular-nums" style={{ fontWeight: 600 }}>{scheduledBaseHours + scheduledCarryoverHours}h</span>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Retainer History & Insights */}
      <SectionCard>
        <SectionHeader>Cycle History & Insights</SectionHeader>
        {history.length > 0 ? (
          <>
            {/* Summary insights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <MetricCard label="Avg utilization" value={`${avgUtilization}%`} accent={avgUtilization < 70} />
              <MetricCard label="Avg revenue" value={`$${avgRevenue.toLocaleString()}`} />
              <MetricCard label="Cycles tracked" value={history.length} />
              <MetricCard label="Total revenue" value={`$${history.reduce((s, h) => s + (h.revenue || 0), 0).toLocaleString()}`} />
            </div>

            {/* Usage bar chart */}
            <div className="mb-5">
              <div className="text-[11px] text-muted-foreground mb-2" style={{ fontWeight: 500 }}>Utilization by cycle</div>
              <div className="flex items-end gap-1.5" style={{ height: 80 }}>
                {history.slice(0, 12).reverse().map((h, i) => {
                  const pct = h.hours_total > 0 ? (h.hours_used / h.hours_total) * 100 : 0;
                  const barH = Math.max((pct / 100) * 72, 3);
                  const color = pct >= 85 ? '#c27272' : pct >= 70 ? '#bfa044' : '#2e7d9a';
                  return (
                    <div key={h.id} className="flex-1 flex flex-col items-center gap-1" title={`${format(new Date(h.cycle_start + 'T00:00:00'), 'MMM d')} – ${format(new Date(h.cycle_end + 'T00:00:00'), 'MMM d')}: ${Math.round(pct)}% used`}>
                      <div className="w-full rounded-t transition-all" style={{ height: barH, backgroundColor: color, opacity: 0.6, maxWidth: 28 }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1.5 mt-1">
                {history.slice(0, 12).reverse().map((h) => (
                  <div key={h.id} className="flex-1 text-center text-[8px] text-muted-foreground truncate">
                    {format(new Date(h.cycle_start + 'T00:00:00'), 'MMM')}
                  </div>
                ))}
              </div>
            </div>

            {/* History table */}
            <div className="overflow-hidden rounded-lg border border-border/60">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border bg-accent/30">
                      <th className="text-left px-3 py-2 text-muted-foreground" style={{ fontWeight: 600 }}>Period</th>
                      <th className="text-right px-3 py-2 text-muted-foreground" style={{ fontWeight: 600 }}>Used</th>
                      <th className="text-right px-3 py-2 text-muted-foreground" style={{ fontWeight: 600 }}>Total</th>
                      <th className="text-right px-3 py-2 text-muted-foreground" style={{ fontWeight: 600 }}>Utilization</th>
                      <th className="text-right px-3 py-2 text-muted-foreground" style={{ fontWeight: 600 }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => {
                      const pct = h.hours_total > 0 ? Math.round((h.hours_used / h.hours_total) * 100) : 0;
                      return (
                        <tr key={h.id} className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors">
                          <td className="px-3 py-2.5">
                            <span style={{ fontWeight: 500 }}>{format(new Date(h.cycle_start + 'T00:00:00'), 'MMM d')} – {format(new Date(h.cycle_end + 'T00:00:00'), 'MMM d, yyyy')}</span>
                          </td>
                          <td className="text-right px-3 py-2.5 tabular-nums">{h.hours_used}h</td>
                          <td className="text-right px-3 py-2.5 tabular-nums text-muted-foreground">{h.hours_total}h</td>
                          <td className="text-right px-3 py-2.5 tabular-nums" style={{ fontWeight: 500, color: getUsageTextColor(pct) }}>{pct}%</td>
                          <td className="text-right px-3 py-2.5 tabular-nums" style={{ fontWeight: 500 }}>${(h.revenue || 0).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-[12px] text-muted-foreground">
            {historyLoading ? 'Loading history…' : 'No cycle history yet. History will be recorded when the retainer resets.'}
          </div>
        )}
      </SectionCard>

      {/* Send retainer update */}
      <SectionCard>
        <SectionHeader>Send retainer update</SectionHeader>
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
        <SectionHeader>Email Activity</SectionHeader>
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
      <SectionHeader>Files <span className="text-muted-foreground/60 ml-1">({files.length})</span></SectionHeader>
      {files.length > 0 && (
        <div className="space-y-1 mb-4">
          {files.map((f: any) => (
            <div key={f.name} className="flex items-center gap-3 py-3 px-3.5 rounded-xl hover:bg-accent/30 transition-colors group border border-transparent hover:border-border/40">
              <div className="w-9 h-9 rounded-xl bg-accent/50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-muted-foreground/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] truncate" style={{ fontWeight: 600 }}>{f.name.replace(/^\d+-/, "")}</div>
                <div className="text-[11px] text-muted-foreground/60">{formatFileSize(f.size)}</div>
              </div>
              {f.url && (
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent/60 text-muted-foreground transition-all">
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}
              <button onClick={() => onDelete(f.name)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent/60 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
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
        className="border-2 border-dashed border-border/60 rounded-2xl p-10 flex flex-col items-center gap-2.5 hover:bg-accent/20 hover:border-primary/20 transition-all cursor-pointer"
      >
        {uploading ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : (
          <div className="w-10 h-10 rounded-2xl bg-accent/50 flex items-center justify-center">
            <Upload className="w-4 h-4 text-muted-foreground/60" />
          </div>
        )}
        <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>{uploading ? "Uploading..." : "Drop files here or click to upload"}</span>
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
      <SectionHeader>Notes</SectionHeader>
      {clientId && <ClientNotes clientId={clientId} projects={projects} />}
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Checklists Tab
// ═══════════════════════════════════════════════════════════════════
function ChecklistsTab({ clientId, workspaceId }: { clientId: string; workspaceId: string }) {
  return (
    <SectionCard>
      <SectionHeader>Checklists</SectionHeader>
      <ChecklistPanel clientId={clientId} workspaceId={workspaceId} />
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Portal Tab
// ═══════════════════════════════════════════════════════════════════
function PortalTab({ client, clientId, portalConfig, portalLoading, copied, onCopyPortalLink, onGeneratePortal, onTogglePortal }: any) {
  return (
    <SectionCard>
      <SectionHeader>Client Portal</SectionHeader>
      <div className="space-y-4">
        <div className="text-[13px] text-muted-foreground">
          Generate a read-only portal link to share with this client. They'll see project progress, time logged, and{" "}
          {client.showPortalCosts !== false ? "billing totals" : "activity only (costs hidden)"}.
        </div>
        {!portalConfig ? (
          <button onClick={onGeneratePortal} disabled={portalLoading} className="inline-flex items-center gap-2 px-4 py-2 text-[12px] bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60" style={{ fontWeight: 600 }}>
            {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            Generate portal link
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-circle ${portalConfig.active ? "bg-[#2e7d9a]" : "bg-zinc-300"}`} />
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
              <div className="w-1 h-1 rounded-circle bg-muted-foreground/40" />
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
function SettingsTab({ client, clientId, confirmArchive, setConfirmArchive, onArchive, onRestore, onPermanentDelete, onNavigateEdit }: any) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isArchived = client.status === 'Archived';

  return (
    <>
      <SectionCard>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] mb-1" style={{ fontWeight: 600 }}>Edit client</div>
            <div className="text-[12px] text-muted-foreground">Update identity, financial terms, flags, custom fields, and branding</div>
          </div>
          <button onClick={onNavigateEdit} className="px-4 py-2 text-[12px] bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all" style={{ fontWeight: 600 }}>
            Edit client
          </button>
        </div>
      </SectionCard>

      <SectionCard className="border-destructive/20">
        <SectionHeader>
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive/60" />
            Danger zone
          </span>
        </SectionHeader>

        {/* Archive */}
        {!isArchived && (
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
        )}

        {/* Restore — only for archived clients */}
        {isArchived && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-border/50">
            <div>
              <div className="text-[14px] mb-1" style={{ fontWeight: 500 }}>Restore this client</div>
              <div className="text-[13px] text-muted-foreground">Move this client back to active status. All data will be preserved.</div>
            </div>
            <button onClick={onRestore} className="px-4 py-2 text-[13px] border border-border rounded-lg hover:bg-accent/60 transition-all whitespace-nowrap" style={{ fontWeight: 500 }}>
              Restore to active
            </button>
          </div>
        )}

        {/* Permanent delete — only for archived clients */}
        {isArchived && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[14px] mb-1" style={{ fontWeight: 500 }}>Permanently delete this client</div>
              <div className="text-[13px] text-muted-foreground">This will permanently remove the client and all associated sessions, projects, invoices, notes, and files. This action cannot be undone.</div>
            </div>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 text-[13px] text-[#c27272] border border-[rgba(194,114,114,0.3)] rounded-lg hover:bg-[rgba(194,114,114,0.08)] transition-all whitespace-nowrap" style={{ fontWeight: 500 }}>
                Delete permanently
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-[13px] rounded-lg border border-border text-muted-foreground hover:bg-accent/40 transition-all" style={{ fontWeight: 500 }}>Cancel</button>
                <button onClick={onPermanentDelete} className="px-3 py-1.5 text-[13px] rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all whitespace-nowrap" style={{ fontWeight: 500 }}>
                  Yes, delete everything
                </button>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </>
  );
}
