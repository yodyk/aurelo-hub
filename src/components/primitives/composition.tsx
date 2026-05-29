/**
 * Aurelo composition primitives — Phase 1 of the refined roadmap.
 *
 * These are the building blocks the new altitude-based screens compose from.
 * Use these instead of bespoke headers/cards/segments in new code.
 *
 * Altitude vocabulary:
 *   Display  — marquee numbers, one per page max
 *   Page     — page H1
 *   Section  — section / modal / card group title
 *   Body     — workhorse UI text
 *   Meta     — captions, eyebrows, helper text
 */
import { type ReactNode } from 'react';

/* ────────────────────────────────────────────────────────────
 * PageHeader — every page's masthead.
 * Title (Page altitude), optional subtitle (Meta), right-aligned actions.
 * No card chrome. Hairline divider below.
 * ──────────────────────────────────────────────────────────── */
export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="px-4 lg:px-6 pt-6 pb-5 border-b border-border">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && <div className="type-eyebrow mb-1.5">{eyebrow}</div>}
          <h1 className="type-page truncate">{title}</h1>
          {subtitle && (
            <div className="type-meta mt-1.5">{subtitle}</div>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * SectionEyebrow — uppercase tracked label that opens a content zone.
 * Use above lists, tables, content groups. Replaces card titles.
 * ──────────────────────────────────────────────────────────── */
export function SectionEyebrow({
  children,
  trailing,
  className = '',
}: {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${className}`}>
      <div className="type-eyebrow">{children}</div>
      {trailing && <div className="type-meta">{trailing}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * DisplayMetric — the editorial number. Use sparingly (max one per zone).
 * Pairs the number with an optional unit + delta line.
 * ──────────────────────────────────────────────────────────── */
export function DisplayMetric({
  value,
  unit,
  delta,
  trend,
}: {
  value: ReactNode;
  unit?: ReactNode;
  delta?: ReactNode;
  trend?: 'up' | 'down' | 'flat';
}) {
  const trendColor =
    trend === 'up'
      ? 'text-[color:var(--success)]'
      : trend === 'down'
        ? 'text-[color:var(--destructive)]'
        : 'text-muted-foreground';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <span className="type-display">{value}</span>
        {unit && <span className="type-meta">{unit}</span>}
      </div>
      {delta && <div className={`type-meta ${trendColor}`}>{delta}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * SegmentedControl — the page's organizing principle (e.g. invoice status).
 * Hairline track, single accent for the active segment. Optional count badges.
 * ──────────────────────────────────────────────────────────── */
export type SegmentOption<T extends string = string> = {
  value: T;
  label: string;
  count?: number;
};

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-[color:var(--surface-sunken)] border border-border"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12.5px] transition-colors ${
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={{ fontWeight: active ? 600 : 500 }}
          >
            {opt.label}
            {typeof opt.count === 'number' && (
              <span
                className={`type-meta ${active ? 'text-foreground' : ''} tabular-nums`}
                style={{ opacity: opt.count === 0 ? 0.5 : 1 }}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * HairlineBar — single-color progress bar without card chrome.
 * Pass a value 0..1. Tone shifts at 0.7 / 0.85 / 0.9.
 * ──────────────────────────────────────────────────────────── */
export function HairlineBar({
  value,
  threshold = true,
  height = 2,
}: {
  value: number;
  threshold?: boolean;
  height?: number;
}) {
  const v = Math.max(0, Math.min(1, value));
  let color = 'var(--primary)';
  if (threshold) {
    if (v >= 0.9) color = 'var(--destructive)';
    else if (v >= 0.85) color = 'var(--warning)';
    else if (v >= 0.7) color = 'var(--primary)';
    else color = 'var(--muted-foreground)';
  }
  return (
    <div
      className="w-full bg-[color:var(--hairline)] overflow-hidden"
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        style={{
          width: `${v * 100}%`,
          height: '100%',
          background: color,
          transition: 'width 240ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      />
    </div>
  );
}
