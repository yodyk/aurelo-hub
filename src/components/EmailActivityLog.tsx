import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Mail, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
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

// Priority order for "latest" event
const EVENT_PRIORITY: Record<string, number> = {
  complained: 7,
  bounced: 6,
  clicked: 5,
  opened: 4,
  delivered: 3,
  delayed: 2,
  sent: 1,
};

function getLatestEvent(events: EmailEvent[]) {
  if (!events.length) return null;
  return events.reduce((best, ev) =>
    (EVENT_PRIORITY[ev.event_type] || 0) > (EVENT_PRIORITY[best.event_type] || 0) ? ev : best
  );
}

export default function EmailActivityLog({ clientId }: { clientId?: string }) {
  const { workspaceId } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);

    (async () => {
      // Fetch retainer warning notifications (optionally filtered by client)
      let query = supabase
        .from("notifications")
        .select("id, title, body, created_at, email_sent, metadata")
        .eq("workspace_id", workspaceId)
        .eq("event_type", "retainer_warning")
        .order("created_at", { ascending: false })
        .limit(50);

      // If clientId provided, filter by metadata
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
    <div className="space-y-1.5">
      {notifications.map((notif) => {
        const latest = getLatestEvent(notif.events);
        const latestDisplay = latest ? EVENT_DISPLAY[latest.event_type] : null;
        const isExpanded = expandedId === notif.id;

        return (
          <div
            key={notif.id}
            className="border border-border rounded-lg overflow-hidden bg-card"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
          >
            {/* Summary row */}
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
              {/* Status badge */}
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

            {/* Expanded timeline */}
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
                              {/* Timeline dot */}
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
  );
}
