// ── Desktop Push Notifications for Timer ─────────────────────────
// Uses the Web Notifications API (works on all OS browsers without a service worker)

const STORAGE_KEY = 'aurelo_timer_reminders';
const FIRED_KEY = 'aurelo_timer_reminders_fired';

export interface TimerReminderConfig {
  enabled: boolean;
  /** Reminder intervals in minutes — user can customise */
  intervals: number[];
}

const DEFAULT_CONFIG: TimerReminderConfig = {
  enabled: true,
  intervals: [30, 60, 120], // 30 min, 1 hr, 2 hrs
};

// ── Permission ──────────────────────────────────────────────────────

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  const perm = await Notification.requestPermission();
  return perm;
}

// ── Config persistence ──────────────────────────────────────────────

export function loadReminderConfig(): TimerReminderConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_CONFIG };
}

export function saveReminderConfig(cfg: TimerReminderConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// ── Fired tracking (reset when timer starts) ────────────────────────

function getFired(): Set<number> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function setFired(s: Set<number>): void {
  localStorage.setItem(FIRED_KEY, JSON.stringify([...s]));
}

export function resetFired(): void {
  localStorage.removeItem(FIRED_KEY);
}

// ── Fire notification ───────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`;
  return `${h}h ${m}m`;
}

function fireNotification(minutes: number): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const n = new Notification('⏱ Timer Reminder — Aurelo', {
      body: `Your timer has been running for ${formatDuration(minutes)}. Don't forget to stop it when you're done!`,
      icon: '/favicon.ico',
      tag: `aurelo-timer-${minutes}`, // prevents duplicate notifications
      requireInteraction: false,
    });
    // Auto-close after 10s
    setTimeout(() => n.close(), 10000);
  } catch (e) {
    console.warn('[timerNotifications] Failed to fire notification:', e);
  }
}

// ── Check & fire (call every tick) ──────────────────────────────────

export function checkTimerReminders(elapsedSeconds: number): void {
  const cfg = loadReminderConfig();
  if (!cfg.enabled || cfg.intervals.length === 0) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const fired = getFired();

  for (const interval of cfg.intervals) {
    if (elapsedMinutes >= interval && !fired.has(interval)) {
      fired.add(interval);
      setFired(fired);
      fireNotification(interval);
    }
  }
}
