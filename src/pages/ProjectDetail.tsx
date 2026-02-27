import { motion } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function ProjectDetail() {
  const { clientId, projectId } = useParams();

  return (
    <div className="page-container">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-6">
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <Link to="/projects" className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Project Detail</h1>
            <p className="text-sm text-muted-foreground mt-1">Project: {projectId} · Client: {clientId}</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card-surface p-6">
          <p className="text-sm text-muted-foreground">Project detail page — will be populated with source file.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
