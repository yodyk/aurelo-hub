import { useState, useEffect, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/data/DataContext";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string;
  avatarUrl: string | null;
}

interface Assignment {
  id: string;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  memberAvatarUrl: string | null;
}

const COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
];

function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function MemberAvatar({ name, email, avatarUrl, id, size = "sm" }: {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  id: string;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "md" ? "w-8 h-8 text-[11px]" : "w-7 h-7 text-[10px]";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || email}
        title={name || email}
        className={`${sizeClass} rounded-full ring-2 ring-card object-cover`}
      />
    );
  }

  return (
    <div
      title={name || email}
      className={`${sizeClass} rounded-full flex items-center justify-center ring-2 ring-card ${colorForId(id)}`}
      style={{ fontWeight: 600 }}
    >
      {getInitials(name, email)}
    </div>
  );
}

interface Props {
  clientId: string;
  compact?: boolean;
}

export default function ClientAssignmentManager({ clientId, compact = false }: Props) {
  const { workspaceId } = useData();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!workspaceId) return;

    const [assignRes, memberRes] = await Promise.all([
      supabase
        .from("client_assignments")
        .select("id, member_id, workspace_members(id, name, email, avatar_url)")
        .eq("client_id", clientId)
        .eq("workspace_id", workspaceId) as any,
      supabase
        .from("workspace_members")
        .select("id, name, email, role, avatar_url")
        .eq("workspace_id", workspaceId)
        .eq("status", "active"),
    ]);

    const mapped: Assignment[] = (assignRes.data || [])
      .filter((r: any) => r.workspace_members)
      .map((r: any) => ({
        id: r.id,
        memberId: r.workspace_members.id,
        memberName: r.workspace_members.name,
        memberEmail: r.workspace_members.email,
        memberAvatarUrl: r.workspace_members.avatar_url,
      }));

    setAssignments(mapped);
    setMembers(
      (memberRes.data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        avatarUrl: m.avatar_url,
      }))
    );
    setLoading(false);
  }, [workspaceId, clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignedIds = new Set(assignments.map((a) => a.memberId));
  const available = members.filter((m) => !assignedIds.has(m.id));

  const handleAssign = async (memberId: string) => {
    if (!workspaceId) return;
    const { error } = await supabase.from("client_assignments").insert({
      client_id: clientId,
      member_id: memberId,
      workspace_id: workspaceId,
    });
    if (error) {
      toast.error("Failed to assign member");
      return;
    }
    toast.success("Member assigned");
    loadData();
    setOpen(false);
  };

  const handleUnassign = async (assignmentId: string) => {
    const { error } = await supabase.from("client_assignments").delete().eq("id", assignmentId);
    if (error) {
      toast.error("Failed to remove assignment");
      return;
    }
    toast.success("Member removed");
    loadData();
  };

  if (loading) return null;

  // ── Compact mode (for table cells) ──
  if (compact) {
    return (
      <div className="flex items-center -space-x-2">
        {assignments.slice(0, 4).map((a) => (
          <MemberAvatar
            key={a.id}
            name={a.memberName}
            email={a.memberEmail}
            avatarUrl={a.memberAvatarUrl}
            id={a.memberId}
          />
        ))}
        {assignments.length > 4 && (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] ring-2 ring-card bg-muted text-muted-foreground" style={{ fontWeight: 600 }}>
            +{assignments.length - 4}
          </div>
        )}
        {assignments.length === 0 && (
          <span className="text-[12px] text-muted-foreground/40">—</span>
        )}
      </div>
    );
  }

  // ── Full mode (for detail pages) ──
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted-foreground" style={{ fontWeight: 600 }}>
          Assigned team ({assignments.length})
        </div>
        {available.length > 0 && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1 text-[12px] text-primary hover:text-primary/80 transition-colors" style={{ fontWeight: 500 }}>
                <Plus className="w-3.5 h-3.5" />
                Assign
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <div className="text-[11px] text-muted-foreground px-2 py-1.5 mb-1" style={{ fontWeight: 600 }}>
                Add team member
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {available.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleAssign(m.id)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-accent/60 transition-colors text-left"
                  >
                    <MemberAvatar name={m.name} email={m.email} avatarUrl={m.avatarUrl} id={m.id} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>{m.name || m.email}</div>
                      {m.name && <div className="text-[11px] text-muted-foreground truncate">{m.email}</div>}
                    </div>
                    <span className="text-[10px] text-muted-foreground/60" style={{ fontWeight: 500 }}>{m.role}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="text-[12px] text-muted-foreground/50 py-2">No team members assigned</div>
      ) : (
        <div className="space-y-1.5">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 group py-1">
              <MemberAvatar name={a.memberName} email={a.memberEmail} avatarUrl={a.memberAvatarUrl} id={a.memberId} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>{a.memberName || a.memberEmail}</div>
                {a.memberName && <div className="text-[11px] text-muted-foreground truncate">{a.memberEmail}</div>}
              </div>
              <button
                onClick={() => handleUnassign(a.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                title="Remove assignment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── For Team page: show assigned clients for a member ──
export function MemberClientAssignments({ memberId, workspaceId }: { memberId: string; workspaceId: string }) {
  const { clients } = useData();
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const loadAssignments = useCallback(async () => {
    const { data } = await supabase
      .from("client_assignments")
      .select("client_id")
      .eq("member_id", memberId)
      .eq("workspace_id", workspaceId);
    setClientIds((data || []).map((r: any) => r.client_id));
    setLoading(false);
  }, [memberId, workspaceId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const assignedClients = clients.filter((c) => clientIds.includes(c.id));
  const availableClients = clients.filter((c) => c.status !== "Archived" && !clientIds.includes(c.id));

  const handleAssign = async (clientId: string) => {
    const { error } = await supabase.from("client_assignments").insert({
      client_id: clientId,
      member_id: memberId,
      workspace_id: workspaceId,
    });
    if (error) {
      toast.error("Failed to assign client");
      return;
    }
    toast.success("Client assigned");
    loadAssignments();
    setOpen(false);
  };

  const handleUnassign = async (clientId: string) => {
    const { error } = await supabase
      .from("client_assignments")
      .delete()
      .eq("client_id", clientId)
      .eq("member_id", memberId);
    if (error) {
      toast.error("Failed to remove client");
      return;
    }
    toast.success("Client removed");
    loadAssignments();
  };

  if (loading) return <span className="text-[12px] text-muted-foreground/40">—</span>;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center -space-x-1.5">
        {assignedClients.slice(0, 3).map((c) => (
          <div
            key={c.id}
            title={c.name}
            className="w-6 h-6 rounded-full bg-primary/8 flex items-center justify-center text-[9px] text-primary ring-2 ring-card"
            style={{ fontWeight: 600 }}
          >
            {c.name.charAt(0)}
          </div>
        ))}
        {assignedClients.length > 3 && (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[9px] text-muted-foreground ring-2 ring-card" style={{ fontWeight: 600 }}>
            +{assignedClients.length - 3}
          </div>
        )}
      </div>
      {assignedClients.length > 0 && (
        <span className="text-[11px] text-muted-foreground" style={{ fontWeight: 500 }}>
          {assignedClients.length} client{assignedClients.length !== 1 ? 's' : ''}
        </span>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="w-6 h-6 rounded-full border border-dashed border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
            <Plus className="w-3 h-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="text-[11px] text-muted-foreground px-2 py-1.5 mb-1" style={{ fontWeight: 600 }}>
            Assign to client
          </div>
          {assignedClients.length > 0 && (
            <div className="mb-2 pb-2 border-b border-border">
              <div className="text-[10px] text-muted-foreground/60 px-2 mb-1" style={{ fontWeight: 600 }}>ASSIGNED</div>
              {assignedClients.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-2 py-1.5 rounded-md">
                  <span className="text-[12px]" style={{ fontWeight: 500 }}>{c.name}</span>
                  <button
                    onClick={() => handleUnassign(c.id)}
                    className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {availableClients.length === 0 ? (
              <div className="text-[12px] text-muted-foreground/50 px-2 py-2">No more clients available</div>
            ) : (
              availableClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAssign(c.id)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-accent/60 transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/8 flex items-center justify-center text-[9px] text-primary" style={{ fontWeight: 600 }}>
                    {c.name.charAt(0)}
                  </div>
                  <span className="text-[13px] truncate" style={{ fontWeight: 500 }}>{c.name}</span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
