import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Premium label — small caps-feel weight, calm muted tone.
 * Sits above inputs with tight rhythm (mb-1.5 recommended).
 */
const labelVariants = cva(
  "text-[12.5px] font-medium leading-none text-foreground/85 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 select-none",
);

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
