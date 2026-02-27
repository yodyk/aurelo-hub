import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { Calendar, Filter, Plus, Clock, DollarSign, ChevronDown, Download, FolderKanban, Repeat, Pencil, Trash2, MoreHorizontal, Search, X, CheckSquare, Square } from "lucide-react";
import { motion } from "motion/react";
import { useData } from "../data/DataContext";
import { LogSessionModal, EditSessionModal } from "../components/Modals";
import BulkSessionActions from "../components/BulkSessionActions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { startOfDay, subDays, startOfMonth, startOfQuarter, startOfYear, isBefore, isAfter } from "date-fns";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

/** Parse the formatted date string back to a Date for comparison */
function parseSessionDate(dateStr: string): Date | null {
  try {
    return new Date(dateStr);
  } catch {
    return null;
  }
}

export default function TimeLog() {
  const navigate = useNavigate();
  const { sessions, clients, addSession, updateSession, deleteSession, workCategoryNames } = useData();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("This Month");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredSessions = useMemo(() => {
    let s = sessions;

    // Date range filtering
    const today = startOfDay(new Date());
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    switch (dateRange) {
      case "Last 7 days":
        fromDate = subDays(today, 7);
        break;
      case "Last 30 days":
        fromDate = subDays(today, 30);
        break;
      case "This Month":
        fromDate = startOfMonth(today);
        break;
      case "This Quarter":
        fromDate = startOfQuarter(today);
        break;
      case "This Year":
        fromDate = startOfYear(today);
        break;
      // "All time" — no filter
    }

    if (fromDate || toDate) {
      s = s.filter((ses: any) => {
        const d = parseSessionDate(ses.date);
        if (!d) return true;
        const day = startOfDay(d);
        if (fromDate && isBefore(day, fromDate)) return false;
        if (toDate && isAfter(day, toDate)) return false;
        return true;
      });
    }

    // Tag filter
    if (selectedFilter && selectedFilter !== "All") {
      s = s.filter(
        (ses: any) => (ses.tags || []).includes(selectedFilter) || (ses.workTags || []).includes(selectedFilter),
      );
    }

    // Client filter
    if (selectedClient) {
      s = s.filter((ses: any) => ses.clientId === selectedClient);
    }

    // Search filter
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
  }, [sessions, selectedFilter, selectedClient, dateRange, searchQuery]);

  const totalInvested = filteredSessions.reduce((sum: number, session: any) => sum + session.duration, 0);
  const totalBillable = filteredSessions
    .filter((s: any) => s.billable)
    .reduce((sum: number, session: any) => sum + session.revenue, 0);
  const billableHours = filteredSessions
    .filter((s: any) => s.billable)
    .reduce((sum: number, s: any) => sum + s.duration, 0);

  // Group sessions by dateGroup
  const groupedSessions = useMemo(() => {
    const groups: { label: string; sessions: any[]; totalHours: number }[] = [];
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
        });
      }
    }
    return groups;
  }, [filteredSessions]);

  const handleExportCSV = () => {
    const headers = "Date,Client,Description,Tags,Duration (hrs),Revenue,Billable,Applied To,Project\n";
    const rows = filteredSessions
      .map(
        (s: any) =>
          `"${s.date}","${s.client}","${s.task}","${(s.workTags || []).join(", ")}",${s.duration},${s.revenue},${s.billable},"${s.allocationType || "general"}","${s.projectName || ""}"`,
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aurelo-time-sessions.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleLogSession = async (session: any) => {
    await addSession(session);
    toast.success("Session logged");
  };

  const handleUpdateSession = async (sessionId: string, updates: any) => {
    await updateSession(sessionId, updates);
    toast.success("Session updated");
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
    toast.success("Session deleted");
  };

  // ── Bulk selection helpers ──
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredSessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSessions.map((s: any) => s.id)));
    }
  }, [filteredSessions, selectedIds.size]);

  const selectedSessions = useMemo(
    () => filteredSessions.filter((s: any) => selectedIds.has(s.id)),
    [filteredSessions, selectedIds],
  );

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} sessions? This cannot be undone.`)) return;
    for (const id of selectedIds) {
      await deleteSession(id);
    }
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} sessions deleted`);
  };

  const handleBulkExport = () => {
    const headers = "Date,Client,Description,Tags,Duration (hrs),Revenue,Billable,Applied To,Project\n";
    const rows = selectedSessions
      .map(
        (s: any) =>
          `"${s.date}","${s.client}","${s.task}","${(s.workTags || []).join(", ")}",${s.duration},${s.revenue},${s.billable},"${s.allocationType || "general"}","${s.projectName || ""}"`,
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aurelo-selected-sessions.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${selectedSessions.length} sessions exported`);
  };

  const handleBulkInvoice = async () => {
    const uniqueClients = new Set(selectedSessions.map((s: any) => s.clientId));
    if (uniqueClients.size !== 1) {
      toast.error("Select sessions from only one client to generate an invoice");
      return;
    }

    const clientId = selectedSessions[0].clientId;
    const client = clients.find((c: any) => c.id === clientId);
    if (!client) return;

    try {
      // Get workspace ID from auth context
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .limit(1)
        .single();
      if (!memberData) throw new Error('No workspace found');
      const wsId = memberData.workspace_id;

      // Get next invoice number
      const { data: seqData } = await supabase
        .from('invoice_sequences')
        .select('next_number')
        .eq('workspace_id', wsId)
        .single();

      let nextNum = seqData?.next_number || 1001;
      const number = `INV-${nextNum}`;

      // Build line items from selected sessions
      const lineItems = selectedSessions.map((s: any) => ({
        id: crypto.randomUUID(),
        description: `${s.task || "Work session"} (${s.date})`,
        quantity: s.duration,
        rate: s.duration > 0 ? s.revenue / s.duration : 0,
        amount: s.revenue,
        sessionIds: [s.id],
      }));

      const subtotal = lineItems.reduce((sum: number, li: any) => sum + li.amount, 0);

      // Insert invoice
      const { error: insertErr } = await supabase.from('invoices').insert({
        workspace_id: wsId,
        number,
        client_id: clientId,
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

  const allTags = [
    "All",
    ...(workCategoryNames.length > 0
      ? workCategoryNames
      : ["Design", "Development", "Meetings", "Strategy", "Prospecting"]),
  ];

  return (
    <motion.div
      data-tour="time-log"
      className="max-w-7xl mx-auto px-6 lg:px-12 py-12"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[24px] tracking-tight mb-1" style={{ fontWeight: 600 }}>
            Time Log
          </h1>
          <p className="text-[14px] text-muted-foreground">
            {filteredSessions.length} sessions &middot; {totalInvested}h logged
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3 py-2 text-[14px] border border-border rounded-lg hover:bg-accent/40 transition-all"
            style={{ fontWeight: 500 }}
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            Export
          </button>
          <button
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[14px] rounded-lg hover:bg-primary/90 transition-all duration-200"
            style={{ fontWeight: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <Plus className="w-4 h-4" />
            Log session
          </button>
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div variants={item} className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-6 group hover:-translate-y-0.5 transition-all duration-300 shadow-[0_1px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent/60 flex items-center justify-center group-hover:bg-primary/8 transition-colors">
              <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
              Total hours
            </div>
          </div>
          <div
            className="text-[32px] leading-none tracking-tight text-primary tabular-nums"
            style={{ fontWeight: 600 }}
          >
            {totalInvested}h
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5">{dateRange}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 group hover:-translate-y-0.5 transition-all duration-300 shadow-[0_1px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent/60 flex items-center justify-center group-hover:bg-primary/8 transition-colors">
              <DollarSign className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
              Billable revenue
            </div>
          </div>
          <div
            className="text-[32px] leading-none tracking-tight text-primary tabular-nums"
            style={{ fontWeight: 600 }}
          >
            ${totalBillable.toLocaleString()}
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5">{billableHours}h billable</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 group hover:-translate-y-0.5 transition-all duration-300 shadow-[0_1px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent/60 flex items-center justify-center group-hover:bg-primary/8 transition-colors">
              <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
              Avg. session
            </div>
          </div>
          <div className="text-[32px] leading-none tracking-tight tabular-nums" style={{ fontWeight: 600 }}>
            {(totalInvested / Math.max(filteredSessions.length, 1)).toFixed(1)}h
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5">per session</div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="mb-6 space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions..."
              className="pl-9 pr-8 py-2 w-56 bg-card border border-border rounded-lg text-[14px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="h-8 w-px bg-border self-center" />

          {/* Date range */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2 bg-card border border-border rounded-lg text-[14px] hover:bg-accent/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ fontWeight: 500 }}
            >
              <option>This Month</option>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>This Quarter</option>
              <option>This Year</option>
              <option>All time</option>
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Client filter */}
          <div className="relative">
            <select
              value={selectedClient || ""}
              onChange={(e) => setSelectedClient(e.target.value || null)}
              className="appearance-none px-4 py-2 pr-8 bg-card border border-border rounded-lg text-[14px] hover:bg-accent/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ fontWeight: 500 }}
            >
              <option value="">All clients</option>
              {clients
                .filter((c: any) => c.status === "Active" || c.status === "Prospect")
                .map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Active filter indicators */}
          {(searchQuery || selectedClient || (selectedFilter && selectedFilter !== "All")) && (
            <>
              <div className="h-8 w-px bg-border self-center" />
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedClient(null);
                  setSelectedFilter(null);
                  setDateRange("This Month");
                }}
                className="px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-lg border border-border transition-all"
                style={{ fontWeight: 500 }}
              >
                Clear filters
              </button>
            </>
          )}
        </div>

        {/* Tag pills */}
        <div className="flex gap-2 flex-wrap">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedFilter(selectedFilter === tag ? null : tag)}
              className={`px-3 py-1.5 text-[12px] rounded-lg border transition-all duration-200 ${
                selectedFilter === tag
                  ? "bg-primary/8 border-primary/20 text-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
              style={{ fontWeight: 500 }}
            >
              {tag}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Select all toggle */}
      {filteredSessions.length > 0 && (
        <motion.div variants={item} className="flex items-center gap-2 mb-2 px-1">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontWeight: 500 }}
          >
            {selectedIds.size === filteredSessions.length && filteredSessions.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {selectedIds.size > 0 ? `${selectedIds.size} of ${filteredSessions.length} selected` : "Select all"}
          </button>
        </motion.div>
      )}

      {/* Grouped Time Sessions */}
      <motion.div variants={item} className="space-y-6">
        {groupedSessions.map((group, groupIndex) => (
          <div key={group.label}>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
                {group.label}
              </div>
              <div className="text-[12px] text-muted-foreground tabular-nums">{group.totalHours}h</div>
            </div>
            <div
              className="bg-card border border-border rounded-xl overflow-hidden"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)" }}
            >
              {group.sessions.map((session: any, index: number) => {
                const isSelected = selectedIds.has(session.id);
                return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 + groupIndex * 0.05 + index * 0.03 }}
                  className={`flex items-center gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer group ${isSelected ? "bg-primary/4" : ""}`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(session.id);
                    }}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>

                  <div
                    className="flex-1 flex items-center gap-4 min-w-0"
                    onClick={() => {
                      if (session.clientId) navigate(`/clients/${session.clientId}`);
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] text-primary" style={{ fontWeight: 600 }}>
                        {session.client?.charAt(0) || "?"}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] mb-0.5" style={{ fontWeight: 500 }}>
                        {session.client}
                      </div>
                      <div className="text-[13px] text-muted-foreground truncate">{session.task}</div>
                    </div>

                    {session.allocationType && session.allocationType !== "general" && (
                      <div className="flex-shrink-0">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/6 text-[10px] rounded-full text-primary border border-primary/10"
                          style={{ fontWeight: 500 }}
                        >
                          {session.allocationType === "retainer" ? (
                            <>
                              <Repeat className="w-2.5 h-2.5" />
                              Retainer
                            </>
                          ) : (
                            <>
                              <FolderKanban className="w-2.5 h-2.5" />
                              {session.projectName || "Project"}
                            </>
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-1.5 flex-shrink-0">
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

                    <div className="text-right flex-shrink-0 w-16">
                      <div className="text-[14px] tabular-nums" style={{ fontWeight: 500 }}>
                        {session.duration}h
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 w-16">
                      <div className="text-[14px] tabular-nums" style={{ fontWeight: 500 }}>
                        ${session.revenue}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {session.billable ? (
                        <span
                          className="px-2 py-0.5 bg-primary/8 text-primary text-[10px] rounded-full"
                          style={{ fontWeight: 500 }}
                        >
                          Billable
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 bg-accent/80 text-muted-foreground text-[10px] rounded-full"
                          style={{ fontWeight: 500 }}
                        >
                          Non-billable
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSession(session);
                    }}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-all"
                    title="Edit session"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </motion.div>

      <LogSessionModal
        open={showLogModal}
        onClose={() => setShowLogModal(false)}
        onSave={handleLogSession}
        clients={clients}
      />

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
