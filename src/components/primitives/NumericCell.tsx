/**
 * NumericCell — right-aligned, tabular-numerals cell content. Pair with
 * `<TableCell numeric>` so columns of currency, percent, duration, and counts
 * line up at the decimal.
 *
 * Pass a pre-formatted string (from `formatMoney`, `formatDuration`, etc.) or
 * use the `tone` prop to render an em-dash for missing values.
 */
import { cn } from '@/lib/utils';
import { EMPTY_CELL } from '@/lib/format';

export interface NumericCellProps {
  /** Pre-formatted display string. Falsy values render as em-dash. */
  value: string | number | null | undefined;
  /** Optional helper text shown below the primary value (smaller, muted). */
  hint?: string;
  /** Visual emphasis. */
  tone?: 'default' | 'muted' | 'positive' | 'negative';
  className?: string;
}

const TONE: Record<NonNullable<NumericCellProps['tone']>, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  positive: 'text-success',
  negative: 'text-destructive',
};

export function NumericCell({ value, hint, tone = 'default', className }: NumericCellProps) {
  const display = value == null || value === '' ? EMPTY_CELL : value;
  return (
    <span
      className={cn(
        'inline-flex flex-col items-end tabular-nums leading-tight',
        TONE[tone],
        className,
      )}
    >
      <span className="text-[13.5px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {display}
      </span>
      {hint && (
        <span className="text-[11.5px] text-muted-foreground/80 mt-0.5">
          {hint}
        </span>
      )}
    </span>
  );
}
