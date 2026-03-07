import { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertTriangle } from 'lucide-react';

// ── Context for dirty tracking ──────────────────────────────────────
interface SettingsSaveContextValue {
  markDirty: () => void;
  registerSave: (fn: () => Promise<void>) => void;
}

export const SettingsSaveContext = createContext<SettingsSaveContextValue>({
  markDirty: () => {},
  registerSave: () => {},
});

export function useSettingsSave() {
  return useContext(SettingsSaveContext);
}

/**
 * Hook for tab components: registers a save function and marks dirty on changes.
 * Call `markDirty()` whenever a field changes.
 * Pass your save function to `useRegisterSave(saveFn)` — it will be called by the sticky bar.
 */
export function useRegisterSave(saveFn: () => Promise<void>) {
  const { registerSave } = useSettingsSave();
  const fnRef = useRef(saveFn);
  fnRef.current = saveFn;

  useEffect(() => {
    registerSave(() => fnRef.current());
  }, [registerSave]);
}

// ── Sticky Save Bar ─────────────────────────────────────────────────
export function SettingsSaveBar({
  isDirty,
  saving,
  onSave,
  onDiscard,
}: {
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <AnimatePresence>
      {isDirty && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-2xl w-[calc(100%-3rem)] flex items-center justify-between gap-4 px-5 py-3 bg-card border border-border rounded-xl z-50"
          style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
              Unsaved changes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDiscard}
              className="px-3.5 py-1.5 text-[13px] text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/60 transition-all"
              style={{ fontWeight: 500 }}
            >
              Discard
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-4 py-1.5 bg-primary text-primary-foreground text-[13px] rounded-lg hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ fontWeight: 500, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save changes
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Unsaved Changes Dialog ──────────────────────────────────────────
export function UnsavedChangesDialog({
  open,
  onDiscard,
  onSave,
  onCancel,
  saving,
}: {
  open: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="bg-card border border-border rounded-2xl p-7 max-w-sm w-full mx-4"
            style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <h3 className="text-[16px] text-foreground text-center mb-1.5" style={{ fontWeight: 600 }}>
              Unsaved changes
            </h3>
            <p className="text-[13px] text-muted-foreground text-center leading-relaxed mb-5">
              You have unsaved changes that will be lost if you leave this tab. Would you like to save them first?
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={onSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-[14px] rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40"
                style={{ fontWeight: 500 }}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save and continue
              </button>
              <button
                onClick={onDiscard}
                className="w-full py-2 text-[13px] text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/40 transition-all"
                style={{ fontWeight: 500 }}
              >
                Discard changes
              </button>
              <button
                onClick={onCancel}
                className="text-[13px] text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1 text-center"
                style={{ fontWeight: 500 }}
              >
                Stay on this tab
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
