import { useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function FinanceTableShell({ children, total, filtered, search, onSearch, onClear, toolbar }: { children: ReactNode; total: ReactNode; filtered: boolean; search: string; onSearch: (value: string) => void; onClear: () => void; toolbar?: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ x: 0, scroll: 0 });
  const onDown = (event: MouseEvent<HTMLDivElement>) => { if ((event.target as HTMLElement).closest('button,a,input,select,textarea,[role="menu"]')) return; setDragging(true); drag.current = { x: event.clientX, scroll: scrollRef.current?.scrollLeft || 0 }; };
  const onMove = (event: MouseEvent<HTMLDivElement>) => { if (!dragging || !scrollRef.current) return; scrollRef.current.scrollLeft = drag.current.scroll - (event.clientX - drag.current.x); };
  return <div className="border border-[var(--hairline)] bg-card min-w-0">
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--hairline)] p-3">
      <div className="relative min-w-[220px] flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search records" className="pl-9 bg-[var(--surface-sunken)]" /></div>
      {filtered && <Button variant="ghost" size="sm" onClick={onClear}><X /> Clear</Button>}
      <div className="ml-auto flex flex-wrap items-center gap-2">{toolbar}</div>
    </div>
    <div ref={scrollRef} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)} className={`overflow-x-auto ${dragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}>
      <div className="min-w-max">{children}</div>
    </div>
    <div className="sticky bottom-0 z-10 border-t border-[var(--hairline)] bg-[var(--surface-raised)] px-4 py-3 text-[12px] text-muted-foreground tabular-nums">{total}</div>
  </div>;
}

/** Sunken tint applied to money columns so the numeric spine reads as a block. */
export const MONEY_CELL = 'bg-[var(--surface-sunken)]/60';
