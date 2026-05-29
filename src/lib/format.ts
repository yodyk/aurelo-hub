/**
 * Aurelo Formatter System — single source of truth for all numeric/temporal
 * presentation. Every surface uses these helpers. No raw `toLocaleString`,
 * `toFixed`, or hardcoded `$` template literals anywhere else in the app.
 *
 * Three precision tiers govern numeric output:
 *   - exact   → tables, invoices, financial detail surfaces
 *   - display → charts, mid-density surfaces
 *   - compact → KPIs, summary chips, sidebar counts
 */

import {
  format as fnsFormat,
  formatDistanceToNowStrict,
  parseISO,
  isValid,
} from 'date-fns';

// ─── shared types ──────────────────────────────────────────────

export type NumericPrecision = 'exact' | 'display' | 'compact';

const DEFAULT_LOCALE =
  typeof navigator !== 'undefined' && navigator.language
    ? navigator.language
    : 'en-US';

// ─── money ─────────────────────────────────────────────────────

export interface MoneyOptions {
  currency?: string;            // ISO 4217; defaults to USD
  precision?: NumericPrecision; // default 'exact'
  locale?: string;
  showZeroDecimals?: boolean;   // exact only; default true
}

/**
 * Currency formatter. Decimal alignment is preserved with tabular-nums in CSS;
 * this helper produces the string only.
 *
 * exact   → $1,245,382.50
 * display → $1.25M  /  $12,345
 * compact → $1.25M  /  $125k  /  $1,250
 */
export function formatMoney(value: number | null | undefined, opts: MoneyOptions = {}): string {
  const {
    currency = 'USD',
    precision = 'exact',
    locale = DEFAULT_LOCALE,
    showZeroDecimals = true,
  } = opts;

  if (value == null || !Number.isFinite(value)) return '—';

  if (precision === 'exact') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: showZeroDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  const abs = Math.abs(value);

  if (precision === 'compact') {
    if (abs >= 1_000_000) return currencySymbol(currency, locale) + roundFixed(value / 1_000_000, 2) + 'M';
    if (abs >= 10_000)    return currencySymbol(currency, locale) + roundFixed(value / 1_000, 0) + 'k';
    if (abs >= 1_000)     return currencySymbol(currency, locale) + roundFixed(value / 1_000, 1) + 'k';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }

  // display
  if (abs >= 1_000_000) return currencySymbol(currency, locale) + roundFixed(value / 1_000_000, 1) + 'M';
  if (abs >= 100_000)   return currencySymbol(currency, locale) + roundFixed(value / 1_000, 0) + 'k';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function currencySymbol(currency: string, locale: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? '$';
  } catch {
    return '$';
  }
}

function roundFixed(n: number, digits: number): string {
  const fixed = n.toFixed(digits);
  // strip trailing zeros only when digits > 0 and value isn't whole
  if (digits === 0) return fixed;
  return fixed.replace(/\.?0+$/, '');
}

// ─── percent ───────────────────────────────────────────────────

export interface PercentOptions {
  /** If true, treats input as 0..1; else 0..100. Default: true. */
  fraction?: boolean;
  maxFractionDigits?: number;
  stripTrailingZeros?: boolean;
}

export function formatPercent(value: number | null | undefined, opts: PercentOptions = {}): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const { fraction = true, maxFractionDigits = 1, stripTrailingZeros = true } = opts;
  const pct = fraction ? value * 100 : value;
  let s = pct.toFixed(maxFractionDigits);
  if (stripTrailingZeros) s = s.replace(/\.?0+$/, '');
  return s + '%';
}

// ─── date ──────────────────────────────────────────────────────

export type DateVariant = 'short' | 'medium' | 'long' | 'relative' | 'iso';

const DATE_PATTERNS: Record<Exclude<DateVariant, 'relative' | 'iso'>, string> = {
  short: 'MMM d',
  medium: 'MMM d, yyyy',
  long: 'EEEE, MMMM d, yyyy',
};

export function formatDate(value: Date | string | null | undefined, variant: DateVariant = 'medium'): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : parseISO(value);
  if (!isValid(date)) return '—';
  if (variant === 'iso') return fnsFormat(date, 'yyyy-MM-dd');
  if (variant === 'relative') return formatRelative(date);
  return fnsFormat(date, DATE_PATTERNS[variant]);
}

export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : parseISO(value);
  if (!isValid(date)) return '—';
  const diffMs = date.getTime() - Date.now();
  const past = diffMs < 0;
  const distance = formatDistanceToNowStrict(date, { addSuffix: false });
  return past ? `${distance} ago` : `in ${distance}`;
}

// ─── duration ──────────────────────────────────────────────────

export interface DurationOptions {
  variant?: 'exact' | 'display' | 'compact';
}

/** Hours → human duration. Input is hours (decimal). */
export function formatDuration(hours: number | null | undefined, opts: DurationOptions = {}): string {
  if (hours == null || !Number.isFinite(hours)) return '—';
  const { variant = 'exact' } = opts;

  if (variant === 'compact') {
    if (hours >= 1000) return `${roundFixed(hours / 1000, 1)}k hrs`;
    if (hours >= 10)   return `${Math.round(hours)} hrs`;
    return `${roundFixed(hours, 1)} hrs`;
  }
  if (variant === 'display') {
    return `${roundFixed(hours, 1)} hrs`;
  }
  // exact — preserve up to 2 decimals, strip trailing zeros, append "hrs"
  return `${roundFixed(hours, 2)} hrs`;
}

// ─── bytes ─────────────────────────────────────────────────────

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/** Binary base (1024). Integer for ≥10 of a unit, one decimal otherwise. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const v = bytes / Math.pow(1024, idx);
  const out = v >= 10 || idx === 0 ? Math.round(v).toString() : roundFixed(v, 1);
  return `${out} ${BYTE_UNITS[idx]}`;
}

// ─── count ─────────────────────────────────────────────────────

export interface CountOptions {
  variant?: 'exact' | 'compact';
  locale?: string;
}

export function formatCount(n: number | null | undefined, opts: CountOptions = {}): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const { variant = 'exact', locale = DEFAULT_LOCALE } = opts;
  if (variant === 'compact') {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${roundFixed(n / 1_000_000, 1)}M`;
    if (abs >= 10_000)    return `${Math.round(n / 1_000)}k`;
    if (abs >= 1_000)     return `${roundFixed(n / 1_000, 1)}k`;
  }
  return new Intl.NumberFormat(locale).format(n);
}

// ─── empty cell helper ─────────────────────────────────────────

/** Em-dash for missing cells, consistent with formatter outputs. */
export const EMPTY_CELL = '—';
