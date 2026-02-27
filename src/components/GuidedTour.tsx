import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, X, Sparkles, Check, RotateCcw } from 'lucide-react';
import { AureloIcon } from './AureloIcon';

// ── Tour Step Definitions ──────────────────────────────────────────

interface TourStep {
  target: string;
  title: string;
  description: string;
  route?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar-nav"]',
    title: 'Your command center',
    description: 'Navigate between your dashboard, clients, projects, time tracking, and insights — all from this sidebar.',
    position: 'right',
  },
  {
    target: '[data-tour="timer-button"]',
    title: 'One-click time tracking',
    description: 'Start a timer with a single click. When you stop, Aurelo prompts you to log the session to a client and project.',
    position: 'bottom',
  },
  {
    target: '[data-tour="earnings-chart"]',
    title: 'Your earnings at a glance',
    description: 'See your 6-month revenue trend with gross and net views. The metrics below show your true hourly rate and time investment.',
    route: '/',
    position: 'bottom',
  },
  {
    target: '[data-tour="client-list"]',
    title: 'Client management',
    description: 'Track every client relationship — retainers, hourly rates, lifetime revenue, and project status. Click any client for deep details.',
    route: '/clients',
    position: 'right',
  },
  {
    target: '[data-tour="projects-view"]',
    title: 'Project tracking',
    description: 'See all your projects across clients, track progress against estimates, and monitor budget burn rates.',
    route: '/projects',
    position: 'bottom',
  },
  {
    target: '[data-tour="time-log"]',
    title: 'Detailed time log',
    description: 'Every work session logged in one place. Filter by client, date, or category. Your billable hours drive your financial insights.',
    route: '/time',
    position: 'bottom',
  },
  {
    target: '[data-tour="insights-view"]',
    title: 'Financial insights',
    description: 'Revenue breakdowns, client concentration, work allocation, and trend analysis — all calculated from your real data.',
    route: '/insights',
    position: 'bottom',
  },
  {
    target: '[data-tour="settings-link"]',
    title: 'Make it yours',
    description: 'Set your rates, tax info, work categories, invoice defaults, and team members. Everything adapts to your workflow.',
    position: 'right',
  },
];

// ── Tooltip positioning ────────────────────────────────────────────

function getTooltipStyle(
  rect: DOMRect,
  position: 'top' | 'bottom' | 'left' | 'right',
  tooltipWidth: number,
  tooltipHeight: number,
): React.CSSProperties {
  const gap = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = 0;
  let left = 0;

  switch (position) {
    case 'right':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.right + gap;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - gap;
      break;
    case 'bottom':
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case 'top':
      top = rect.top - tooltipHeight - gap;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
  }

  top = Math.max(16, Math.min(top, vh - tooltipHeight - 16));
  left = Math.max(16, Math.min(left, vw - tooltipWidth - 16));

  return { top, left };
}

// ── Main Component ─────────────────────────────────────────────────

interface GuidedTourProps {
  open: boolean;
  onComplete: () => void;
}

