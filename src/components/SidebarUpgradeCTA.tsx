import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { usePlan } from '../data/PlanContext';

/**
 * Compact upgrade nudge for the sidebar, shown only to Starter-plan users.
 * Placed above the Settings link so it doesn't conflict with the header timer.
 */
export function SidebarUpgradeCTA({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const { planId, isTrial } = usePlan();

  // Only show for Starter users who are NOT on a trial
  if (planId !== 'starter' || isTrial) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => navigate('/settings?tab=billing')}
        className="mx-auto mb-2 w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center hover:bg-primary/15 transition-colors"
        title="Upgrade to Pro"
      >
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-3 mb-3"
    >
      <button
        onClick={() => navigate('/settings?tab=billing')}
        className="w-full rounded-lg border border-primary/15 bg-primary/[0.04] px-3.5 py-3 text-left hover:bg-primary/[0.07] transition-all group"
      >
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[12px] text-foreground" style={{ fontWeight: 600 }}>
            Unlock more with Pro
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug ml-[34px]">
          Insights, invoicing, exports & more
        </p>
        <div className="mt-2 ml-[34px] inline-flex items-center gap-1 text-[11px] text-primary group-hover:gap-1.5 transition-all" style={{ fontWeight: 500 }}>
          See plans
          <ArrowRight className="w-3 h-3" />
        </div>
      </button>
    </motion.div>
  );
}
