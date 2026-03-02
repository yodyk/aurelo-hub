import { useState, useEffect, useMemo } from "react";
import { format, subDays, startOfQuarter, startOfYear } from "date-fns";
import { Mail, ChevronDown, ChevronRight, Loader2, Search, X, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/data/AuthContext";

interface EmailEvent {
  id: string;
  notification_id: string | null;
  resend_email_id: string;
  recipient: string;
  event_type: string;
  bounce_type: string | null;
  created_at: string;
  workspace_id: string;
}

interface NotificationWithEvents {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  email_sent: boolean;
  metadata: any;
  events: EmailEvent[];
}

const EVENT_DISPLAY: Record<string, { label: string; icon: string; color: string }> = {
  sent: { label: "Sent", icon: "→", color: "hsl(var(--muted-foreground))" },
  delivered: { label: "Delivered", icon: "✓", color: "hsl(142 71% 45%)" },
  opened: { label: "Opened", icon: "👁", color: "hsl(var(--primary))" },
  clicked: { label: "Clicked", icon: "↗", color: "hsl(var(--primary))" },
  bounced: { label: "Bounced", icon: "✕", color: "hsl(var(--destructive))" },
  complained: { label: "Complained", icon: "⚠", color: "hsl(var(--destructive))" },
  delayed: { label: "Delayed", icon: "⏳", color: "hsl(45 60% 50%)" },
};

const EVENT_PRIORITY: Record<string, number> = {
  complained: 7,
  bounced: 6,
  clicked: 5,
  opened: 4,
  delivered: 3,
  delayed: 2,
  sent: 1,
};

const STATUS_OPTIONS = ["all", "sent", "delivered", "opened", "bounced", "complained", "delayed"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const DATE_PRESETS = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "This quarter", value: "quarter" },
  { label: "This year", value: "year" },
] as const;
type DatePreset = (typeof DATE_PRESETS)[number]["value"];

function getLatestEvent(events: EmailEvent[]) {
  if (!events.length) return null;
  return events.reduce((best, ev) =>
    (EVENT_PRIORITY[ev.event_type] || 0) > (EVENT_PRIORITY[best.event_type] || 0) ? ev : best
  );
}

function getDateBoundary(preset: DatePreset): Date | null {
  const now = new Date();
  switch (preset) {
    case "7d": return subDays(now, 7);
    case "30d": return subDays(now, 30);
    case "quarter": return startOfQuarter(now);
    case "year": return startOfYear(now);
    default: return null;
  }
}

