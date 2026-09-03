/**
 * Decimal-safe money helpers.
 *
 * All financial arithmetic in the Income & Expenses workspace runs through
 * integer cents. Values arrive from Postgres `numeric(14,2)` as strings or
 * numbers; they are converted to cents once, summed as integers, and only
 * converted back to a float at the display boundary.
 */

export type Cents = number;

/** Convert a currency amount (number | numeric string | null) to integer cents. */
export function toCents(value: number | string | null | undefined): Cents {
  if (value == null || value === '') return 0;
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return 0;
  // Round half away from zero to avoid banker-style drift on .005 inputs.
  return Math.sign(n) * Math.round(Math.abs(n) * 100);
}

/** Convert integer cents back to a currency amount. */
export function fromCents(cents: Cents): number {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

/** Sum a list of cent values. */
export function sumCents(values: Cents[]): Cents {
  let total = 0;
  for (const v of values) total += Math.round(v || 0);
  return total;
}

/**
 * Apply a percentage (0–100) to a cent amount, rounding half away from zero.
 * Used for business-use percentages and tax-rate reserves.
 */
export function pctOfCents(cents: Cents, pct: number): Cents {
  if (!Number.isFinite(cents) || !Number.isFinite(pct)) return 0;
  const raw = (cents * pct) / 100;
  return Math.sign(raw) * Math.round(Math.abs(raw));
}

/** Clamp a percentage input to the 0–100 range. Returns null for invalid input. */
export function clampPct(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

/** Parse a user-typed currency string ("$1,200.50", "-40") into cents. */
export function parseMoneyInput(input: string): Cents | null {
  if (input == null) return null;
  const cleaned = String(input).replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return toCents(n);
}
