import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const PARSE_FORMATS = [
  "yyyy-MM-dd",
  "M/d/yyyy",
  "MM/dd/yyyy",
  "M/d/yy",
  "MMM d, yyyy",
  "MMMM d, yyyy",
];

function parseDateInput(input: string): Date | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  for (const fmt of PARSE_FORMATS) {
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }
  return undefined;
}

export function DatePicker({
  value,
  onChange,
  maxDate,
  minDate,
  disabled = false,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedDate = value
    ? parse(value, "yyyy-MM-dd", new Date())
    : undefined;

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

  useEffect(() => {
    if (!isEditing) {
      setInputValue(selectedDate ? format(selectedDate, "MMM d, yyyy") : "");
    }
  }, [value, isEditing, selectedDate]);

  const commit = (raw: string) => {
    const parsed = parseDateInput(raw);
    if (parsed && !disabledMatcher(parsed)) {
      onChange(format(parsed, "yyyy-MM-dd"));
    }
    setIsEditing(false);
  };

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  const displayValue = isEditing
    ? inputValue
    : selectedDate
      ? format(selectedDate, "MMM d, yyyy")
      : "";

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <div className={cn("relative flex items-center", className)}>
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => {
            setIsEditing(true);
            setInputValue(e.target.value);
          }}
          onFocus={() => {
            setIsEditing(true);
            setInputValue(
              selectedDate ? format(selectedDate, "MMM d, yyyy") : ""
            );
          }}
          onBlur={() => commit(inputValue)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit(inputValue);
              inputRef.current?.blur();
            } else if (e.key === "Escape") {
              setIsEditing(false);
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          disabled={disabled}
          className="h-[var(--control)] w-full rounded-md border border-transparent bg-[var(--input-background)] px-3 pr-9 text-left text-[13.5px] tabular-nums transition-all placeholder:text-muted-foreground hover:border-[var(--hairline)] focus:border-[color-mix(in_oklab,var(--primary)_55%,transparent)] focus:shadow-[var(--focus-ring)] focus:outline-none"
        />
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Open calendar"
            disabled={disabled}
            className="absolute right-0 top-0 flex h-full items-center px-2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
          >
            <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        className="w-auto p-0 z-[120] pointer-events-auto"
        align="start"
      >
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