export default function EmailActivityLog({ clientId }: { clientId?: string }) {
  const { workspaceId } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);

    (async () => {
      let query = supabase
        .from("notifications")
        .select("id, title, body, created_at, email_sent, metadata")
        .eq("workspace_id", workspaceId)
        .eq("event_type", "retainer_warning")
        .order("created_at", { ascending: false })
        .limit(100);

      if (clientId) {
        query = query.contains("metadata", { clientId });
      }

      const { data: notifs } = await query;
      if (!notifs || notifs.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const notifIds = notifs.map((n) => n.id);
      const { data: events } = await supabase
        .from("email_events")
        .select("id, notification_id, resend_email_id, recipient, event_type, bounce_type, created_at, workspace_id")
        .in("notification_id", notifIds)
        .order("created_at", { ascending: true });

      const eventMap = new Map<string, EmailEvent[]>();
      for (const ev of events || []) {
        if (!ev.notification_id) continue;
        if (!eventMap.has(ev.notification_id)) eventMap.set(ev.notification_id, []);
        eventMap.get(ev.notification_id)!.push(ev as EmailEvent);
      }

      setNotifications(
        notifs.map((n) => ({
          ...n,
          metadata: n.metadata as any,
          events: eventMap.get(n.id) || [],
        }))
      );
      setLoading(false);
    })();
  }, [workspaceId, clientId]);

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = notifications;

    // Date filter
    const boundary = getDateBoundary(datePreset);
    if (boundary) {
      result = result.filter((n) => new Date(n.created_at) >= boundary);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((n) => {
        const latest = getLatestEvent(n.events);
        if (!latest) return statusFilter === "sent" && n.email_sent;
        return latest.event_type === statusFilter;
      });
    }

    // Search filter (title, recipient, client name in metadata)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((n) => {
        const title = n.title?.toLowerCase() || "";
        const recipient = n.metadata?.clientEmail?.toLowerCase() || "";
        return title.includes(q) || recipient.includes(q);
      });
    }

    return result;
  }, [notifications, datePreset, statusFilter, searchQuery]);

  const hasActiveFilters = searchQuery || statusFilter !== "all" || datePreset !== "all";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-[13px] text-muted-foreground">Loading email activity…</span>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <div className="text-[13px] text-muted-foreground">No retainer emails sent yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client or email…"
            className="w-full pl-8 pr-8 py-1.5 text-[13px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-2.5 py-1.5 text-[12px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all appearance-none cursor-pointer"
          style={{ fontWeight: 500 }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : EVENT_DISPLAY[s]?.label || s}
            </option>
          ))}
        </select>

        {/* Date preset */}
        <div className="flex items-center gap-0.5 bg-accent/30 border border-border rounded-lg p-0.5">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDatePreset(p.value)}
              className={`px-2.5 py-1 text-[11px] rounded-md transition-all ${
                datePreset === p.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontWeight: 500 }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setDatePreset("all");
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontWeight: 500 }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Result count */}
      {hasActiveFilters && (
        <div className="text-[11px] text-muted-foreground" style={{ fontWeight: 500 }}>
          {filtered.length} of {notifications.length} emails
        </div>
      )}

      {/* Email list */}
      {filtered.length === 0 ? (
        <div className="text-center py-6">
          <Search className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
          <div className="text-[13px] text-muted-foreground">No emails match your filters</div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((notif) => {
            const latest = getLatestEvent(notif.events);
            const latestDisplay = latest ? EVENT_DISPLAY[latest.event_type] : null;
            const isExpanded = expandedId === notif.id;

            return (
              <div
                key={notif.id}
                className="border border-border rounded-lg overflow-hidden bg-card"
                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : notif.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>
                      {notif.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {format(new Date(notif.created_at), "MMM d, yyyy · h:mm a")}
                      {notif.metadata?.clientEmail && (
                        <span className="ml-2">→ {notif.metadata.clientEmail}</span>
                      )}
                    </div>
                  </div>
                  {latestDisplay ? (
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-accent/60"
                      style={{ fontWeight: 500, color: latestDisplay.color }}
                    >
                      <span>{latestDisplay.icon}</span>
                      {latestDisplay.label}
                    </div>
                  ) : notif.email_sent ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-accent/60 text-muted-foreground" style={{ fontWeight: 500 }}>
                      → Sent
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-accent/60 text-muted-foreground" style={{ fontWeight: 500 }}>
                      In-app only
                    </div>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-border">
                        {notif.events.length === 0 ? (
                          <div className="text-[12px] text-muted-foreground py-2">
                            No delivery events tracked yet
                          </div>
                        ) : (
                          <div className="relative ml-3 pl-4 border-l border-border/60 space-y-2 pt-2">
                            {notif.events.map((ev) => {
                              const display = EVENT_DISPLAY[ev.event_type] || {
                                label: ev.event_type,
                                icon: "?",
                                color: "hsl(var(--muted-foreground))",
                              };
                              return (
                                <div key={ev.id} className="relative flex items-start gap-3">
                                  <div
                                    className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-card"
                                    style={{ background: display.color }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[12px]" style={{ fontWeight: 600, color: display.color }}>
                                        {display.icon} {display.label}
                                      </span>
                                      {ev.bounce_type && (
                                        <span className="text-[10px] text-muted-foreground bg-accent/60 px-1.5 py-0.5 rounded">
                                          {ev.bounce_type}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {format(new Date(ev.created_at), "MMM d · h:mm:ss a")}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
