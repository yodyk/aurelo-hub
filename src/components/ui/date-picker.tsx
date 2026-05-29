import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  /** YYYY-MM-DD string value */
  value: string;
  onChange: (value: string) => void;
  /** Disable dates after this (YYYY-MM-DD) */
  maxDate?: string;
  /** Disable dates before this (YYYY-MM-DD) */
  minDate?: string;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  maxDate,
  minDate,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const selectedDate = value
    ? parse(value, "yyyy-MM-dd", new Date())
    : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"));
    }
  };

  const disabledMatcher = (date: Date) => {
    if (maxDate) {
      const max = parse(maxDate, "yyyy-MM-dd", new Date());
      max.setHours(23, 59, 59, 999);
      if (date > max) return true;
    }
    if (minDate) {
      const min = parse(minDate, "yyyy-MM-dd", new Date());
      min.setHours(0, 0, 0, 0);
      if (date < min) return true;
    }
    return false;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-2 h-[var(--control)] px-3 text-[13.5px] bg-[var(--input-background)] border border-transparent rounded-md text-left transition-all hover:border-[var(--hairline)] focus:outline-none focus-visible:border-[color-mix(in_oklab,var(--primary)_55%,transparent)] focus-visible:shadow-[var(--focus-ring)]",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="tabular-nums">
            {selectedDate
              ? format(selectedDate, "MMM d, yyyy")
              : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={disabledMatcher}
          initialFocus
          defaultMonth={selectedDate}
        />
      </PopoverContent>
    </Popover>
  );
}
