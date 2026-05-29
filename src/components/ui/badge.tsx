import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Premium badge — soft tinted surfaces, hairline contrast,
 * minimal shadow. Reads as metadata, not decoration.
 */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
    "text-[11px] font-medium tracking-tight leading-none",
    "transition-colors duration-150 ease-out",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-primary border border-[color-mix(in_oklab,var(--primary)_18%,transparent)]",
        secondary:
          "bg-secondary text-secondary-foreground/90 border border-[var(--hairline)]",
        destructive:
          "bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] text-destructive border border-[color-mix(in_oklab,var(--destructive)_20%,transparent)]",
        success:
          "bg-[color-mix(in_oklab,var(--success)_12%,transparent)] text-success border border-[color-mix(in_oklab,var(--success)_22%,transparent)]",
        warning:
          "bg-[color-mix(in_oklab,var(--warning)_14%,transparent)] text-warning border border-[color-mix(in_oklab,var(--warning)_24%,transparent)]",
        outline:
          "text-foreground/85 border border-[var(--border)] bg-transparent",
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
