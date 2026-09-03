import { Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ColumnDef } from './columnPrefs';

export function ColumnChooser({
  columns,
  visible,
  onToggle,
  onReset,
}: {
  columns: ColumnDef[];
  visible: Set<string>;
  onToggle: (key: string) => void;
  onReset: () => void;
}) {
  const toggleable = columns.filter((c) => !c.locked);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 /> Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <div className="border-b border-[var(--hairline)] px-3 py-2 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
          Visible columns
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {toggleable.map((column) => (
            <label
              key={column.key}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-[var(--row-hover)]"
            >
              <input
                type="checkbox"
                checked={visible.has(column.key)}
                onChange={() => onToggle(column.key)}
                className="h-3.5 w-3.5 cursor-pointer accent-[var(--primary)]"
              />
              <span>{column.label}</span>
            </label>
          ))}
        </div>
        <div className="border-t border-[var(--hairline)] px-2 py-1.5">
          <Button variant="ghost" size="sm" className="h-7 w-full justify-start text-xs" onClick={onReset}>
            Reset to default
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
