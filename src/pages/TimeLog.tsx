import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { Plus, ChevronDown, Download, FolderKanban, Repeat, Pencil, Search, X, CheckSquare, Square, Receipt } from "lucide-react";
import { motion } from "motion/react";
import { useData } from "../data/DataContext";
import { LogSessionModal, EditSessionModal } from "../components/Modals";
import BulkSessionActions from "../components/BulkSessionActions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/data/AuthContext";
import { NotificationEvents } from "@/data/notificationsApi";
import { startOfDay, subDays, startOfMonth, startOfQuarter, startOfYear, isBefore, isAfter, startOfWeek, endOfWeek } from "date-fns";
import * as invoiceApi from "../data/invoiceApi";
import type { Invoice } from "../data/invoiceApi";
import { usePlan } from "../data/PlanContext";
import RecurringSessionsManager from "../components/RecurringSessionsManager";
import { PageHeader, SegmentedControl, type SegmentOption } from "@/components/primitives/composition";
import { useRoleAccess } from "@/data/useRoleAccess";
import { formatMoney } from "@/lib/format";


const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const } },
};

function parseSessionDate(dateStr: string): Date | null {
  try { return new Date(dateStr); } catch { return null; }
}

type TopTab = "sessions" | "recurring";

export default function TimeLog() {
  const navigate = useNavigate();
  const { sessions, clients, addSession, updateSession, deleteSession, allProjects, loadAllProjects } = useData();
  const { workspaceId } = useAuth();
  const { canViewFinancials } = useRoleAccess();
  const { can } = usePlan();
  const [topTab, setTopTab] = useState<TopTab>("sessions");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [billableFilter, setBillableFilter] = useState<"all" | "billable" | "non">("all");
  const [dateRange, setDateRange] = useState("This Month");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (can("clientInvoicing")) invoiceApi.loadInvoices().then(setInvoices).catch(() => {});
    loadAllProjects().catch(() => {});
  }, [can]);

  const invoicedSessionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of invoices) {
      if (inv.status !== "voided" && inv.status !== "cancelled") {
        for (const s of inv.createdFromSessions || []) map.set(s, inv.number);
        for (const li of inv.lineItems) for (const sid of li.sessionIds || []) map.set(sid, inv.number);
      }
    }
    return map;
  }, [invoices]);

  // Week-to-date for header
  const weekStats = useMemo(() => {
    const now = new Date();
    const wStart = startOfWeek(now, { weekStartsOn: 1 });
    const wEnd = endOfWeek(now, { weekStartsOn: 1 });
    let hours = 0, billableHours = 0, accrued = 0;
    for (const s of sessions) {
      const d = parseSessionDate(s.date);
      if (!d) continue;
      const day = startOfDay(d);
      if (isBefore(day, wStart) || isAfter(day, wEnd)) continue;
      hours += s.duration || 0;
      if (s.billable) { billableHours += s.duration || 0; accrued += s.revenue || 0; }
    }
    return { hours, billableHours, accrued };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    let s = sessions;
    const today = startOfDay(new Date());
    let fromDate: Date | null = null;
    switch (dateRange) {
      case "Last 7 days": fromDate = subDays(today, 7); break;
      case "Last 30 days": fromDate = subDays(today, 30); break;
      case "This Month": fromDate = startOfMonth(today); break;
      case "This Quarter": fromDate = startOfQuarter(today); break;
      case "This Year": fromDate = startOfYear(today); break;
    }
    if (fromDate) {
      s = s.filter((ses: any) => {
        const d = parseSessionDate(ses.date);
        if (!d) return true;
        return !isBefore(startOfDay(d), fromDate!);
      });
    }
    if (selectedClient) s = s.filter((ses: any) => ses.clientId === selectedClient);
    if (billableFilter === "billable") s = s.filter((ses: any) => ses.billable);
    if (billableFilter === "non") s = s.filter((ses: any) => !ses.billable);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      s = s.filter((ses: any) => {
        const task = (ses.task || "").toLowerCase();
        const client = (ses.client || "").toLowerCase();
        const tags = (ses.workTags || []).join(" ").toLowerCase();
        return task.includes(q) || client.includes(q) || tags.includes(q);
      });
    }
    return s;
  }, [sessions, selectedClient, billableFilter, dateRange, searchQuery]);

  const groupedSessions = useMemo(() => {
    const groups: { label: string; sessions: any[]; totalHours: number; totalRevenue: number }[] = [];
    const seen = new Set<string>();
    for (const session of filteredSessions) {
      const group = session.dateGroup || session.date || "Unknown";
      if (!seen.has(group)) {
        seen.add(group);
        const groupSessions = filteredSessions.filter((s: any) => (s.dateGroup || s.date) === group);
        groups.push({
          label: group,
          sessions: groupSessions,
          totalHours: groupSessions.reduce((s: number, sess: any) => s + sess.duration, 0),
          totalRevenue: groupSessions.reduce((s: number, sess: any) => s + (sess.billable ? sess.revenue : 0), 0),
        });
      }
    }
    return groups;
  }, [filteredSessions]);

  const handleExportCSV = () => {
    const headers = "Date,Client,Description,Tags,Duration (hrs),Revenue,Billable,Applied To,Project\n";
    const rows = filteredSessions.map((s: any) =>
      `"${s.date}","${s.client}","${s.task}","${(s.workTags || []).join(", ")}",${s.duration},${s.revenue},${s.billable},"${s.allocationType || "general"}","${s.projectName || ""}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "aurelo-time-sessions.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleLogSession = async (session: any) => {
    await addSession(session);
    toast.success("Session logged");
    if (workspaceId) {
      try {
        const clientName = clients.find(c => c.id === session.clientId)?.name || 'Client';
        const hours = typeof session.duration === 'number' ? session.duration : 0;
        await NotificationEvents.sessionLogged(workspaceId, clientName, hours, { clientId: session.clientId });
      } catch (err) { console.error('[TimeLog] notification error:', err); }
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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredSessions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredSessions.map((s: any) => s.id)));
  }, [filteredSessions, selectedIds.size]);

  const selectedSessions = useMemo(
    () => filteredSessions.filter((s: any) => selectedIds.has(s.id)),
    [filteredSessions, selectedIds],
  );

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} sessions? This cannot be undone.`)) return;
    for (const id of selectedIds) await deleteSession(id);
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} sessions deleted`);
  };

  const handleBulkExport = () => {
    const headers = "Date,Client,Description,Tags,Duration (hrs),Revenue,Billable,Applied To,Project\n";
    const rows = selectedSessions.map((s: any) =>
      `"${s.date}","${s.client}","${s.task}","${(s.workTags || []).join(", ")}",${s.duration},${s.revenue},${s.billable},"${s.allocationType || "general"}","${s.projectName || ""}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "aurelo-selected-sessions.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${selectedSessions.length} sessions exported`);
  };

  const handleBulkInvoice = async () => {
    const uniqueClients = new Set(selectedSessions.map((s: any) => s.clientId));
    if (uniqueClients.size !== 1) { toast.error("Select sessions from only one client to generate an invoice"); return; }
    const clientId = selectedSessions[0].clientId;
    const client = clients.find((c: any) => c.id === clientId);
    if (!client) return;
    try {
      const { data: memberData } = await supabase.from('workspace_members').select('workspace_id').limit(1).single();
      if (!memberData) throw new Error('No workspace found');
      const wsId = memberData.workspace_id;
      const { data: seqData } = await supabase.from('invoice_sequences').select('next_number').eq('workspace_id', wsId).single();
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
        workspace_id: wsId, number, client_id: clientId, client_name: client.name,
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

  const topTabs: SegmentOption<TopTab>[] = [
    { value: "sessions", label: "Sessions" },
    { value: "recurring", label: "Recurring" },
  ];

  return (
    <motion.div data-tour="time-log" className="w-full min-w-0" variants={container} initial="hidden" animate="show">
      <PageHeader
        title="Time"
        subtitle={
          canViewFinancials ? (
            <span className="tabular-nums">
              {weekStats.hours}h this week
              <span className="opacity-40 mx-1.5">·</span>
              {weekStats.billableHours}h billable
              <span className="opacity-40 mx-1.5">·</span>
              {formatMoney(weekStats.accrued, { precision: "compact" })} accrued
            </span>
          ) : (
            <span className="tabular-nums">{weekStats.hours}h this week</span>
          )
        }
        actions={
          <>
            <button
              onClick={handleExportCSV}
              aria-label="Export CSV"
              className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-[var(--hairline)] hover:bg-accent/60 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowLogModal(true)}
              className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-all cursor-pointer text-[13px]"
              style={{ fontWeight: 600 }}
            >
              <Plus className="w-3.5 h-3.5" />
              Log session
            </button>
          </>
        }
      />

      <div className="px-4 lg:px-6 py-6">
        <motion.div variants={item} className="mb-6">
          <SegmentedControl<TopTab> options={topTabs} value={topTab} onChange={setTopTab} ariaLabel="Time view" />
        </motion.div>

        {topTab === "sessions" && (
          <>
            {/* Filter row */}
            <motion.div variants={item} className="flex flex-wrap items-center gap-2 mb-5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sessions"
                  className="pl-8 pr-7 h-9 w-56 bg-transparent border border-[var(--hairline)] rounded-md text-[13px] placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <FilterSelect
                value={dateRange}
                onChange={setDateRange}
                options={["This Month", "Last 7 days", "Last 30 days", "This Quarter", "This Year", "All time"]}
              />

              <FilterSelect
                value={selectedClient || ""}
                onChange={(v) => setSelectedClient(v || null)}
                options={[
                  { value: "", label: "All clients" },
                  ...clients
                    .filter((c: any) => c.status === "Active" || c.status === "Prospect")
                    .map((c: any) => ({ value: c.id, label: c.name })),
                ]}
              />

              <SegmentedControl<"all" | "billable" | "non">
                options={[
                  { value: "all", label: "All" },
                  { value: "billable", label: "Billable" },
                  { value: "non", label: "Non-bill." },
                ]}
                value={billableFilter}
                onChange={setBillableFilter}
                ariaLabel="Billable filter"
              />

              {(searchQuery || selectedClient || billableFilter !== "all" || dateRange !== "This Month") && (
                <button
                  onClick={() => {
                    setSearchQuery(""); setSelectedClient(null);
                    setBillableFilter("all"); setDateRange("This Month");
                  }}
                  className="h-9 px-3 text-[12.5px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  Clear
                </button>
              )}
            </motion.div>

            {/* Select-all bar */}
            {filteredSessions.length > 0 && (
              <div className="flex items-center justify-between mb-2 px-1">
                <button
                  onClick={toggleSelectAll}
                  className="inline-flex items-center gap-2 text-[12.5px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  {selectedIds.size === filteredSessions.length && filteredSessions.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  {selectedIds.size > 0 ? `${selectedIds.size} of ${filteredSessions.length} selected` : "Select all"}
                </button>
                <div className="type-meta text-muted-foreground">
                  {filteredSessions.length} sessions
                </div>
              </div>
            )}

            {/* Date-grouped ledger */}
            <div className="space-y-0">
              {groupedSessions.map((group) => (
                <div key={group.label}>
                  {/* Sticky date header */}
                  <div className="sticky top-[64px] z-10 bg-background flex items-baseline justify-between gap-3 py-2 border-b border-[var(--hairline)]">
                    <div className="type-eyebrow">{group.label}</div>
                    <div className="type-meta text-muted-foreground tabular-nums">
                      {group.totalHours}h
                      {canViewFinancials && (
                        <>
                          <span className="opacity-40 mx-1.5">·</span>
                          ${group.totalRevenue.toLocaleString()}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--hairline)]">
                    {group.sessions.map((session: any) => {
                      const isSelected = selectedIds.has(session.id);
                      return (
                        <div
                          key={session.id}
                          className={`flex items-center gap-3 px-3 py-2.5 hover:bg-accent/20 transition-colors group ${isSelected ? "bg-primary/[0.04]" : ""}`}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelect(session.id); }}
                            className="flex-shrink-0 w-4 h-4 inline-flex items-center justify-center cursor-pointer"
                            aria-label="Select session"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>

                          <button
                            onClick={() => session.clientId && navigate(`/clients/${session.clientId}`)}
                            className="text-[13px] truncate w-32 text-left text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            style={{ fontWeight: 500 }}
                          >
                            {session.client}
                          </button>

                          <div className="flex-1 text-[13px] text-muted-foreground truncate min-w-0">
                            {session.task}
                          </div>

                          {session.allocationType && session.allocationType !== "general" && (
                            <div className="hidden md:inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
                              {session.allocationType === "retainer" ? (
                                <><Repeat className="w-2.5 h-2.5" />Retainer</>
                              ) : (
                                <><FolderKanban className="w-2.5 h-2.5" />{session.projectName || "Project"}</>
                              )}
                            </div>
                          )}

                          {invoicedSessionMap.has(String(session.id)) && (
                            <div
                              className="hidden md:inline-flex items-center gap-1 text-[10.5px] text-muted-foreground"
                              title={`Invoiced on #${invoicedSessionMap.get(String(session.id))}`}
                            >
                              <Receipt className="w-2.5 h-2.5" />
                              #{invoicedSessionMap.get(String(session.id))}
                            </div>
                          )}

                          {!session.billable && (
                            <span className="text-[10.5px] text-muted-foreground/70" style={{ fontWeight: 500 }}>
                              Non-billable
                            </span>
                          )}

                          <div className="text-right tabular-nums w-14 text-[13px]" style={{ fontWeight: 500 }}>
                            {session.duration}h
                          </div>
                          {canViewFinancials && (
                            <div className="text-right tabular-nums w-20 text-[13px]" style={{ fontWeight: 600 }}>
                              ${session.revenue}
                            </div>
                          )}

                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSession(session); }}
                            className="flex-shrink-0 w-7 h-7 inline-flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                            aria-label="Edit session"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {groupedSessions.length === 0 && (
                <div className="py-20 text-center type-meta text-muted-foreground">
                  No sessions logged today. The day is still yours.
                </div>
              )}
            </div>
          </>
        )}

        {topTab === "recurring" && (
          <RecurringSessionsManager clients={clients} projects={allProjects} />
        )}
      </div>

      <LogSessionModal open={showLogModal} onClose={() => setShowLogModal(false)} onSave={handleLogSession} clients={clients} />
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

// ── Hairline select ─────────────────────────────────────────────────
function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  options: Array<string | { value: string; label: string }>;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none h-9 pl-3 pr-7 bg-transparent border border-[var(--hairline)] rounded-md text-[13px] cursor-pointer focus:outline-none focus:border-primary/40 transition-colors"
        style={{ fontWeight: 500 }}
      >
        {options.map((opt) => {
          if (typeof opt === "string") return <option key={opt} value={opt}>{opt}</option>;
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
    </div>
  );
}
