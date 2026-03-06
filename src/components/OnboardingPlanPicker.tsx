import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Crown, ArrowRight, Sparkles } from 'lucide-react';
import { PLANS, type PlanId, type BillingInterval, annualSavings, freeMonths } from '../data/plans';

const VISIBLE_PLANS: { id: PlanId; recommended?: boolean }[] = [
  { id: 'starter' },
  { id: 'pro', recommended: true },
  { id: 'studio' },
];

const HIGHLIGHTS: Record<string, string[]> = {
  starter: [
    '1 seat',
    '5 active clients',
    'Basic insights',
    '90-day data retention',
  ],
  pro: [
    'Up to 5 seats',
    'Unlimited clients & projects',
    'Full insights suite',
    'Client invoicing',
    'Data export (PDF & CSV)',
    'Unlimited retention',
    'Standard support',
  ],
  studio: [
    'Unlimited seats',
    'Everything in Pro',
    'White-label portal',
    'Team utilization',
    'Batch invoicing & API access',
    'Priority support',
  ],
};

const ACCENT: Record<string, string> = {
  starter: '#78716c',
  pro: '#5ea1bf',
  studio: '#bfa044',
};

interface Props {
  onContinue: () => void;
}

export function OnboardingPlanPicker({ onContinue }: Props) {
  const [interval, setInterval] = useState<BillingInterval>('monthly');

  return (
    <div className="text-center">
      {/* Heading */}
      <div className="mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#5ea1bf]/8 flex items-center justify-center mx-auto mb-5">
          <Crown className="w-6 h-6 text-[#5ea1bf]" />
        </div>
        <h2
          className="text-[24px] text-[#1c1c1c] mb-2"
          style={{ fontWeight: 600, letterSpacing: '-0.015em' }}
        >
          Choose your plan
        </h2>
        <p className="text-[14px] text-[#78716c] max-w-md mx-auto leading-relaxed">
          Upgrade anytime, or stay on Starter — it's free forever.
        </p>
      </div>

      {/* Interval toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span
          className={`text-[13px] cursor-pointer transition-colors ${interval === 'monthly' ? 'text-[#1c1c1c]' : 'text-[#a8a29e]'}`}
          style={{ fontWeight: interval === 'monthly' ? 600 : 400 }}
          onClick={() => setInterval('monthly')}
        >
          Monthly
        </span>
        <button
          onClick={() => setInterval(interval === 'monthly' ? 'annual' : 'monthly')}
          className={`relative w-11 h-6 rounded-full transition-colors ${interval === 'annual' ? 'bg-[#5ea1bf]' : 'bg-stone-200'}`}
        >
          <div
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: interval === 'annual' ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </button>
        <span
          className={`text-[13px] cursor-pointer transition-colors ${interval === 'annual' ? 'text-[#1c1c1c]' : 'text-[#a8a29e]'}`}
          style={{ fontWeight: interval === 'annual' ? 600 : 400 }}
          onClick={() => setInterval('annual')}
        >
          Annual
        </span>
        <span className="text-[11px] text-[#5ea1bf] px-2 py-0.5 rounded-full bg-[#5ea1bf]/10" style={{ fontWeight: 600 }}>
          Save 2 months
        </span>
      </div>

      {/* Plan cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 max-w-2xl mx-auto"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      >
        {VISIBLE_PLANS.map(({ id, recommended }) => {
          const plan = PLANS[id];
          const accent = ACCENT[id];
          const isStarter = id === 'starter';

          const displayPrice = plan.price === 0
            ? 0
            : interval === 'annual'
              ? Math.round(plan.annualPrice / 12)
              : plan.price;

          const savings = annualSavings(id);
          const monthsFree = freeMonths(id);

          return (
            <motion.div
              key={id}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
              }}
              className={`relative rounded-xl border p-5 text-left flex flex-col ${
                recommended
                  ? 'border-[#5ea1bf]/40 ring-2 ring-[#5ea1bf]/10 bg-white'
                  : 'border-black/[0.06] bg-white'
              }`}
              style={{
                boxShadow: recommended
                  ? '0 2px 12px rgba(94,161,191,0.1)'
                  : '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              {/* Recommended badge */}
              {recommended && (
                <div
                  className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[10px] text-white bg-[#5ea1bf]"
                  style={{ fontWeight: 600, letterSpacing: '0.04em' }}
                >
                  RECOMMENDED
                </div>
              )}

              {/* Plan name + price */}
              <div className="mb-4 pt-1">
                <h3 className="text-[16px] text-[#1c1c1c]" style={{ fontWeight: 600 }}>
                  {plan.name}
                </h3>
                <p className="text-[11px] text-[#a8a29e] mt-0.5">{plan.tagline}</p>
              </div>

              <div className="mb-4">
                {displayPrice === 0 ? (
                  <div className="text-[24px] text-[#1c1c1c]" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
                    Free
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[24px] text-[#1c1c1c]" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
                        ${displayPrice}
                      </span>
                      <span className="text-[12px] text-[#a8a29e]">/mo</span>
                    </div>
                    {interval === 'annual' && savings > 0 && (
                      <p className="text-[10px] text-[#5ea1bf] mt-1" style={{ fontWeight: 600 }}>
                        Save ${savings}/yr ({monthsFree} months free)
                      </p>
                    )}
                    {interval === 'annual' && (
                      <p className="text-[10px] text-[#a8a29e] mt-0.5">
                        Billed as ${plan.annualPrice}/year
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-5">
                {HIGHLIGHTS[id]?.map((feat) => (
                  <li key={feat} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: accent }} />
                    <span className="text-[12px] text-[#44403c] leading-snug"
                      dangerouslySetInnerHTML={{ __html: feat.replace(/([\d]+|Unlimited|Everything in Pro|Basic|Full|Standard|Priority|Batch)/g, '<strong style="font-weight:600;color:#1c1c1c">$1</strong>') }}
                    />
                  </li>
                ))}
              </ul>

              {/* Button */}
              {isStarter ? (
                <button
                  onClick={onContinue}
                  className="w-full py-2.5 rounded-lg text-[13px] border border-black/[0.06] text-[#a8a29e] bg-stone-50 cursor-default"
                  style={{ fontWeight: 500 }}
                >
                  Stay on Starter
                </button>
              ) : (
                <button
                  onClick={() => {
                    onContinue();
                  }}
                  className="w-full py-2.5 rounded-lg text-[13px] text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ fontWeight: 500, backgroundColor: accent }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Get {plan.name}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Skip */}
      <button
        onClick={onContinue}
        className="text-[13px] text-[#a8a29e] hover:text-[#78716c] transition-colors"
        style={{ fontWeight: 500 }}
      >
        Skip, I'll decide later
      </button>
    </div>
  );
}
