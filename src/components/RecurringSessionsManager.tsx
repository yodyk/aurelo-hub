import { useState, useEffect, useCallback } from "react";
import { Plus, Repeat, Trash2, Pause, Play, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/data/AuthContext";
import { toast } from "sonner";

interface RecurringRule {
  id: string;
  client_id: string;
  project_id: string | null;
  task: string | null;
  notes: string | null;
  duration: number;
  billable: boolean;
  frequency: string;
  skip_weekends: boolean;
  active: boolean;
  last_run_date: string | null;
  created_at: string;
}

interface Props {
  clients: any[];
  projects?: any[];
  /** When provided, locks the form to this client */
  fixedClientId?: string;
}

export default function RecurringSessionsManager({ clients, projects = [], fixedClientId }: Props) {
  const { workspaceId } = useAuth();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [clientId, setClientId] = useState(fixedClientId || "");
  const [projectId, setProjectId] = useState("");
  const [task, setTask] = useState("");
  const [duration, setDuration] = useState("8");
  const [frequency, setFrequency] = useState("daily");
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [billable, setBillable] = useState(true);

  const loadRules = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const query = supabase
      .from("recurring_sessions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (fixedClientId) {
      query.eq("client_id", fixedClientId);
    }

    const { data, error } = await query;
    if (!error && data) setRules(data as RecurringRule[]);
    setLoading(false);
  }, [workspaceId, fixedClientId]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const resetForm = () => {
    setClientId(fixedClientId || "");
    setProjectId("");
    setTask("");
    setDuration("8");
    setFrequency("daily");
    setSkipWeekends(true);
    setBillable(true);
    setShowForm(false);
  };

  const handleCreate = async () => {
    const cid = fixedClientId || clientId;
    if (!cid || !workspaceId) { toast.error("Select a client"); return; }
    const dur = parseFloat(duration);
    if (isNaN(dur) || dur <= 0) { toast.error("Enter a valid duration"); return; }

    const { error } = await supabase.from("recurring_sessions").insert({
      workspace_id: workspaceId,
      client_id: cid,
      project_id: projectId || null,
      task: task || null,
      duration: dur,
      billable,
      frequency,
      skip_weekends: skipWeekends,
    } as any);

    if (error) { toast.error("Failed to create rule"); return; }
    toast.success("Recurring session created");
    resetForm();
    loadRules();
  };

  const handleToggle = async (rule: RecurringRule) => {
    const { error } = await supabase
      .from("recurring_sessions")
      .update({ active: !rule.active } as any)
      .eq("id", rule.id);
    if (!error) {
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: !r.active } : r));
      toast.success(rule.active ? "Rule paused" : "Rule resumed");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("recurring_sessions").delete().eq("id", id);
    if (!error) {
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success("Rule deleted");
    }
  };

  const getClientName = (id: string) => clients.find((c: any) => c.id === id)?.name || "Unknown";
  const getProjectName = (id: string | null) => {
    if (!id) return null;
    return projects.find((p: any) => p.id === id)?.name || null;
  };

  const frequencyLabel: Record<string, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
  const clientProjects = projects.filter((p: any) => p.clientId === (fixedClientId || clientId));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-muted-foreground" />
          <span className="text-[14px]" style={{ fontWeight: 600 }}>Recurring Sessions</span>
          {rules.length > 0 && (
            <span className="text-[11px] text-muted-foreground bg-accent/60 px-1.5 py-0.5 rounded-md" style={{ fontWeight: 600 }}>
              {rules.filter(r => r.active).length} active
            </span>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all flex items-center gap-1.5"
            style={{ fontWeight: 600 }}
          >
            <Plus className="w-3.5 h-3.5" /> Add rule
          </button>
        )}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-accent/30 border border-border/60 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px]" style={{ fontWeight: 600 }}>New Recurring Rule</span>
                <button onClick={resetForm} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-accent/60 text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Client (only if not fixed) */}
                {!fixedClientId && (
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block" style={{ fontWeight: 600 }}>Client</label>
                    <select
                      value={clientId}
                      onChange={e => { setClientId(e.target.value); setProjectId(""); }}
                      className="w-full h-9 px-3 rounded-md border border-border bg-input-background text-[13px]"
                    >
                      <option value="">Select client…</option>
                      {clients.filter((c: any) => c.status === "Active").map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Project */}
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block" style={{ fontWeight: 600 }}>Project (optional)</label>
                  <select
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-border bg-input-background text-[13px]"
                  >
                    <option value="">None</option>
                    {clientProjects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Task */}
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block" style={{ fontWeight: 600 }}>Task / Description</label>
                  <input
                    value={task}
                    onChange={e => setTask(e.target.value)}
                    placeholder="e.g. Full-time work"
                    className="w-full h-9 px-3 rounded-md border border-border bg-input-background text-[13px]"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block" style={{ fontWeight: 600 }}>Duration (hours)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    min="0.25"
                    step="0.25"
                    className="w-full h-9 px-3 rounded-md border border-border bg-input-background text-[13px] tabular-nums"
                  />
                </div>

                {/* Frequency */}
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block" style={{ fontWeight: 600 }}>Frequency</label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-border bg-input-background text-[13px]"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* Skip weekends */}
                <div className="flex items-center gap-3 pt-5">
                  <button
                    type="button"
                    onClick={() => setSkipWeekends(!skipWeekends)}
                    className={`relative w-9 h-5 rounded-circle transition-colors duration-200 ${skipWeekends ? 'bg-primary' : 'bg-switch-background'}`}
                  >
                    <motion.div
                      className="absolute top-0.5 w-4 h-4 rounded-circle bg-white shadow-sm"
                      animate={{ left: skipWeekends ? 18 : 2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  </button>
                  <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Skip weekends</span>
                </div>
              </div>

              {/* Billable toggle + save */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBillable(!billable)}
                    className={`relative w-9 h-5 rounded-circle transition-colors duration-200 ${billable ? 'bg-primary' : 'bg-switch-background'}`}
                  >
                    <motion.div
                      className="absolute top-0.5 w-4 h-4 rounded-circle bg-white shadow-sm"
                      animate={{ left: billable ? 18 : 2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  </button>
                  <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>Billable</span>
                </div>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 text-[12px] bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all"
                  style={{ fontWeight: 600 }}
                >
                  Create Rule
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-circle animate-spin" />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-8 text-[13px] text-muted-foreground">
          <Repeat className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p style={{ fontWeight: 500 }}>No recurring sessions yet</p>
          <p className="text-[12px] mt-1">Create a rule to auto-log sessions daily, weekly, or monthly.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div
              key={rule.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                rule.active
                  ? "bg-card border-border/60"
                  : "bg-accent/20 border-border/30 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-circle flex-shrink-0 ${rule.active ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] truncate" style={{ fontWeight: 600 }}>
                      {!fixedClientId && <span className="text-muted-foreground">{getClientName(rule.client_id)} · </span>}
                      {rule.task || "Untitled"}
                    </span>
                    <span className="text-[10px] bg-accent/80 text-muted-foreground px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ fontWeight: 600 }}>
                      {frequencyLabel[rule.frequency]}
                    </span>
                    {rule.skip_weekends && (
                      <span className="text-[10px] text-muted-foreground/60 flex-shrink-0" style={{ fontWeight: 500 }}>
                        Weekdays only
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <span className="tabular-nums" style={{ fontWeight: 500 }}>{rule.duration}h</span>
                    {!rule.billable && <span>· Non-billable</span>}
                    {getProjectName(rule.project_id) && <span>· {getProjectName(rule.project_id)}</span>}
                    {rule.last_run_date && <span>· Last run: {rule.last_run_date}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggle(rule)}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-all"
                  title={rule.active ? "Pause" : "Resume"}
                >
                  {rule.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  title="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
