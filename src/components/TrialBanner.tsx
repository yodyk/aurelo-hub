import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Clock, Zap } from 'lucide-react';
import { usePlan } from '../data/PlanContext';

// ── TrialBanner ────────────────────────────────────────────────────
export function TrialBanner() {
  const navigate = useNavigate();
  const { isTrial, trialDaysRemaining, planId } = usePlan();
  if (!isTrial || planId !== 'starter') return null;
  const isUrgent = trialDaysRemaining <= 2;
  const daysText = trialDaysRemaining === 1 ? '1 day' : `${trialDaysRemaining} days`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mx-6 lg:mx-12 mt-4 mb-0 rounded-xl border px-5 py-3 flex items-center justify-between ${
        isUrgent ? 'border-destructive/30 bg-destructive/[0.05]' : 'border-primary/25 bg-primary/[0.04]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isUrgent ? 'bg-destructive/10' : 'bg-primary/10'}`}>
          {isUrgent ? <Clock className="w-4 h-4 text-destructive" /> : <Zap className="w-4 h-4 text-primary" />}
        </div>
        <div>
          <p className="text-[13px] text-foreground" style={{ fontWeight: 600 }}>
            {isUrgent ? 'Your Pro trial ends soon' : 'Pro trial active'}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {isUrgent
              ? `${daysText} left — upgrade now to keep your Pro features`
              : `${daysText} remaining — enjoy full insights, invoicing, exports & more`}
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate('/settings?tab=billing')}
        className={`flex items-center gap-1.5 px-4 py-2 text-[13px] rounded-lg transition-all ${
          isUrgent ? 'bg-foreground text-background hover:opacity-90' : 'bg-primary/10 text-primary hover:bg-primary/20'
        }`}
        style={{ fontWeight: 500 }}
      >
        <Sparkles className="w-3.5 h-3.5" />
        {isUrgent ? 'Upgrade now' : 'Upgrade to Pro'}
        <ArrowRight className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// ── StarterUpgradeCTA ──────────────────────────────────────────────
export function StarterUpgradeCTA() {
  const navigate = useNavigate();
  const { planId, isTrial, startTrial, trialExpired } = usePlan();
  if (planId !== 'starter' || isTrial) return null;

  const proFeatures = [
    { icon: Sparkles, label: 'Full insights suite', detail: 'Client rankings, forecasting, concentration analysis' },
    { icon: Zap, label: 'Client invoicing', detail: 'Create & track invoices with Stripe integration' },
    { icon: Clock, label: 'Unlimited history', detail: 'Keep all session data forever, not just 90 days' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card border border-primary/20 rounded-xl p-6 mt-8 mb-2"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}
    >
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <h3 className="text-[15px] text-foreground" style={{ fontWeight: 600 }}>Unlock your full potential</h3>
          </div>
          <p className="text-[13px] text-muted-foreground">You're on the free Starter plan. Upgrade to Pro to unlock the features that help you grow.</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-5">
        {proFeatures.map((feat) => (
          <div key={feat.label} className="bg-accent/30 rounded-lg p-3.5">
            <feat.icon className="w-4 h-4 text-primary mb-2" />
            <div className="text-[13px] text-foreground mb-0.5" style={{ fontWeight: 500 }}>{feat.label}</div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">{feat.detail}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings?tab=billing')} className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all" style={{ fontWeight: 500 }}>
          <Sparkles className="w-3.5 h-3.5" /> Upgrade to Pro — $24/mo <ArrowRight className="w-3 h-3" />
        </button>
        {!trialExpired && (
          <button onClick={startTrial} className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] rounded-lg border border-primary/25 text-primary hover:bg-primary/[0.06] transition-all" style={{ fontWeight: 500 }}>
            Try Pro free for 7 days
          </button>
        )}
        {trialExpired && <span className="text-[12px] text-muted-foreground">Trial already used</span>}
      </div>
    </motion.div>
  );
}
