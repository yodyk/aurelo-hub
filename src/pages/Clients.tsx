import { motion } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

type ClientStatus = "Active" | "Prospect" | "Archived";
type ClientModel = "Hourly" | "Retainer" | "Project";

interface Client {
  id: string;
  name: string;
  status: ClientStatus;
  model: ClientModel;
  rate: number;
  monthlyEarnings: number;
  hoursLogged: number;
  contactName: string;
}

const sampleClients: Client[] = [
  { id: "1", name: "Arcadia Design", status: "Active", model: "Hourly", rate: 150, monthlyEarnings: 3200, hoursLogged: 21, contactName: "Sarah Chen" },
  { id: "2", name: "Meridian Labs", status: "Active", model: "Retainer", rate: 4500, monthlyEarnings: 2400, hoursLogged: 16, contactName: "Jake Morrison" },
  { id: "3", name: "Beacon Studio", status: "Active", model: "Project", rate: 8000, monthlyEarnings: 1800, hoursLogged: 12, contactName: "Emily Park" },
  { id: "4", name: "Novatech", status: "Prospect", model: "Hourly", rate: 125, monthlyEarnings: 0, hoursLogged: 0, contactName: "David Kim" },
  { id: "5", name: "Vertex Creative", status: "Archived", model: "Hourly", rate: 130, monthlyEarnings: 0, hoursLogged: 45, contactName: "Lisa Wong" },
];

const statusFilters: (ClientStatus | "All")[] = ["All", "Active", "Prospect", "Archived"];

export default function Clients() {
  const [filter, setFilter] = useState<ClientStatus | "All">("All");
  const [search, setSearch] = useState("");

  const filtered = sampleClients.filter((c) => {
    if (filter !== "All" && c.status !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page-container">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground mt-1">{sampleClients.filter((c) => c.status === "Active").length} active clients</p>
          </div>
          <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Client</Button>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1">
            {statusFilters.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

function ClientCard({ client }: { client: Client }) {
  const statusClass = client.status === "Active" ? "status-active" : client.status === "Prospect" ? "status-prospect" : "status-archived";

  return (
    <div className="card-interactive p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">{client.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{client.contactName}</p>
        </div>
        <Badge variant="secondary" className={`${statusClass} text-[10px] font-medium shrink-0`}>{client.status}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] font-medium">{client.model}</Badge>
        <span className="text-xs text-muted-foreground tabular-nums">
          {client.model === "Hourly" ? `$${client.rate}/hr` : `$${client.rate.toLocaleString()}`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
        <div>
          <p className="text-lg font-semibold tabular-nums text-foreground">${client.monthlyEarnings.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">This month</p>
        </div>
        <div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{client.hoursLogged}h</p>
          <p className="text-xs text-muted-foreground">Hours logged</p>
        </div>
      </div>
    </div>
  );
}
