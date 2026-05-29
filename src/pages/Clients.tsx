import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowUpRight, Search, Plus, ChevronRight } from "lucide-react";
import { useData } from "../data/DataContext";
import { AddClientModal } from "../components/Modals";
import { toast } from "sonner";
import { usePlan } from "../data/PlanContext";
import { LimitEnforcementModal } from "../components/PlanEnforcement";
import { useRoleAccess } from "../data/useRoleAccess";
import ClientAssignmentManager from "../components/ClientAssignmentManager";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SegmentedControl, HairlineBar, type SegmentOption } from "@/components/primitives/composition";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

const item = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const } },
};

type StatusFilter = "all" | "Active" | "Prospect" | "Archived";

const statusDot: Record<string, string> = {
  Active: "var(--primary)",
  Prospect: "var(--warning)",
  Archived: "var(--muted-foreground)",
};

export default function Clients() {
  const { clients, sessions, addClient, workspaceId } = useData();
  const { limit } = usePlan();
  const { canViewFinancials } = useRoleAccess();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [faviconUrls, setFaviconUrls] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    supabase.storage.from("logos").list(workspaceId, { limit: 500 }).then(({ data }) => {
      if (!data) return;
      const urls: Record<string, string> = {};
      for (const f of data) {
        const match = f.name.match(/^client-(.+)-favicon\./);
        if (match) {
          urls[match[1]] = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${workspaceId}/${f.name}?t=${Date.now()}`;
        }
      }
      setFaviconUrls(urls);
    });
  }, [workspaceId]);

  const counts = useMemo(() => ({
    all: clients.filter(c => c.status !== "Archived").length,
    Active: clients.filter(c => c.status === "Active").length,
    Prospect: clients.filter(c => c.status === "Prospect").length,
    Archived: clients.filter(c => c.status === "Archived").length,
  }), [clients]);

  const q = searchQuery.trim().toLowerCase();
  const matchesSearch = (c: any) => !q || c.name.toLowerCase().includes(q) || (c.contactName || "").toLowerCase().includes(q);

  // Main visible list (non-archived) based on status filter + search
  const nonArchivedRows = useMemo(() => {
    return clients
      .filter(c => c.status !== "Archived")
      .filter(c => statusFilter === "all" || statusFilter === "Archived" || c.status === statusFilter)
      .filter(matchesSearch);
  }, [clients, statusFilter, q]);

  const archivedRows = useMemo(() => {
    return clients.filter(c => c.status === "Archived").filter(matchesSearch);
  }, [clients, q]);

  // Force archived visible when filter is Archived
  const archivedVisible = statusFilter === "Archived" ? archivedRows : (showArchived ? archivedRows : []);

  const totalMonthly = clients
    .filter(c => c.status === "Active")
    .reduce((s: number, c: any) => s + (c.monthlyEarnings || 0), 0);

  const maxMonthlyEarnings = useMemo(() => {
    return Math.max(1, ...clients.filter((c) => c.status !== "Archived").map((c: any) => c.monthlyEarnings || 0));
  }, [clients]);

  const sessionsThisMonth = useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      if (s.date >= monthStart) counts[s.clientId] = (counts[s.clientId] || 0) + 1;
    }
    return counts;
  }, [sessions]);

  const maxClients = limit("activeClients");
  const isAtClientLimit = maxClients !== null && counts.all >= maxClients;

  const handleAddClient = async (client: any) => {
    const { notes: _notes, ...clientData } = client;
    await addClient(clientData);
    toast.success(`${client.name} added`);
  };

  const handleAddClientClick = () => {
    if (isAtClientLimit) setShowLimitModal(true);
    else setShowAddModal(true);
  };

  const segments: SegmentOption<StatusFilter>[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "Active", label: "Active", count: counts.Active },
    { value: "Prospect", label: "Prospect", count: counts.Prospect },
    { value: "Archived", label: "Archived", count: counts.Archived },
  ];

  return (
    <motion.div
      data-tour="client-list"
      className="w-full min-w-0"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <PageHeader
        title="Clients"
        subtitle={
          <>
            {counts.Active} active
            {canViewFinancials && (
              <>
                <span className="opacity-40 mx-1.5">·</span>
                <span className="tabular-nums">${totalMonthly.toLocaleString()}</span> this month
              </>
            )}
          </>
        }
        actions={
          <button
            onClick={handleAddClientClick}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-primary text-primary-foreground text-[13px] rounded-md hover:opacity-90 transition-all cursor-pointer"
            style={{ fontWeight: 600 }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add client
          </button>
        }
      />

      <div className="px-4 lg:px-6 py-6">
        {/* Controls strip */}
        <motion.div variants={item} className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <SegmentedControl
            options={segments}
            value={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="Filter by status"
          />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients"
              className="pl-8 pr-3 h-9 text-[13px] bg-transparent border border-[var(--hairline)] rounded-md w-56 focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
        </motion.div>

        {/* Table */}
        {nonArchivedRows.length > 0 ? (
          <motion.div variants={item}>
            <ClientTable
              rows={nonArchivedRows}
              faviconUrls={faviconUrls}
              sessionsThisMonth={sessionsThisMonth}
              canViewFinancials={canViewFinancials}
              maxMonthlyEarnings={maxMonthlyEarnings}
              archived={false}
            />
          </motion.div>
        ) : (
          <div className="py-20 text-center type-meta text-muted-foreground">
            {q ? "No clients match that search." : "No clients yet. Aurelo gets useful the moment you add one."}
          </div>
        )}

        {/* Archived group */}
        {statusFilter !== "Archived" && archivedRows.length > 0 && (
          <div className="mt-10">
            <button
              onClick={() => setShowArchived(v => !v)}
              className="flex items-center gap-1.5 type-eyebrow text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronRight
                className="w-3 h-3 transition-transform"
                style={{ transform: showArchived ? "rotate(90deg)" : "rotate(0deg)" }}
              />
              Archived ({archivedRows.length})
            </button>
            {showArchived && (
              <div className="mt-4">
                <ClientTable
                  rows={archivedRows}
                  faviconUrls={faviconUrls}
                  sessionsThisMonth={sessionsThisMonth}
                  canViewFinancials={canViewFinancials}
                  maxMonthlyEarnings={maxMonthlyEarnings}
                  archived={true}
                />
              </div>
            )}
          </div>
        )}

        {statusFilter === "Archived" && archivedVisible.length > 0 && (
          <ClientTable
            rows={archivedVisible}
            faviconUrls={faviconUrls}
            sessionsThisMonth={sessionsThisMonth}
            canViewFinancials={canViewFinancials}
            maxMonthlyEarnings={maxMonthlyEarnings}
            archived={true}
          />
        )}
      </div>

      <AddClientModal open={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAddClient} />
      <LimitEnforcementModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitKey="activeClients"
        currentCount={counts.all}
        resourceLabel="clients"
        actionLabel="add a new client"
      />
    </motion.div>
  );
}

// ── Ledger-style table ──────────────────────────────────────────────
function ClientTable({
  rows,
  faviconUrls,
  sessionsThisMonth,
  canViewFinancials,
  maxMonthlyEarnings,
  archived,
}: {
  rows: any[];
  faviconUrls: Record<string, string>;
  sessionsThisMonth: Record<string, number>;
  canViewFinancials: boolean;
  maxMonthlyEarnings: number;
  archived: boolean;
}) {
  return (
    <div>
      {/* Eyebrow header */}
      <div className="grid grid-cols-[1fr_90px_100px_110px_80px_140px] gap-4 px-3 py-2 border-b border-[var(--hairline)] type-eyebrow text-muted-foreground">
        <div>Client</div>
        <div>Status</div>
        <div>Type</div>
        <div>Team</div>
        {canViewFinancials ? <div className="text-right">Rate</div> : <div />}
        {canViewFinancials ? <div className="text-right">{archived ? "Lifetime" : "This month"}</div> : <div />}
      </div>

      <div className="divide-y divide-[var(--hairline)]">
        {rows.map((client: any) => {
          const sessionCount = sessionsThisMonth[client.id] || 0;
          const earnings = archived ? (client.lifetimeRevenue || 0) : (client.monthlyEarnings || 0);
          const progress = archived ? 0 : Math.min(1, earnings / maxMonthlyEarnings);
          const faviconUrl = faviconUrls[client.id];
          const dot = statusDot[client.status] || "var(--muted-foreground)";

          return (
            <Link
              key={client.id}
              to={`/clients/${client.id}`}
              className={`grid grid-cols-[1fr_90px_100px_110px_80px_140px] gap-4 items-center px-3 h-14 hover:bg-accent/30 transition-colors group ${archived ? "opacity-60 hover:opacity-100" : ""}`}
            >
              {/* Client */}
              <div className="flex items-center gap-3 min-w-0">
                {faviconUrl ? (
                  <img
                    src={faviconUrl}
                    alt={client.name}
                    className="w-8 h-8 rounded-circle object-cover flex-shrink-0"
                    style={{ boxShadow: "0 0 0 1px var(--hairline)" }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-circle flex items-center justify-center flex-shrink-0"
                    style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
                  >
                    <span className="text-[12px] text-primary" style={{ fontWeight: 600 }}>
                      {client.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[13.5px] flex items-center gap-1 truncate" style={{ fontWeight: 600 }}>
                    {client.name}
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  {client.contactName && (
                    <div className="type-meta text-muted-foreground truncate">{client.contactName}</div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground" style={{ fontWeight: 500 }}>
                <span className="w-1.5 h-1.5 rounded-circle" style={{ background: dot }} />
                {client.status}
              </div>

              {/* Type */}
              <div className="text-[12.5px] text-muted-foreground" style={{ fontWeight: 500 }}>
                {client.model || "—"}
              </div>

              {/* Team */}
              <div className="min-w-0" onClick={(e) => e.preventDefault()}>
                <ClientAssignmentManager clientId={client.id} compact />
              </div>

              {/* Rate */}
              {canViewFinancials ? (
                <div className="text-right">
                  {client.rate > 0 ? (
                    <span className="text-[12.5px] tabular-nums" style={{ fontWeight: 600 }}>
                      ${client.rate}
                      <span className="text-muted-foreground text-[11px] ml-0.5" style={{ fontWeight: 400 }}>/hr</span>
                    </span>
                  ) : (
                    <span className="text-[12.5px] text-muted-foreground/50">—</span>
                  )}
                </div>
              ) : <div />}

              {/* Revenue */}
              {canViewFinancials ? (
                <div className="text-right">
                  <div className="text-[12.5px] tabular-nums mb-1" style={{ fontWeight: 600 }}>
                    ${earnings.toLocaleString()}
                    <span className="text-muted-foreground text-[11px] ml-1" style={{ fontWeight: 400 }}>
                      · {sessionCount}
                    </span>
                  </div>
                  {!archived && <HairlineBar value={progress} threshold={false} height={2} />}
                </div>
              ) : <div />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
