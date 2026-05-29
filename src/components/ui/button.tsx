import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Premium button — Monarch-calm + Apple HIG.
 * Tactile press, soft elevation, restrained surfaces.
 * Use `default` for primary action, `secondary` for adjacent neutral action,
 * `ghost` for low-emphasis, `outline` for forms.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md text-[13px] font-medium tracking-tight cursor-pointer select-none",
    "transition-[transform,box-shadow,background-color,color,opacity]",
    "duration-150 ease-[cubic-bezier(0.32,0.72,0,1)]",
    "focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:pointer-events-none",
    "active:scale-[0.985]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--elev-1),inset_0_1px_0_rgba(255,255,255,0.10)] hover:shadow-[var(--elev-2),inset_0_1px_0_rgba(255,255,255,0.12)] hover:opacity-95",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--elev-1)] hover:shadow-[var(--elev-2)] hover:opacity-95",
        outline:
          "bg-transparent text-foreground border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-accent/60",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost:
          "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/60",
        link:
          "text-primary underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3 text-[12.5px]",
        lg: "h-10 px-5 text-[14px]",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
