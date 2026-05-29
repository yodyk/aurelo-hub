import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Premium table — generous row rhythm, hairline dividers,
 * editorial eyebrow headers. No heavy borders or zebra fills.
 */
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-[13.5px]", className)} {...props} />
    </div>
  )
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-[var(--hairline)]", className)} {...props} />
  )
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  )
);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-[var(--hairline)] transition-colors duration-150 ease-out",
        "hover:bg-[var(--row-hover)] data-[state=selected]:bg-accent",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

interface NumericProp { numeric?: boolean }

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & NumericProp
>(({ className, numeric, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-[52px] px-3 align-middle text-[10.5px] uppercase text-muted-foreground/80",
      numeric ? "text-right tabular-nums" : "text-left",
      "[&:has([role=checkbox])]:pr-0",
      className
    )}
    style={{ fontWeight: 600, letterSpacing: "0.08em" }}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & NumericProp
>(({ className, numeric, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-3 py-3.5 align-middle [&:has([role=checkbox])]:pr-0",
      numeric && "text-right tabular-nums",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
