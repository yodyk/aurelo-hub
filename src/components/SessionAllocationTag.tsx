import { FolderKanban, Repeat } from "lucide-react";
import { useEffect, useState } from "react";
import { format as formatDateFn, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type RetainerCycle = { client_id: string; cycle_start: string; cycle_end: string };

function parseISO(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function getRetainerCycleLabel(
  session: any,
  client: any,
  retainerHistory: RetainerCycle[],
): string {
  if (!session?.date) return "Retainer";
  const sDate = parseISO(session.date);
  if (!sDate) return "Retainer";

  if (client?.retainerCycleStart) {
    const start = parseISO(client.retainerCycleStart);
    const days = Number(client.retainerCycleDays) || 30;
    if (start) {
      const end = addDays(start, days);
      if (sDate >= start && sDate < end) {
        return `${formatDateFn(start, "MMMM yyyy")} Cycle`;
      }
    }
  }

  const match = retainerHistory.find((r) => {
    if (r.client_id !== session.clientId) return false;
    const cs = parseISO(r.cycle_start);
    const ce = parseISO(r.cycle_end);
    if (!cs || !ce) return false;
    return sDate >= cs && sDate < ce;
  });
  if (match) {
    const cs = parseISO(match.cycle_start);
    if (cs) return `${formatDateFn(cs, "MMMM yyyy")} Cycle`;
  }
  return "Retainer";
}

export function useRetainerHistory(workspaceId: string | null | undefined, clientId?: string) {
  const [retainerHistory, setRetainerHistory] = useState<RetainerCycle[]>([]);
  useEffect(() => {
    if (!workspaceId) return;
    let q = supabase
      .from("retainer_history")
      .select("client_id, cycle_start, cycle_end")
      .eq("workspace_id", workspaceId);
    if (clientId) q = q.eq("client_id", clientId);
    q.then(({ data }) => {
      if (data) setRetainerHistory(data as any);
    });
  }, [workspaceId, clientId]);
  return retainerHistory;
}

export function SessionAllocationTag({
  session,
  client,
  retainerHistory,
  className = "hidden md:inline-flex",
}: {
  session: any;
  client: any;
  retainerHistory: RetainerCycle[];
  className?: string;
}) {
  const type =
    (session?.allocationType as "retainer" | "project" | "general" | null | undefined) ||
    "general";

  if (type === "retainer") {
    const label = getRetainerCycleLabel(session, client, retainerHistory);
    return (
      <span
        title={label}
        className={`${className} items-center gap-1 h-5 px-1.5 rounded-[4px] text-[10.5px] tabular-nums cursor-default`}
        style={{
          background: "color-mix(in oklab, var(--primary) 10%, transparent)",
          color: "var(--primary)",
          fontWeight: 600,
        }}
      >
        <Repeat className="w-2.5 h-2.5" strokeWidth={2} />
        Retainer
      </span>
    );
  }

  if (type === "project") {
    const name = session.projectName || "Project";
    return (
      <span
        title={name}
        className={`${className} items-center gap-1 h-5 px-1.5 rounded-[4px] text-[10.5px] text-foreground/80 cursor-default`}
        style={{ background: "var(--surface-sunken)", fontWeight: 600 }}
      >
        <FolderKanban className="w-2.5 h-2.5" strokeWidth={2} />
        <span className="max-w-[120px] truncate">{name}</span>
      </span>
    );
  }

  return (
    <span
      title="Not linked to a project or retainer"
      className={`${className} items-center gap-1 h-5 px-1.5 rounded-[4px] text-[10.5px] text-muted-foreground cursor-default`}
      style={{ background: "var(--surface-sunken)", fontWeight: 500 }}
    >
      General
    </span>
  );
}
