import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard, Check, ArrowRight, Loader2, Crown,
  Users, FolderKanban, Clock, Sparkles, Lock,
  Zap, FileText, BarChart3, Palette, Globe, Shield,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePlan } from '../data/PlanContext';
import { useData } from '../data/DataContext';
import { useAuth } from '../data/AuthContext';
import {
  type PlanId, type FeatureKey,
  PLANS, FEATURE_CATEGORIES, SUPPORT_TIERS, EXPORT_FORMATS,
} from '../data/plans';
import * as settingsApi from '../data/settingsApi';

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={item}
      className={`bg-card border border-border rounded-xl p-6 ${className}`}
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      {children}
    </motion.div>
  );
}

// ── Usage Meter ────────────────────────────────────────────────────
function UsageMeter({ label, icon: Icon, current, max, color }: {
  label: string;
  icon: any;
  current: number;
  max: number | null;
  color: string;
}) {
  const isUnlimited = max === null;
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && current >= max;

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[13px]" style={{ fontWeight: 500 }}>{label}</span>
        </div>
        <span className="text-[13px] tabular-nums" style={{ fontWeight: 600, color: isAtLimit ? '#c27272' : undefined }}>
          {current}{!isUnlimited ? ` / ${max}` : ''}
          {isUnlimited && <span className="text-muted-foreground ml-1" style={{ fontWeight: 400 }}>unlimited</span>}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 rounded-full bg-accent/40 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full transition-colors"
            style={{
              backgroundColor: isAtLimit ? '#c27272' : isNearLimit ? '#bfa044' : color,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Plan Card ──────────────────────────────────────────────────────
function PlanCard({ planId, isCurrent, isOwner, onSelect, selecting }: {
  planId: PlanId;
  isCurrent: boolean;
  isOwner: boolean;
  onSelect: (id: PlanId) => void;
  selecting: PlanId | null;
}) {
  const plan = PLANS[planId];
  const isUpgrade = !isCurrent && planId !== 'starter';
  const isDowngrade = !isCurrent && planId === 'starter';
  const isSelecting = selecting === planId;

  const accentColors: Record<PlanId, string> = {
    starter: '#78716c',
    pro: '#5ea1bf',
    studio: '#bfa044',
  };
  const accent = accentColors[planId];

  const highlights: Record<PlanId, string[]> = {
    starter: [
      '1 seat',
      '5 active clients',
      '3 projects per client',
      'Basic insights only',
      'General notes',
      '90-day retention',
      'Email support',
    ],
    pro: [
      'Up to 5 seats',
      'Unlimited clients',
      'Unlimited projects',
      'Full insights suite',
      'Rich notes & action items',
      'Client invoicing',
      'Integrations',
      'Data export (PDF & CSV)',
      'Advanced notifications',
      'Unlimited retention',
      'Priority support',
    ],
    studio: [
      'Unlimited seats',
      'Everything in Pro',
      'White-label branding',
      'Team utilization',
      'Multi-workspace',
      'Batch invoicing',
      'API access & webhooks',
      'Custom invoice templates',
      'Dedicated support',
    ],
  };

  return (
    <div
      className={`relative rounded-xl border p-5 transition-all duration-200 flex flex-col ${
        isCurrent
          ? 'bg-opacity-[0.03]'
          : 'border-border hover:shadow-sm'
      }`}
      style={{
        borderColor: isCurrent ? accent : undefined,
        backgroundColor: isCurrent ? `${accent}08` : undefined,
      }}
    >
      {isCurrent && (
        <div
          className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[10px] text-white"
          style={{ fontWeight: 600, letterSpacing: '0.04em', backgroundColor: accent }}
        >
          CURRENT PLAN
        </div>
      )}

      <div className="mb-4 pt-1">
        <h3 className="text-[17px] text-foreground" style={{ fontWeight: 600 }}>
          {plan.name}
        </h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">{plan.tagline}</p>
      </div>

      <div className="mb-5">
        {plan.price === 0 ? (
          <div className="text-[28px] text-foreground" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
            Free
          </div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-[28px] text-foreground" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
              ${plan.price}
            </span>
            <span className="text-[13px] text-muted-foreground">/mo</span>
          </div>
        )}
      </div>

      <ul className="space-y-2.5 flex-1">
        {highlights[planId].map((feat) => (
          <li key={feat} className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: accent }} />
            <span className="text-[13px] text-foreground/80">{feat}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {isOwner && !isCurrent && (
          <button
            onClick={() => onSelect(planId)}
            disabled={isSelecting || selecting !== null}
            className={`w-full py-2.5 rounded-lg text-[13px] transition-all flex items-center justify-center gap-2 ${
              isUpgrade
                ? 'bg-foreground text-background hover:opacity-90'
                : 'border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
            } disabled:opacity-50`}
            style={{ fontWeight: 500 }}
          >
            {isSelecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isUpgrade ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Upgrade to {plan.name}
              </>
            ) : (
              <>Downgrade to {plan.name}</>
            )}
          </button>
        )}
        {isCurrent && (
          <div className="w-full py-2.5 rounded-lg text-[13px] text-center text-muted-foreground border border-border/50 bg-accent/20" style={{ fontWeight: 500 }}>
            Your current plan
          </div>
        )}
        {!isOwner && !isCurrent && (
          <div className="w-full py-2.5 rounded-lg text-[13px] text-center text-muted-foreground" style={{ fontWeight: 500 }}>
            Contact your workspace owner
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main BillingTab ────────────────────────────────────────────────
export default function BillingTab() {
  const { plan, planId, planDef, setPlan, limit, isTrial, trialDaysRemaining, trialExpired, startTrial } = usePlan();
  const { clients } = useData();
  const { user } = useAuth();
  const [selecting, setSelecting] = useState<PlanId | null>(null);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [downgradeReasons, setDowngradeReasons] = useState<string[]>([]);

  const DOWNGRADE_REASONS = [
    'Too expensive for my current needs',
    'Not using the Pro/Studio features enough',
    'Switching to a different tool',
    'Reducing business expenses',
    'Just testing — not ready to commit yet',
  ];

  const isOwner = true;

  const activeClients = clients.filter((c: any) => c.status !== 'Archived').length;
  const totalClients = clients.length;
  const teamMembers = 1;
  const maxSeats = limit('seats');
  const maxClients = limit('activeClients');

  const toggleDowngradeReason = (reason: string) => {
    setDowngradeReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const executePlanSwitch = useCallback(async (newPlanId: PlanId) => {
    setSelecting(newPlanId);
    try {
      const result = await settingsApi.updatePlan(newPlanId);
      setPlan({
        ...plan,
        planId: newPlanId,
        activatedAt: result.activatedAt || new Date().toISOString(),
        stripeSubscriptionId: result.stripeSubscriptionId || null,
        stripeCustomerId: result.stripeCustomerId || null,
        periodEnd: result.periodEnd || null,
        isTrial: result.isTrial || false,
        trialEnd: result.trialEnd || null,
      });
      toast.success(`Switched to ${PLANS[newPlanId].name} plan`);
      setShowPlanPicker(false);
      setShowDowngradeModal(false);
      setDowngradeReasons([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to change plan');
    } finally {
      setSelecting(null);
    }
  }, [plan, setPlan]);

  const handleSelectPlan = useCallback((newPlanId: PlanId) => {
    if (!isOwner) return;
    if (newPlanId === 'starter' && planId !== 'starter') {
      setShowDowngradeModal(true);
      return;
    }
    executePlanSwitch(newPlanId);
  }, [isOwner, planId, executePlanSwitch]);

  return (
    <motion.div
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Current Plan Overview */}
      <SectionCard>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-[17px] text-foreground" style={{ fontWeight: 600 }}>
                {planDef.name} Plan
              </h2>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] tracking-wide"
                style={{
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  backgroundColor: planId === 'starter' ? 'rgba(120,113,108,0.1)' : planId === 'pro' ? 'rgba(94,161,191,0.1)' : 'rgba(191,160,68,0.1)',
                  color: planId === 'starter' ? '#78716c' : planId === 'pro' ? '#5ea1bf' : '#bfa044',
                }}
              >
                {planId === 'starter' ? 'FREE' : 'ACTIVE'}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground">{planDef.tagline}</p>
            {plan.activatedAt && (
              <p className="text-[12px] text-muted-foreground/60 mt-1">
                Active since {new Date(plan.activatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
          <div className="text-right">
            {planDef.price === 0 ? (
              <div className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>Free</div>
            ) : (
              <div>
                <span className="text-[24px] text-foreground" style={{ fontWeight: 700 }}>${planDef.price}</span>
                <span className="text-[13px] text-muted-foreground">/mo</span>
              </div>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="mt-5 pt-5 border-t border-border">
            <button
              onClick={() => setShowPlanPicker(p => !p)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-[13px] rounded-lg transition-all ${
                showPlanPicker
                  ? 'border border-border text-foreground hover:bg-accent/40'
                  : 'text-white shadow-sm hover:shadow-md hover:opacity-95'
              }`}
              style={{
                fontWeight: 500,
                ...(!showPlanPicker ? {
                  background: planId === 'studio'
                    ? 'linear-gradient(135deg, #bfa044 0%, #d4b85a 50%, #bfa044 100%)'
                    : 'linear-gradient(135deg, #5ea1bf 0%, #7ab8d1 50%, #5ea1bf 100%)',
                } : {}),
              }}
            >
              {planId === 'studio' ? (
                <>
                  <Crown className="w-3.5 h-3.5" />
                  {showPlanPicker ? 'Hide plans' : 'Manage plan'}
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  {showPlanPicker ? 'Hide plans' : 'Compare plans'}
                </>
              )}
            </button>
          </div>
        )}

        {!isOwner && planId !== 'studio' && (
          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-[13px] text-muted-foreground">
              Only the workspace owner can change the plan. Contact them to upgrade.
            </p>
          </div>
        )}
      </SectionCard>

      {/* Trial CTA for Starter users */}
      {planId === 'starter' && !isTrial && isOwner && (
        <SectionCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#5ea1bf]/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#5ea1bf]" />
              </div>
              <div>
                <h3 className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                  {trialExpired ? 'Your Pro trial has ended' : 'Try Pro free for 7 days'}
                </h3>
                <p className="text-[12px] text-muted-foreground">
                  {trialExpired
                    ? 'Upgrade to restore full insights, invoicing, exports & more'
                    : 'Unlock full insights, invoicing, integrations, exports & more — no credit card required'}
                </p>
              </div>
            </div>
            {!trialExpired && (
              <button
                onClick={startTrial}
                className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-[13px] rounded-lg bg-[#5ea1bf]/10 text-[#5ea1bf] hover:bg-[#5ea1bf]/20 transition-all"
                style={{ fontWeight: 500 }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Start free trial
              </button>
            )}
          </div>
        </SectionCard>
      )}

      {/* Active trial banner */}
      {isTrial && planId === 'starter' && (
        <SectionCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#5ea1bf]/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#5ea1bf]" />
              </div>
              <div>
                <h3 className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                  Pro trial active — {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} remaining
                </h3>
                <p className="text-[12px] text-muted-foreground">
                  You have access to all Pro features. Upgrade before the trial ends to keep them.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPlanPicker(true)}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-[13px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all"
              style={{ fontWeight: 500 }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade now
            </button>
          </div>
        </SectionCard>
      )}

      {/* Plan Picker */}
      {showPlanPicker && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="bg-card border border-border rounded-xl overflow-hidden"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-[15px] text-foreground" style={{ fontWeight: 600 }}>Choose your plan</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Plans apply to the entire workspace. Stripe billing coming soon.
              </p>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4">
              {(['starter', 'pro', 'studio'] as PlanId[]).map((id) => (
                <PlanCard
                  key={id}
                  planId={id}
                  isCurrent={id === planId}
                  isOwner={isOwner}
                  onSelect={handleSelectPlan}
                  selecting={selecting}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Usage */}
      <SectionCard>
        <div className="mb-4">
          <h3 className="text-[15px] text-foreground" style={{ fontWeight: 600 }}>Usage</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Current workspace usage against plan limits</p>
        </div>
        <div className="divide-y divide-border">
          <UsageMeter
            label="Active clients"
            icon={Users}
            current={activeClients}
            max={maxClients}
            color="#5ea1bf"
          />
          <UsageMeter
            label="Workspace seats"
            icon={Users}
            current={teamMembers}
            max={maxSeats}
            color="#5ea1bf"
          />
          {planId === 'starter' && (
            <div className="py-3 flex items-center gap-2 text-[12px] text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Session data retained for <span style={{ fontWeight: 500 }} className="text-foreground">90 days</span></span>
              {isOwner && (
                <button
                  onClick={() => setShowPlanPicker(true)}
                  className="ml-auto text-[11px] text-[#5ea1bf] hover:text-[#4d8fad] transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Upgrade for unlimited
                </button>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Feature Availability */}
      <SectionCard>
        <div className="mb-4">
          <h3 className="text-[15px] text-foreground" style={{ fontWeight: 600 }}>What's included</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Features available on your {planDef.name} plan</p>
        </div>
        <div className="space-y-5">
          <div>
            <div className="text-[12px] text-muted-foreground mb-2.5" style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
              PRO FEATURES
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {FEATURE_CATEGORIES.pro.map(({ key, label }) => {
                const available = planDef.features[key];
                return (
                  <div key={key} className="flex items-center gap-2 py-1">
                    {available ? (
                      <Check className="w-3.5 h-3.5 text-[#5ea1bf] flex-shrink-0" />
                    ) : (
                      <Lock className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={`text-[13px] ${available ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[12px] text-muted-foreground mb-2.5" style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
              STUDIO FEATURES
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {FEATURE_CATEGORIES.studio.map(({ key, label }) => {
                const available = planDef.features[key];
                return (
                  <div key={key} className="flex items-center gap-2 py-1">
                    {available ? (
                      <Check className="w-3.5 h-3.5 text-[#bfa044] flex-shrink-0" />
                    ) : (
                      <Lock className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={`text-[13px] ${available ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[12px] text-muted-foreground">{SUPPORT_TIERS[planId]}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[12px] text-muted-foreground">
              Export: {EXPORT_FORMATS[planId].join(', ')}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Billing History placeholder */}
      <SectionCard>
        <div className="mb-4">
          <h3 className="text-[15px] text-foreground" style={{ fontWeight: 600 }}>Billing history</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Invoice history and payment receipts</p>
        </div>
        <div className="py-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-accent/40 flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-4.5 h-4.5 text-muted-foreground" />
          </div>
          <p className="text-[13px] text-muted-foreground">
            {planId === 'starter'
              ? 'No billing history — you\'re on the free plan'
              : 'Billing history will appear here once Stripe is connected'}
          </p>
        </div>
      </SectionCard>

      {/* ── Downgrade Confirmation Modal ──────────────────────────── */}
      <AnimatePresence>
        {showDowngradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
            onClick={() => { setShowDowngradeModal(false); setDowngradeReasons([]); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl p-7 max-w-md w-full mx-4"
              style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-11 h-11 rounded-xl bg-[#bfa044]/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-5 h-5 text-[#bfa044]" />
              </div>
              <h3 className="text-[16px] text-foreground mb-1" style={{ fontWeight: 600 }}>
                Downgrade to Starter?
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-1">
                You'll lose access to features like full insights, invoicing, integrations, data exports, and advanced notifications.
              </p>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
                {activeClients > 5
                  ? `You currently have ${activeClients} active clients — Starter allows up to 5. You'll need to archive some clients.`
                  : 'Your existing data will be preserved, but gated features will become read-only.'}
              </p>

              <div className="mb-5">
                <label className="text-[12px] text-foreground mb-2.5 block" style={{ fontWeight: 600 }}>
                  Reason for downgrading <span className="text-muted-foreground font-normal">(select at least one)</span>
                </label>
                <div className="space-y-2">
                  {DOWNGRADE_REASONS.map((reason) => {
                    const checked = downgradeReasons.includes(reason);
                    return (
                      <button
                        key={reason}
                        onClick={() => toggleDowngradeReason(reason)}
                        className={`w-full flex items-center gap-3 text-left px-3.5 py-2.5 rounded-lg border transition-all text-[13px] ${
                          checked
                            ? 'border-[#5ea1bf]/30 bg-[#5ea1bf]/[0.04]'
                            : 'border-border hover:bg-accent/30'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-all ${
                          checked
                            ? 'bg-[#5ea1bf] border-[#5ea1bf]'
                            : 'border-stone-300'
                        }`}>
                          {checked && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-foreground/80">{reason}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => { setShowDowngradeModal(false); setDowngradeReasons([]); }}
                  className="px-4 py-2 text-[13px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
                  style={{ fontWeight: 500 }}
                >
                  Keep my plan
                </button>
                <button
                  onClick={() => executePlanSwitch('starter')}
                  disabled={downgradeReasons.length === 0 || selecting === 'starter'}
                  className="px-4 py-2 text-[13px] rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                  style={{ fontWeight: 500 }}
                >
                  {selecting === 'starter' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {selecting === 'starter' ? 'Downgrading...' : 'Confirm downgrade'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