export function GuidedTour({ open, onComplete }: GuidedTourProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ w: 340, h: 200 });

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  // Find and track the target element
  const updateTargetRect = useCallback(() => {
    if (!open || showCompletion) return;
    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step.target, open, showCompletion]);

  // Navigate to the step's route if needed
  useEffect(() => {
    if (!open || showCompletion) return;
    if (step.route && location.pathname !== step.route) {
      setTargetRect(null);
      navigate(step.route);
    }
  }, [currentStep, step.route, location.pathname, navigate, open, showCompletion]);

  // Poll for target element
  useEffect(() => {
    if (!open || showCompletion) return;
    const t = setTimeout(updateTargetRect, 350);
    const i = setInterval(updateTargetRect, 400);
    window.addEventListener('scroll', updateTargetRect, true);
    window.addEventListener('resize', updateTargetRect);
    return () => {
      clearTimeout(t);
      clearInterval(i);
      window.removeEventListener('scroll', updateTargetRect, true);
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [updateTargetRect, open, showCompletion]);

  // Measure tooltip
  useEffect(() => {
    if (tooltipRef.current) {
      const { offsetWidth, offsetHeight } = tooltipRef.current;
      if (offsetWidth > 0) setTooltipSize({ w: offsetWidth, h: offsetHeight });
    }
  }, [currentStep, open]);

  const handleNext = useCallback(() => {
    if (isLast) {
      // Show completion screen instead of immediately closing
      setShowCompletion(true);
      setTargetRect(null);
      navigate('/', { replace: true });
    } else {
      setCurrentStep(s => s + 1);
    }
  }, [isLast, navigate]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleFinishFromCompletion = useCallback(() => {
    setShowCompletion(false);
    onComplete();
  }, [onComplete]);

  const handleRestartFromCompletion = useCallback(() => {
    setShowCompletion(false);
    setCurrentStep(0);
  }, []);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
      if (!showCompletion) {
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'ArrowLeft') handlePrev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleSkip, handleNext, handlePrev, showCompletion]);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setShowCompletion(false);
    }
  }, [open]);

  if (!open) return null;

  const position = step.position || 'bottom';
  const tooltipStyle = targetRect
    ? getTooltipStyle(targetRect, position, tooltipSize.w, tooltipSize.h)
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } as React.CSSProperties;

  const spotPad = 8;
  const spotRadius = 12;

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'auto' }}>
      {/* Backdrop */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && !showCompletion && (
              <rect
                x={targetRect.left - spotPad}
                y={targetRect.top - spotPad}
                width={targetRect.width + spotPad * 2}
                height={targetRect.height + spotPad * 2}
                rx={spotRadius}
                ry={spotRadius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={showCompletion ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.45)"}
          mask="url(#tour-spotlight-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {/* Spotlight ring */}
      {targetRect && !showCompletion && (
        <motion.div
          className="absolute pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            left: targetRect.left - spotPad - 2,
            top: targetRect.top - spotPad - 2,
            width: targetRect.width + (spotPad + 2) * 2,
            height: targetRect.height + (spotPad + 2) * 2,
            borderRadius: spotRadius + 2,
            boxShadow: '0 0 0 2px rgba(94,161,191,0.4), 0 0 20px rgba(94,161,191,0.12)',
            transition: 'left 0.4s ease, top 0.4s ease, width 0.4s ease, height 0.4s ease',
          }}
        />
      )}

      <AnimatePresence mode="wait">
        {showCompletion ? (
          /* ── Completion card ── */
          <motion.div
            key="completion"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white border border-black/[0.08] rounded-2xl overflow-hidden"
            style={{
              boxShadow: '0 24px 64px rgba(0,0,0,0.14), 0 8px 20px rgba(0,0,0,0.06)',
              zIndex: 10000,
              pointerEvents: 'auto',
            }}
          >
            {/* Completed progress bar */}
            <div className="h-[2px] bg-[#5ea1bf]" />

            <div className="px-7 pt-8 pb-7 text-center">
              {/* Success icon with animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.15 }}
                className="w-14 h-14 rounded-2xl bg-[#5ea1bf]/10 flex items-center justify-center mx-auto mb-5"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                >
                  <Check className="w-7 h-7 text-[#5ea1bf]" strokeWidth={2.5} />
                </motion.div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="text-[20px] text-[#1c1c1c] mb-2"
                style={{ fontWeight: 600, letterSpacing: '-0.01em' }}
              >
                You're all set!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="text-[14px] text-[#78716c] leading-relaxed max-w-xs mx-auto mb-7"
              >
                You've seen the core of Aurelo. Take your time exploring the demo data, or clear it out and start building your own workspace.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="space-y-2.5"
              >
                <button
                  onClick={handleFinishFromCompletion}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1c1c1c] text-white text-[14px] hover:bg-[#2c2c2c] active:bg-[#0c0c0c] transition-all"
                  style={{ fontWeight: 500 }}
                >
                  Continue exploring
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleRestartFromCompletion}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-black/[0.08] text-[14px] text-[#78716c] hover:text-[#1c1c1c] hover:bg-stone-50 transition-all"
                  style={{ fontWeight: 500 }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Replay tour
                </button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                className="mt-5 text-[11px] text-[#a8a29e]"
              >
                You can clear demo data anytime from the banner below
              </motion.p>
            </div>
          </motion.div>
        ) : (
          /* ── Step tooltip ── */
          <motion.div
            key={currentStep}
            ref={tooltipRef}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute w-[340px] bg-white border border-black/[0.08] rounded-xl overflow-hidden"
            style={{
              ...tooltipStyle,
              boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
              zIndex: 10000,
              pointerEvents: 'auto',
            }}
          >
            {/* Progress bar */}
            <div className="h-[2px] bg-black/[0.04]">
              <motion.div
                className="h-full"
                style={{ backgroundColor: '#5ea1bf' }}
                initial={{ width: `${((currentStep) / TOUR_STEPS.length) * 100}%` }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            <div className="px-5 pt-4 pb-5">
              {/* Step counter & skip */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[11px] text-[#9a9aac] tracking-wide"
                  style={{ fontWeight: 600, letterSpacing: '0.06em' }}
                >
                  {currentStep + 1} OF {TOUR_STEPS.length}
                </span>
                <button
                  onClick={handleSkip}
                  className="text-[12px] text-[#9a9aac] hover:text-[#1c1c1c] transition-colors flex items-center gap-1"
                  style={{ fontWeight: 500 }}
                >
                  Skip tour
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Content */}
              <h3
                className="text-[16px] text-[#1c1c1c] mb-1.5"
                style={{ fontWeight: 600, letterSpacing: '-0.01em' }}
              >
                {step.title}
              </h3>
              <p className="text-[13px] text-[#78716c] leading-relaxed mb-5">
                {step.description}
              </p>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1.5 text-[13px] text-[#78716c] hover:text-[#1c1c1c] disabled:opacity-0 disabled:pointer-events-none transition-all"
                  style={{ fontWeight: 500 }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1c1c1c] text-white text-[13px] hover:bg-[#2c2c2c] active:bg-[#0c0c0c] transition-all"
                  style={{ fontWeight: 500 }}
                >
                  {isLast ? (
                    <>
                      Finish tour
                      <Sparkles className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
