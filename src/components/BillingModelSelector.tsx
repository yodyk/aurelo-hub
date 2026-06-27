/**
 * BillingModelSelector — the canonical primitive for choosing an engagement's
 * billing model. Architected so new models (Milestone, Subscription, Usage-Based)
 * are additive — register them in BILLING_MODEL_OPTIONS and every modal,
 * settings surface, and form picks them up for free.
 *
 * Visual is restrained on purpose: the chooser is a *contract* decision, not
 * a feature highlight. Active state uses primary tinting only — never a
 * celebratory color.
 */
import { Clock, Repeat, FolderKanban, type LucideIcon } from 'lucide-react';
import type { BillingModel } from '@/lib/revenue';

export interface BillingModelOption {
  id: BillingModel;
  label: string;
  icon: LucideIcon;
  hint: string;
  /** Future models start `comingSoon: true` until their engine path is wired. */
  comingSoon?: boolean;
}

export const BILLING_MODEL_OPTIONS: BillingModelOption[] = [
  { id: 'Hourly',   label: 'Hourly',     icon: Clock,         hint: 'Revenue = hours × rate' },
  { id: 'Retainer', label: 'Retainer',   icon: Repeat,        hint: 'Monthly contract' },
  { id: 'FixedFee', label: 'Fixed Fee',  icon: FolderKanban,  hint: 'Recognized on delivery' },
  // Reserved — surfaces will reveal these as the engine adds support.
  // { id: 'Milestone',    label: 'Milestone',    icon: Flag,    hint: 'Recognized at milestone', comingSoon: true },
  // { id: 'Subscription', label: 'Subscription', icon: Repeat,  hint: 'Auto-renewing',            comingSoon: true },
];

export interface BillingModelSelectorProps {
  value: BillingModel;
  onChange: (model: BillingModel) => void;
  /** Limit selectable models — defaults to every non-comingSoon option. */
  available?: BillingModel[];
  variant?: 'cards' | 'compact';
}

export function BillingModelSelector({
  value, onChange, available, variant = 'cards',
}: BillingModelSelectorProps) {
  const opts = BILLING_MODEL_OPTIONS.filter(
    (o) => !o.comingSoon && (!available || available.includes(o.id)),
  );

  if (variant === 'compact') {
    return (
      <div className="grid grid-cols-3 gap-2">
        {opts.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`flex flex-col gap-0.5 px-2 py-2 rounded-lg border text-left transition-all duration-200 ${
                active
                  ? 'bg-primary/6 border-primary/25 ring-1 ring-primary/15'
                  : 'border-border hover:bg-accent/40'
              }`}
            >
              <span
                className={`text-[12px] ${active ? 'text-primary' : 'text-foreground'}`}
                style={{ fontWeight: 600 }}
              >
                {opt.label}
              </span>
              <span className="text-[10.5px] text-muted-foreground">{opt.hint}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {opts.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex-1 min-w-[120px] flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border text-left transition-all duration-200 ${
              active
                ? 'bg-primary/6 border-primary/25 ring-1 ring-primary/15'
                : 'border-border hover:bg-accent/40'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span
                className={`text-[13px] ${active ? 'text-primary' : 'text-foreground'}`}
                style={{ fontWeight: 600 }}
              >
                {opt.label}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground leading-snug">{opt.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Map legacy client `model` strings to the canonical engine model. */
export function legacyToBillingModel(model?: string | null): BillingModel {
  if (model === 'Retainer') return 'Retainer';
  if (model === 'Project' || model === 'FixedFee') return 'FixedFee';
  return 'Hourly';
}

/** Map canonical engine model back to the legacy DB `model` string. */
export function billingModelToLegacy(model: BillingModel): 'Hourly' | 'Retainer' | 'Project' {
  if (model === 'Retainer') return 'Retainer';
  if (model === 'FixedFee') return 'Project';
  return 'Hourly';
}
