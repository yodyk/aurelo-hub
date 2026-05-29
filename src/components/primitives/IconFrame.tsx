/**
 * IconFrame — tinted rounded square housing a Lucide icon. Replaces every
 * freehand `w-8 h-8 rounded bg-…/10` pattern. One primitive, one set of
 * sizes, one tone vocabulary.
 */
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IconFrameSize = 'sm' | 'md' | 'lg';
export type IconFrameTone =
  | 'primary'
  | 'accent'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'destructive';

const FRAME_SIZE: Record<IconFrameSize, string> = {
  sm: 'h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'h-9 w-9 [&_svg]:h-4 [&_svg]:w-4',
  lg: 'h-11 w-11 [&_svg]:h-5 [&_svg]:w-5',
};

const FRAME_TONE: Record<IconFrameTone, string> = {
  primary:     'bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-primary',
  accent:      'bg-[var(--surface-sunken)] text-foreground/80',
  neutral:     'bg-[var(--surface-sunken)] text-muted-foreground',
  success:     'bg-[color-mix(in_oklab,var(--success)_12%,transparent)] text-success',
  warning:     'bg-[color-mix(in_oklab,var(--warning)_14%,transparent)] text-warning',
  destructive: 'bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] text-destructive',
};

export interface IconFrameProps {
  glyph: LucideIcon;
  size?: IconFrameSize;
  tone?: IconFrameTone;
  className?: string;
  'aria-hidden'?: boolean;
}

export function IconFrame({
  glyph: Glyph,
  size = 'md',
  tone = 'neutral',
  className,
  ...rest
}: IconFrameProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-[4px] shrink-0',
        FRAME_SIZE[size],
        FRAME_TONE[tone],
        className,
      )}
      {...rest}
    >
      <Glyph strokeWidth={1.75} />
    </span>
  );
}
