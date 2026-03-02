import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Bell, X, Clock, FileText, Users, TrendingUp, UserPlus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  type Notification,
  type NotificationPreference,
  loadNotifications,
  loadPreferences,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
} from '@/data/notificationsApi';
import { formatDistanceToNow } from 'date-fns';

const CATEGORY_ICONS: Record<string, typeof Bell> = {
  session: Clock,
  invoice: FileText,
  team: UserPlus,
  client: Users,
  insight: TrendingUp,
};

const CATEGORY_COLORS: Record<string, string> = {
  session: 'bg-primary/10 text-primary',
  invoice: 'bg-warning/10 text-warning',
  team: 'bg-success/10 text-success',
  client: 'bg-accent text-accent-foreground',
  insight: 'bg-primary/10 text-primary',
};

interface NotificationCenterProps {
  workspaceId: string;
}

export function NotificationCenter({ workspaceId }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Build a set of categories where in_app is disabled
  const disabledCategories = useMemo(() => {
    const disabled = new Set<string>();
    for (const p of prefs) {
      if (!p.in_app) disabled.add(p.category);
    }
    return disabled;
  }, [prefs]);

  // Filter notifications by preferences
  const visibleNotifs = useMemo(
    () => notifs.filter(n => !disabledCategories.has(n.category)),
    [notifs, disabledCategories]
  );

  const unreadCount = visibleNotifs.filter(n => !n.is_read).length;

  // Load initial notifications + preferences
  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      loadNotifications(workspaceId, 50),
      loadPreferences(workspaceId),
    ]).then(([data, prefData]) => {
      setNotifs(data);
      setPrefs(prefData);
      setLoading(false);
    });
  }, [workspaceId]);

  // Realtime subscription
  useEffect(() => {
    if (!workspaceId) return;
    const unsub = subscribeToNotifications(workspaceId, (newNotif) => {
      setNotifs(prev => [newNotif, ...prev].slice(0, 100));
    });
    return unsub;
  }, [workspaceId]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead(workspaceId);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [workspaceId]);

  const handleMarkRead = useCallback(async (id: string) => {
    await markAsRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }, []);

  const handleClick = useCallback((n: Notification) => {
    handleMarkRead(n.id);
    // Navigate based on category/metadata
    if (n.metadata?.clientId) {
      navigate(`/clients/${n.metadata.clientId}`);
    } else if (n.metadata?.invoiceId) {
      navigate('/invoicing');
    } else if (n.category === 'team') {
      navigate('/settings?tab=team');
    } else if (n.category === 'insight') {
      navigate('/insights');
    }
    setOpen(false);
  }, [navigate, handleMarkRead]);

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center" style={{ fontWeight: 600 }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-xl overflow-hidden z-50"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-[13px]" style={{ fontWeight: 600 }}>Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]" style={{ fontWeight: 600 }}>
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[12px] text-primary hover:text-primary/80 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  <Check className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center">
                  <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                </div>
              ) : visibleNotifs.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <div className="text-[13px] text-muted-foreground">No notifications yet</div>
                  <div className="text-[11px] text-muted-foreground/60 mt-1">You'll see activity updates here</div>
                </div>
              ) : (
                visibleNotifs.map(n => {
                  const Icon = CATEGORY_ICONS[n.category] || Bell;
                  const colorClass = CATEGORY_COLORS[n.category] || 'bg-accent text-accent-foreground';
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors cursor-pointer ${!n.is_read ? 'bg-primary/[0.03]' : ''}`}
                      onClick={() => handleClick(n)}
                    >
                      <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[13px] leading-snug" style={{ fontWeight: n.is_read ? 400 : 500 }}>
                            {n.title}
                          </div>
                          {!n.is_read && (
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        {n.body && (
                          <div className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>
                        )}
                        <div className="text-[10px] text-muted-foreground/60 mt-1">{formatTime(n.created_at)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {visibleNotifs.length > 0 && (
              <div className="px-4 py-2 border-t border-border">
                <button
                  onClick={() => { navigate('/settings?tab=notifications'); setOpen(false); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Notification settings
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
