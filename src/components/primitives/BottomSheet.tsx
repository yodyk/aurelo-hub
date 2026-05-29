/**
 * BottomSheet — mobile-native sheet that slides up from the bottom edge.
 *
 * Responsibilities:
 * - Portal to <body> so it escapes any clipped/transformed parent.
 * - Backdrop tap dismiss, drag-down dismiss, escape-key dismiss.
 * - Respects iOS safe-area-inset-bottom.
 * - Locks body scroll while open.
 *
 * Desktop: never use this — use Dialog/Popover. This is mobile-only by design.
 */
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Cap the sheet height as a viewport-height percentage. */
  maxHeightVh?: number;
}

export function BottomSheet({ open, onClose, title, children, maxHeightVh = 85 }: BottomSheetProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape to dismiss
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bs-backdrop"
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            key="bs-sheet"
            className="fixed inset-x-0 bottom-0 z-[61] bg-card border-t border-[var(--hairline)] rounded-t-[12px] overflow-hidden flex flex-col"
            style={{
              maxHeight: `${maxHeightVh}vh`,
              paddingBottom: 'env(safe-area-inset-bottom)',
              boxShadow: 'var(--elev-3)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 400) onClose();
            }}
          >
            {/* Drag handle */}
            <div className="pt-2 pb-1 flex items-center justify-center flex-shrink-0">
              <div className="w-9 h-1 rounded-full bg-foreground/15" />
            </div>
            {title && (
              <div className="px-5 pt-2 pb-3 border-b border-[var(--hairline)] flex-shrink-0">
                <div className="text-[14px]" style={{ fontWeight: 600 }}>{title}</div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
