import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MemberInfo {
  id: string;
  name: string | null;
  email: string;
}

interface Props {
  clientId: string;
  workspaceId: string;
  max?: number;
}

// Cache assignments per workspace to avoid repeated queries
const assignmentCache = new Map<string, Map<string, MemberInfo[]>>();

export function useClientAssignments(workspaceId: string | null) {
  const [assignments, setAssignments] = useState<Map<string, MemberInfo[]>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    const cached = assignmentCache.get(workspaceId);
    if (cached) {
      setAssignments(cached);
      setLoaded(true);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("client_assignments")
        .select("client_id, member_id, workspace_members(id, name, email)")
        .eq("workspace_id", workspaceId) as any;

      const map = new Map<string, MemberInfo[]>();
      if (data) {
        for (const row of data) {
          const member = row.workspace_members;
          if (!member) continue;
          const list = map.get(row.client_id) || [];
          list.push({ id: member.id, name: member.name, email: member.email });
          map.set(row.client_id, list);
        }
      }
      assignmentCache.set(workspaceId, map);
      setAssignments(map);
      setLoaded(true);
    })();
  }, [workspaceId]);

  return { assignments, loaded };
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

const COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
];

function colorForMember(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function ClientAssignmentAvatars({ clientId, workspaceId, max = 4 }: Props) {
  const { assignments } = useClientAssignments(workspaceId);
  const members = assignments.get(clientId) || [];

  if (members.length === 0) {
    return <span className="text-[12px] text-muted-foreground/40">—</span>;
  }

  const visible = members.slice(0, max);
  const overflow = members.length - max;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((m) => (
        <div
          key={m.id}
          title={m.name || m.email}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] ring-2 ring-card ${colorForMember(m.id)}`}
          style={{ fontWeight: 600 }}
        >
          {getInitials(m.name, m.email)}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] ring-2 ring-card bg-muted text-muted-foreground"
          style={{ fontWeight: 600 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
