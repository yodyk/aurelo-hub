// ── Save state affordance ───────────────────────────────────────────
// Quiet by default. Loud only when something failed.
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Check, RotateCw } from 'lucide-react';
import { transitions } from '@/lib/motion';
import type { SaveState } from './useAutosave';

interface Props {
  state: SaveState;
  onRetry?: () => void;
}

export default function SaveIndicator({ state, onRetry }: Props) {
  const show = state === 'saving' || state === 'saved' || state === 'error';

  return (
    <div className="min-h-[18px] flex items-center justify-end" aria-live="polite" aria-atomic="true">
      <AnimatePresence initial={false}>
        {show && (
          <motion.div
            key={state}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitions.micro}
            className="flex items-center gap-1.5 text-[11px]"
          >
            {state === 'saving' && <span className="text-muted-foreground">Saving…</span>}
            {state === 'saved' && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Check className="w-3 h-3" aria-hidden />
                Saved
              </span>
            )}
            {state === 'error' && (
              <>
                <span className="flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                  <AlertCircle className="w-3 h-3" aria-hidden />
                  Not saved
                </span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex items-center gap-1 underline underline-offset-2 hover:opacity-80"
                    style={{ color: 'var(--danger)' }}
                  >
                    <RotateCw className="w-3 h-3" aria-hidden />
                    Retry
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
