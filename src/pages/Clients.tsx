import * as dataApi from "../data/dataApi";
import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowUpRight, Search, Plus } from "lucide-react";
import { useData } from "../data/DataContext";
import { AddClientModal } from "../components/Modals";
import { toast } from "sonner";
import { usePlan } from "../data/PlanContext";
import { OverLimitBanner, LimitEnforcementModal } from "../components/PlanEnforcement";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  Active: { bg: "bg-primary/8", text: "text-primary", dot: "bg-primary" },
  Prospect: { bg: "bg-stone-100", text: "text-stone-500", dot: "bg-stone-400" },
  Archived: { bg: "bg-zinc-100", text: "text-zinc-500", dot: "bg-zinc-400" },
};

export default function Clients() {
  const { clients, addClient } = useData();
  const { wouldExceed, limit, atLimit } = usePlan();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const activeClients = filtered.filter((c) => c.status === "Active" || c.status === "Prospect");
  const archivedClients = filtered.filter((c) => c.status === "Archived");
  const activeCount = clients.filter((c) => c.status === "Active").length;
  const nonArchivedCount = clients.filter((c) => c.status !== "Archived").length;
  const totalMonthly = clients
    .filter((c) => c.status === "Active")
    .reduce((s: number, c: any) => s + (c.monthlyEarnings || 0), 0);

  const maxClients = limit("activeClients");
  const isOverLimit = maxClients !== null && nonArchivedCount > maxClients;
  const isAtClientLimit = maxClients !== null && nonArchivedCount >= maxClients;

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

  return (
    <motion.div
      data-tour="client-list"
      className="max-w-7xl mx-auto px-6 lg:px-12 py-12"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[24px] tracking-tight mb-1" style={{ fontWeight: 600 }}>
            Clients
          </h1>
          <p className="text-[14px] text-muted-foreground">
            {activeCount} active &middot; ${totalMonthly.toLocaleString()} this month
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
            style={{ fontWeight: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <Plus className="w-4 h-4" />
            Add client
          </button>
        </div>
      </motion.div>

      {/* Over-limit warning banner */}
      {isOverLimit && (
        <motion.div variants={item}>
          <OverLimitBanner
            limitKey="activeClients"
            currentCount={nonArchivedCount}
            resourceLabel="clients"
            reduceLabel="Archive clients"
          />
        </motion.div>
      )}

      {/* Active & Prospecting */}
      {activeClients.length > 0 && (
        <motion.div variants={item} className="mb-12">
          <div
            className="text-[13px] text-muted-foreground mb-4 flex items-center gap-2"
            style={{ fontWeight: 500, letterSpacing: "0.02em" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Active &amp; prospecting
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeClients.map((client: any, index: number) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <Link
                  to={`/clients/${client.id}`}
                  className="block bg-card border border-border rounded-xl p-6 hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-300 group shadow-[0_1px_4px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
                        <span className="text-[14px] text-primary" style={{ fontWeight: 600 }}>
                          {client.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-[16px] mb-0.5 flex items-center gap-1.5" style={{ fontWeight: 600 }}>
                          {client.name}
                          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                          {client.contactName}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 px-2 py-0.5 ${statusColors[client.status]?.bg || "bg-zinc-100"} ${statusColors[client.status]?.text || "text-zinc-500"} text-[11px] rounded-full`}
                      style={{ fontWeight: 500 }}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${statusColors[client.status]?.dot || "bg-zinc-400"}`}
                      />
                      {client.status}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="text-[11px] text-muted-foreground bg-accent/60 px-2 py-0.5 rounded-full"
                      style={{ fontWeight: 500 }}
                    >
                      {client.model}
                    </span>
                    {client.rate > 0 && (
                      <span
                        className="text-[11px] text-muted-foreground bg-accent/60 px-2 py-0.5 rounded-full tabular-nums"
                        style={{ fontWeight: 500 }}
                      >
                        ${client.rate}/hr
                      </span>
                    )}
                    {!client.showPortalCosts && (
                      <span
                        className="text-[11px] text-muted-foreground/60 bg-accent/40 px-2 py-0.5 rounded-full"
                        style={{ fontWeight: 500 }}
                      >
                        Costs hidden
                      </span>
                    )}
                  </div>

                  {client.status === "Active" && (
                    <div className="space-y-3 pt-4 border-t border-border/60">
                      <div className="flex justify-between items-baseline">
                        <div className="text-[12px] text-muted-foreground">This month</div>
                        <div className="text-[15px] text-primary tabular-nums" style={{ fontWeight: 600 }}>
                          ${(client.monthlyEarnings || 0).toLocaleString()}
                        </div>
                      </div>
                      {totalMonthly > 0 && (
                        <div className="h-1 bg-accent/60 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary/30 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${((client.monthlyEarnings || 0) / totalMonthly) * 100}%` }}
                            transition={{ delay: 0.4 + index * 0.08, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {client.status === "Prospect" && (
                    <div className="pt-4 border-t border-border/60">
                      <div className="text-[12px] text-muted-foreground">{client.contactEmail}</div>
                    </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Archived */}
      {archivedClients.length > 0 && (
        <motion.div variants={item}>
          <div
            className="text-[13px] text-muted-foreground mb-4 flex items-center gap-2"
            style={{ fontWeight: 500, letterSpacing: "0.02em" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            Archived
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedClients.map((client: any) => (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="block bg-card border border-border rounded-xl p-6 opacity-60 hover:opacity-90 transition-all duration-300 group hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                      <span className="text-[14px] text-zinc-500" style={{ fontWeight: 600 }}>
                        {client.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="text-[16px] mb-0.5" style={{ fontWeight: 600 }}>
                        {client.name}
                      </div>
                      <div className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                        {client.contactName}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 px-2 py-0.5 ${statusColors.Archived.bg} ${statusColors.Archived.text} text-[11px] rounded-full`}
                    style={{ fontWeight: 500 }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${statusColors.Archived.dot}`} />
                    Archived
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="text-[11px] text-muted-foreground bg-accent/60 px-2 py-0.5 rounded-full"
                    style={{ fontWeight: 500 }}
                  >
                    {client.model}
                  </span>
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex justify-between items-baseline">
                    <div className="text-[12px] text-muted-foreground">Lifetime</div>
                    <div className="text-[15px] tabular-nums" style={{ fontWeight: 600 }}>
                      ${(client.lifetimeRevenue || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
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
