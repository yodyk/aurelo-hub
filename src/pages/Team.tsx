import { motion } from "motion/react";
import { Navigate } from "react-router";
import { Shield, Clock, FileText, Users, Settings, Trash2 } from "lucide-react";
import TeamUtilization from "../components/TeamUtilization";
import { FeatureGate } from "../components/FeatureGate";
import { useRoleAccess, ROLE_DESCRIPTIONS } from "../data/useRoleAccess";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const ROLE_ICONS: Record<string, typeof Shield> = {
  Owner: Shield,
  Admin: Settings,
  Member: Clock,
};

export default function Team() {
  const { canViewTeam } = useRoleAccess();

  if (!canViewTeam) return <Navigate to="/" replace />;

  return (
    <motion.div
      className="w-full min-w-0 px-6 lg:px-12 py-8 md:py-14"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="mb-8">
        <h1 className="text-[24px] md:text-[28px] tracking-tight mb-1" style={{ fontWeight: 700, letterSpacing: "-0.03em" }}>
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

      {/* Role permissions reference */}
      <motion.div variants={item} className="mt-10">
        <h2 className="text-[15px] mb-1" style={{ fontWeight: 600 }}>
          Role permissions
        </h2>
        <p className="text-[13px] text-muted-foreground mb-6">
          What each role can do in your workspace
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(ROLE_DESCRIPTIONS).map(([key, role]) => {
            const Icon = ROLE_ICONS[key] || Users;
            return (
              <div
                key={key}
                className="bg-card border border-border rounded-xl p-5"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-[14px]" style={{ fontWeight: 600 }}>{role.label}</div>
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
                  {role.description}
                </p>
                <ul className="space-y-1.5">
                  {role.permissions.map((perm, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                      <div className="w-1 h-1 rounded-circle bg-primary/50 mt-1.5 flex-shrink-0" />
                      <span>{perm}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
