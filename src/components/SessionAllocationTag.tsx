import { FolderKanban, Repeat } from "lucide-react";
import { useEffect, useState, ReactNode } from "react";
import { format as formatDateFn, addDays } from "date-fns";
import * as Tooltip from "@radix-ui/react-tooltip";
import { supabase } from "@/integrations/supabase/client";

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-50 px-2 py-1 rounded-[4px] text-[11px] font-medium shadow-md"
            style={{
              background: "var(--foreground)",
              color: "var(--background)",
            }}
          >
            {label}
            <Tooltip.Arrow style={{ fill: "var(--foreground)" }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}


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
  const iso = session?.rawDate || session?.date;
  if (!iso) return "Retainer";
  const sDate = parseISO(iso);
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
    const tip = label === "Retainer" ? "Retainer (cycle not found)" : label;
    return (
      <Tip label={tip}>
        <span
          className={`${className} items-center gap-1 h-5 px-1.5 rounded-[4px] text-[10.5px] tabular-nums cursor-default`}
          style={{
            background: "color-mix(in oklab, var(--primary) 10%, transparent)",
            color: "var(--primary)",
            fontWeight: 600,
          }}
        >
          <Repeat className="w-2.5 h-2.5" strokeWidth={2} />
          {label === "Retainer" ? "Retainer" : label.replace(" Cycle", "")}
        </span>
      </Tip>
    );
  }

  if (type === "project") {
    const name = session.projectName || "Project";
    return (
      <Tip label={name}>
        <span
          className={`${className} items-center gap-1 h-5 px-1.5 rounded-[4px] text-[10.5px] text-foreground/80 cursor-default`}
          style={{ background: "var(--surface-sunken)", fontWeight: 600 }}
        >
          <FolderKanban className="w-2.5 h-2.5" strokeWidth={2} />
          <span className="max-w-[120px] truncate">{name}</span>
        </span>
      </Tip>
    );
  }

  return (
    <Tip label="Not linked to a project or retainer">
      <span
        className={`${className} items-center gap-1 h-5 px-1.5 rounded-[4px] text-[10.5px] text-muted-foreground cursor-default`}
        style={{ background: "var(--surface-sunken)", fontWeight: 500 }}
      >
        General
      </span>
    </Tip>
  );
}

