/**
 * EmptyState — Aurelo's confident, calm empty surface.
 *
 * Empty states are brand moments, not error states. Tone is operational:
 * acknowledge the state, orient the user to the next step, offer a clear
 * primary action.
 *
 * Copy guide:
 *   - Title: name the absence in product language ("No invoices yet")
 *   - Body : single sentence orienting the next step
 *   - Avoid: "Nothing here", "Oops", mascots, exclamation marks
 */
import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconFrame } from './IconFrame';
import { cn } from '@/lib/utils';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  /** Optional icon shown left of the label. */
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  glyph: LucideIcon;
  title: string;
  body?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  /** Visual density. `inline` for table/inline contexts, `page` for full surfaces. */
  variant?: 'inline' | 'page';
  className?: string;
}

export function EmptyState({
  glyph,
  title,
  body,
  primaryAction,
  secondaryAction,
  variant = 'inline',
  className,
}: EmptyStateProps) {
  const isPage = variant === 'page';
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isPage ? 'py-20 px-6 gap-4' : 'py-14 px-6 gap-3',
        className,
      )}
    >
      <IconFrame glyph={glyph} size={isPage ? 'lg' : 'md'} tone="neutral" />
      <div className="space-y-1.5 max-w-sm">
        <h3
          className="text-foreground"
          style={{
            fontSize: isPage ? '17px' : '15px',
            fontWeight: 600,
            letterSpacing: '-0.012em',
            lineHeight: 1.3,
          }}
        >
          {title}
        </h3>
        {body && (
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {body}
          </p>
        )}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className={cn('flex items-center gap-2', isPage ? 'mt-2' : 'mt-1')}>
          {primaryAction && (
            <Button size="sm" onClick={primaryAction.onClick}>
              {primaryAction.icon && <primaryAction.icon />}
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.icon && <secondaryAction.icon />}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
