import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Premium badge — soft tinted surfaces, hairline contrast,
 * minimal shadow. Reads as metadata, not decoration.
 */
/**
 * Aurelo badge — metadata, not decoration.
 * 8% tinted surface, high-contrast tinted text, no border.
 * 12px Inter, tabular-nums for any numeric content.
 */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-md px-2 py-[3px]",
    "text-[12px] font-medium leading-none tabular-nums",
    "transition-colors duration-150 ease-out",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-[color-mix(in_oklab,var(--primary)_8%,transparent)] text-primary",
        secondary:
          "bg-[var(--surface-sunken)] text-foreground/80",
        destructive:
          "bg-[color-mix(in_oklab,var(--destructive)_8%,transparent)] text-destructive",
        success:
          "bg-[color-mix(in_oklab,var(--success)_10%,transparent)] text-success",
        warning:
          "bg-[color-mix(in_oklab,var(--warning)_12%,transparent)] text-warning",
        outline:
          "text-foreground/85 border border-[var(--hairline)] bg-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
