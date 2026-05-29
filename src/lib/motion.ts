/**
 * Aurelo motion system — Phase 1E.
 *
 * Constitution: "Motion confirms, never entertains."
 * No springs, no bounce, no theatrical overshoot. Every transition is
 * a tween with one of three canonical easings and three canonical
 * durations. Use these presets at every Framer Motion call site.
 */

// Canonical easings — mirror the CSS tokens in index.css
export const ease = {
  /** Snappy, decelerating curve. Default for entries and confirmations. */
  emphasized: [0.32, 0.72, 0, 1] as [number, number, number, number],
  /** Symmetrical material curve. Default for hover/property transitions. */
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
  /** Linear-ish exit curve. Default for dismissals. */
  exit: [0.4, 0, 1, 1] as [number, number, number, number],
} as const;

// Canonical durations (seconds)
export const duration = {
  /** 120ms — instant feedback (hover, press, ring). */
  instant: 0.12,
  /** 180ms — micro motion (tab indicator, switch thumb, badge swap). */
  micro: 0.18,
  /** 250ms — standard motion (panel slide, list reorder, save bar). */
  standard: 0.25,
  /** 350ms — modal/overlay enter. Anything larger reads as theatrical. */
  modal: 0.35,
} as const;

// Pre-composed Framer Motion transition objects.
// Import these at call sites instead of writing `{ type: 'spring', ... }`.
export const transitions = {
  /** Default for slide/translate confirmations (replaces spring 400/30). */
  emphasized: { duration: duration.standard, ease: ease.emphasized },
  /** Quick micro-motion (replaces spring 400/20). */
  micro: { duration: duration.micro, ease: ease.emphasized },
  /** Modal / overlay enter. */
  modal: { duration: duration.modal, ease: ease.emphasized },
  /** Smooth hover/property tween. */
  standard: { duration: duration.standard, ease: ease.standard },
  /** Dismiss / fade-out. */
  exit: { duration: duration.micro, ease: ease.exit },
} as const;

/**
 * Shared Framer Motion variants for staggered list/page enters.
 * Kept here as the canonical Aurelo entry choreography.
 */
export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
} as const;

export const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: transitions.emphasized,
  },
} as const;
