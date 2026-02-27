import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, RotateCcw, Loader2, X } from 'lucide-react';

interface DemoModeBannerProps {
  onClearDemo: () => Promise<void>;
  onRestartTour: () => void;
}

export function DemoModeBanner({ onClearDemo, onRestartTour }: DemoModeBannerProps) {
  const [clearing, setClearing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleClear = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setClearing(true);
    try {
      await onClearDemo();
    } catch {
      setClearing(false);
      setConfirming(false);
    }
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.3 }}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[999]"
    >
      <div
        className="bg-white/95 backdrop-blur-xl border border-black/[0.08] rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)' }}
      >
        {/* Main pill row */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-[#5ea1bf]" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#5ea1bf] animate-ping opacity-40" />
            </div>
            <span
              className="text-[12px] text-[#5ea1bf] tracking-wide whitespace-nowrap"
              style={{ fontWeight: 600, letterSpacing: '0.04em' }}
            >
              DEMO MODE
            </span>
          </div>

          <div className="w-px h-4 bg-black/[0.06]" />

          <button
            onClick={onRestartTour}
            className="flex items-center gap-1.5 text-[12px] text-[#78716c] hover:text-[#1c1c1c] transition-colors whitespace-nowrap"
            style={{ fontWeight: 500 }}
          >
            <RotateCcw className="w-3 h-3" />
            Replay tour
          </button>

          <div className="w-px h-4 bg-black/[0.06]" />

          {!confirming ? (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c1c1c] text-white text-[12px] hover:bg-[#2c2c2c] active:bg-[#0c0c0c] transition-all whitespace-nowrap"
              style={{ fontWeight: 500 }}
            >
              Start your workspace
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleClear}
                disabled={clearing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c27272] text-white text-[12px] hover:bg-[#b06060] active:bg-[#a05050] disabled:opacity-60 transition-all whitespace-nowrap"
                style={{ fontWeight: 500 }}
              >
                {clearing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    Clear demo data
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
              {!clearing && (
                <button
                  onClick={() => setConfirming(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/[0.04] text-[#a8a29e] hover:text-[#78716c] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Expandable info row */}
        <AnimatePresence>
          {confirming && !clearing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 pt-0.5 border-t border-black/[0.04]">
                <p className="text-[11px] text-[#a8a29e] leading-relaxed">
                  This will remove all demo clients, sessions, projects, and settings.
                  Your identity and work categories will be preserved.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
