import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ArrowRight, X, Archive, Sparkles } from 'lucide-react';
import { usePlan } from '../data/PlanContext';
import { PLANS, type LimitKey } from '../data/plans';

// ── OverLimitBanner ────────────────────────────────────────────────
interface OverLimitBannerProps {
  limitKey: LimitKey;
  currentCount: number;
  resourceLabel: string;
  reduceLabel?: string;
  onReduce?: () => void;
  dismissable?: boolean;
}

export function OverLimitBanner({
  limitKey, currentCount, resourceLabel,
  reduceLabel = 'Archive extras', onReduce, dismissable = true,
}: OverLimitBannerProps) {
  const navigate = useNavigate();
  const { planId, limit } = usePlan();
  const [dismissed, setDismissed] = useState(false);
  const max = limit(limitKey);
  const isOver = max !== null && currentCount > max;
  if (!isOver || dismissed) return null;
  const overBy = currentCount - (max || 0);
  const planName = PLANS[planId].name;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="mb-6 rounded-xl border border-destructive/30 bg-destructive/[0.06] px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-destructive/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                You're {overBy} {resourceLabel} over your {planName} plan limit
              </p>
              <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                Your plan allows {max} active {resourceLabel}, but you have {currentCount}.
                {' '}Upgrade for more capacity, or archive {overBy === 1 ? '1 item' : `${overBy} items`} to stay within your current plan.
              </p>
            </div>
            {dismissable && (
              <button onClick={() => setDismissed(true)} className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5 mt-3.5">
            <button onClick={() => navigate('/settings?tab=billing')} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all" style={{ fontWeight: 500 }}>
              <Sparkles className="w-3.5 h-3.5" /> Upgrade plan <ArrowRight className="w-3 h-3" />
            </button>
            {onReduce && (
              <button onClick={onReduce} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all" style={{ fontWeight: 500 }}>
                <Archive className="w-3.5 h-3.5" /> {reduceLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── LimitEnforcementModal ──────────────────────────────────────────
interface LimitEnforcementModalProps {
  open: boolean;
  onClose: () => void;
  limitKey: LimitKey;
  currentCount: number;
  resourceLabel: string;
  actionLabel?: string;
}

export function LimitEnforcementModal({
  open, onClose, limitKey, currentCount, resourceLabel, actionLabel = 'add more',
}: LimitEnforcementModalProps) {
  const navigate = useNavigate();
  const { planId, limit, upgradePlan } = usePlan();
  if (!open) return null;
  const max = limit(limitKey);
  const planName = PLANS[planId].name;
  const nextTier = upgradePlan(limitKey);
  const nextPlan = nextTier ? PLANS[nextTier] : null;
  const nextLimit = nextTier ? PLANS[nextTier].limits[limitKey] : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative bg-card border border-border rounded-2xl w-full max-w-md mx-4 overflow-hidden"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)' }}
          >
            <div className="h-1 bg-gradient-to-r from-destructive to-destructive/40" />
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-[18px] text-foreground text-center mb-1.5" style={{ fontWeight: 600 }}>{planName} plan limit reached</h2>
              <p className="text-[14px] text-muted-foreground text-center leading-relaxed mb-6">
                You've used {currentCount} of {max} {resourceLabel} on your {planName} plan. To {actionLabel}, upgrade to a higher tier.
              </p>
              <div className="bg-accent/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>{resourceLabel.charAt(0).toUpperCase() + resourceLabel.slice(1)} used</span>
                  <span className="text-[13px] text-destructive" style={{ fontWeight: 600 }}>{currentCount} / {max}</span>
                </div>
                <div className="h-2 rounded-full bg-accent/60 overflow-hidden">
                  <div className="h-full rounded-full bg-destructive transition-all" style={{ width: '100%' }} />
                </div>
              </div>
              {nextPlan && (
                <div className="border border-primary/20 bg-primary/[0.04] rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[13px] text-foreground" style={{ fontWeight: 600 }}>{nextPlan.name} plan</span>
                    <span className="text-[13px] text-muted-foreground">{nextPlan.price === 0 ? 'Free' : `$${nextPlan.price}/mo`}</span>
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {nextLimit === null ? `Unlimited ${resourceLabel}` : `Up to ${nextLimit} ${resourceLabel}`}, plus {nextTier === 'pro' ? 'full insights, invoicing, project budgets, and PDF exports' : 'white-label branding, team utilization, API access, and more'}.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2.5">
                <button onClick={() => { onClose(); navigate('/settings?tab=billing'); }} className="w-full flex items-center justify-center gap-2 py-2.5 text-[14px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all" style={{ fontWeight: 500 }}>
                  <Sparkles className="w-4 h-4" /> Upgrade plan <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={onClose} className="w-full py-2.5 text-[14px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all" style={{ fontWeight: 500 }}>Not right now</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
