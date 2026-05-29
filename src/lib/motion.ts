import type { Transition } from "motion/react";

/**
 * Motion language — Apple HIG + Linear restraint.
 * Short durations, emphasized easing, subtle vertical lift.
 * Avoid bounce or theatrical movement.
 */
export const EASE_EMPHASIZED = [0.32, 0.72, 0, 1] as const;
export const EASE_STANDARD = [0.4, 0, 0.2, 1] as const;

export const EASE_DEFAULT: Transition = {
  duration: 0.32,
  ease: EASE_EMPHASIZED as unknown as number[],
};

export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: EASE_DEFAULT },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.24, ease: EASE_STANDARD as unknown as number[] } },
};

export const liftIn = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: EASE_DEFAULT },
};
