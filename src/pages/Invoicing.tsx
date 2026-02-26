import { motion } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Invoicing() {
  return (
    <div className="page-container">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-8">
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Invoicing</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage client invoices.</p>
        </motion.div>

        <motion.div variants={itemVariants} className="relative">
          <div className="space-y-4 filter blur-[6px] pointer-events-none select-none">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-surface p-5 flex items-center gap-4">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-40" />
                  <div className="h-3 bg-muted rounded w-24 mt-2" />
                </div>
                <div className="h-6 bg-muted rounded-full w-16" />
                <div className="h-4 bg-muted rounded w-20" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-2xl">
            <div className="text-center space-y-3 max-w-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Invoicing requires Pro</h3>
              <p className="text-sm text-muted-foreground">Upgrade to create, send, and track invoices with Stripe integration.</p>
              <Button size="sm">Upgrade to Pro</Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
