import type { Transition } from "motion/react";

export const EASE_DEFAULT: Transition = { duration: 0.4, ease: "easeOut" };

export const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: EASE_DEFAULT },
};
