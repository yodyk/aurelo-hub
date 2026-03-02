import { motion } from "motion/react";
import TeamUtilization from "../components/TeamUtilization";
import { FeatureGate } from "../components/FeatureGate";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function Team() {
  return (
    <motion.div
      className="max-w-7xl mx-auto px-6 lg:px-12 py-12"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="mb-8">
        <h1 className="text-[24px] tracking-tight mb-1" style={{ fontWeight: 600 }}>
          Team
        </h1>
        <p className="text-[14px] text-muted-foreground">
          Capacity, utilization &amp; workload distribution
        </p>
      </motion.div>

      <motion.div variants={item}>
        <FeatureGate feature="teamUtilization" featureLabel="Team Utilization">
          <TeamUtilization />
        </FeatureGate>
      </motion.div>
    </motion.div>
  );
}
