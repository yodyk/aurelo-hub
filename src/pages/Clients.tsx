import { useState, useMemo } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowUpRight, Search, Plus } from "lucide-react";
import { useData } from "../data/DataContext";
import { AddClientModal } from "../components/Modals";
import { toast } from "sonner";
import { usePlan } from "../data/PlanContext";
import { OverLimitBanner, LimitEnforcementModal } from "../components/PlanEnforcement";
import { useRoleAccess } from "../data/useRoleAccess";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../components/ui/table";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const statusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  Active: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", label: "Active" },
  Prospect: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", label: "Prospect" },
  Archived: { dot: "bg-red-400", bg: "bg-red-400/10", text: "text-red-700 dark:text-red-400", label: "Archived" },
};

export default function Clients() {
  const { clients, sessions, addClient } = useData();
  const { wouldExceed, limit, atLimit } = usePlan();
  const { canViewFinancials, canEditClients } = useRoleAccess();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Sort: active/prospect first, then archived (latest updated first)
  const sorted = [...filtered].sort((a, b) => {
    const aArchived = a.status === "Archived" ? 1 : 0;
    const bArchived = b.status === "Archived" ? 1 : 0;
    if (aArchived !== bArchived) return aArchived - bArchived;
    if (aArchived) return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    return 0;
  });
  const activeCount = clients.filter((c) => c.status === "Active").length;
  const nonArchivedCount = clients.filter((c) => c.status !== "Archived").length;
  const totalMonthly = clients
    .filter((c) => c.status === "Active")
    .reduce((s: number, c: any) => s + (c.monthlyEarnings || 0), 0);

  const maxClients = limit("activeClients");
  const isOverLimit = maxClients !== null && nonArchivedCount > maxClients;
  const isAtClientLimit = maxClients !== null && nonArchivedCount >= maxClients;

  // Count sessions logged this month per client
  const sessionsThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      if (s.date >= monthStart) {
        counts[s.clientId] = (counts[s.clientId] || 0) + 1;
      }
    }
    return counts;
  }, [sessions]);

  const handleAddClient = async (client: any) => {
    const { notes, ...clientData } = client;
    const saved = await addClient(clientData);
    if (notes && saved?.id) {
      // notes saved separately if needed
    }
    toast.success(`${client.name} added`);
  };

  const handleAddClientClick = () => {
    if (isAtClientLimit) {
      setShowLimitModal(true);
    } else {
      setShowAddModal(true);
    }
  };

  const renderTable = (clientList: any[], isArchived = false) => (
    <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/60">
            <TableHead className="pl-5 w-[280px]">Client</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[130px]">Type</TableHead>
            {canViewFinancials && <TableHead className="w-[100px] text-right">Rate</TableHead>}
            <TableHead className="w-[120px] text-right">Sessions</TableHead>
            {canViewFinancials && !isArchived && (
              <TableHead className="w-[130px] text-right pr-5">This month</TableHead>
            )}
            {canViewFinancials && isArchived && (
              <TableHead className="w-[130px] text-right pr-5">Lifetime</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientList.map((client: any, index: number) => {
            const sc = statusConfig[client.status] || statusConfig.Archived;
            const sessionCount = sessionsThisMonth[client.id] || 0;
            return (
              <motion.tr
                key={client.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.03, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className={`border-b border-border/40 last:border-0 transition-colors hover:bg-muted/30 ${isArchived ? "opacity-60 hover:opacity-90" : ""}`}
              >
                <TableCell className="pl-5 py-3.5">
                  <Link
                    to={`/clients/${client.id}`}
                    className="flex items-center gap-3 group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/12 transition-colors">
                      <span className="text-[13px] text-primary" style={{ fontWeight: 600 }}>
                        {client.name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] flex items-center gap-1.5 truncate" style={{ fontWeight: 600 }}>
                        {client.name}
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                      {client.contactName && (
                        <div className="text-[12px] text-muted-foreground truncate" style={{ fontWeight: 400 }}>
                          {client.contactName}
                        </div>
                      )}
                    </div>
                  </Link>
                </TableCell>

                <TableCell className="py-3.5">
                  <span className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-md ${sc.bg} ${sc.text}`} style={{ fontWeight: 600 }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>
                </TableCell>

                <TableCell className="py-3.5">
                  <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
                    {client.model}
                  </span>
                </TableCell>

                {canViewFinancials && (
                  <TableCell className="py-3.5 text-right">
                    {client.rate > 0 ? (
                      <span className="text-[14px] text-foreground tabular-nums" style={{ fontWeight: 600 }}>
                        ${client.rate}<span className="text-muted-foreground text-[12px]" style={{ fontWeight: 400 }}>/hr</span>
                      </span>
                    ) : (
                      <span className="text-[13px] text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                )}

                <TableCell className="py-3.5 text-right">
                  <span className="text-[14px] tabular-nums text-muted-foreground" style={{ fontWeight: 500 }}>
                    {sessionCount}
                  </span>
                </TableCell>

                {canViewFinancials && !isArchived && (
                  <TableCell className="py-3.5 text-right pr-5">
                    <span className="text-[14px] text-primary tabular-nums" style={{ fontWeight: 600 }}>
                      ${(client.monthlyEarnings || 0).toLocaleString()}
                    </span>
                  </TableCell>
                )}
                {canViewFinancials && isArchived && (
                  <TableCell className="py-3.5 text-right pr-5">
                    <span className="text-[14px] tabular-nums" style={{ fontWeight: 600 }}>
                      ${(client.lifetimeRevenue || 0).toLocaleString()}
                    </span>
                  </TableCell>
                )}
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <motion.div
      data-tour="client-list"
      className="w-full min-w-0 px-4 lg:px-8 py-8 md:py-14"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[24px] md:text-[28px] tracking-tight mb-1" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
            Clients
          </h1>
          <p className="text-[14px] text-muted-foreground">
            {activeCount} active{canViewFinancials ? <> &middot; ${totalMonthly.toLocaleString()} this month</> : null}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              className="pl-9 pr-4 py-2 text-[14px] bg-accent/40 border border-border rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
          <button
            onClick={handleAddClientClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[14px] rounded-lg hover:bg-primary/90 transition-all duration-200"
            style={{ fontWeight: 500 }}
          >
            <Plus className="w-4 h-4" />
            Add client
          </button>
        </div>
      </motion.div>

      {isOverLimit && (
        <motion.div variants={item} className="mb-6">
          <OverLimitBanner
            limitKey="activeClients"
            currentCount={nonArchivedCount}
            resourceLabel="clients"
            reduceLabel="Archive clients"
          />
        </motion.div>
      )}

      {activeClients.length > 0 && (
        <motion.div variants={item} className="mb-8">
          <div className="text-[12px] text-muted-foreground mb-3 flex items-center gap-2" style={{ fontWeight: 500 }}>
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Active &amp; prospecting
          </div>
          {renderTable(activeClients)}
        </motion.div>
      )}

      {archivedClients.length > 0 && (
        <motion.div variants={item}>
          <div className="text-[12px] text-muted-foreground mb-3 flex items-center gap-2" style={{ fontWeight: 500 }}>
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            Archived
          </div>
          {renderTable(archivedClients, true)}
        </motion.div>
      )}

      <AddClientModal open={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAddClient} />

      <LimitEnforcementModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitKey="activeClients"
        currentCount={nonArchivedCount}
        resourceLabel="clients"
        actionLabel="add a new client"
      />
    </motion.div>
  );
}
