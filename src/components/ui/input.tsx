import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Premium input — soft sunken surface, hairline border,
 * primary-accent focus halo. No harsh borders.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-[var(--control)] w-full rounded-md px-3 py-1.5",
          "text-[13.5px] text-foreground placeholder:text-muted-foreground/70",
          "bg-[var(--input-background)]",
          "border border-transparent",
          "transition-[box-shadow,border-color,background-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "hover:border-[var(--hairline)]",
          "focus-visible:outline-none focus-visible:border-[color-mix(in_oklab,var(--primary)_55%,transparent)] focus-visible:shadow-[var(--focus-ring)] focus-visible:bg-[var(--surface-raised)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "md:text-[13.5px]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
