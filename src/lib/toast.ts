/**
 * Aurelo toast timing presets — wrap sonner with intent-aware durations.
 * Use these instead of calling `toast(...)` directly so timing stays consistent.
 *
 *   success → 2500ms   (low-attention confirmations)
 *   info    → 4000ms   (default informational)
 *   error   → 6000ms   (failure recovery needs longer to read)
 *   action  → Infinity (requires user to dismiss or act)
 */
import { toast as sonner, type ExternalToast } from 'sonner';

const DURATIONS = {
  success: 2500,
  info: 4000,
  error: 6000,
  action: Infinity,
} as const;

export const toast = {
  success: (message: string, options?: ExternalToast) =>
    sonner.success(message, { duration: DURATIONS.success, ...options }),
  info: (message: string, options?: ExternalToast) =>
    sonner(message, { duration: DURATIONS.info, ...options }),
  error: (message: string, options?: ExternalToast) =>
    sonner.error(message, { duration: DURATIONS.error, ...options }),
  /** Persistent toast — use when user must act (e.g. undo). */
  action: (message: string, options?: ExternalToast) =>
    sonner(message, { duration: DURATIONS.action, ...options }),
  /** Loading toast — sonner spinner; pair with `id` to replace on resolve. */
  loading: (message: string, options?: ExternalToast) =>
    sonner.loading(message, { duration: DURATIONS.action, ...options }),
  dismiss: (id?: string | number) => sonner.dismiss(id),
  /** Escape hatch for advanced sonner APIs (promise, custom). */
  raw: sonner,
};
