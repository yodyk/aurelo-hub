import { motion } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { useParams } from "react-router-dom";
import AureloLogo from "@/components/AureloLogo";

export default function ClientPortal() {
  const { token } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <AureloLogo />
      </header>
      <div className="page-container">
        <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-6">
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Client Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Viewing portal for token: {token}</p>
          </motion.div>

          <motion.div variants={itemVariants} className="card-surface p-6">
            <p className="text-sm text-muted-foreground">Client portal — will be populated with source file.</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
