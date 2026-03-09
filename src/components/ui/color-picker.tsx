import { useState, useRef, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Pipette } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#5ea1bf', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#64748b', '#1e293b', '#ffffff',
];

const MAX_RECENT = 6;

function getRecentColors(): string[] {
  try {
    return JSON.parse(localStorage.getItem('aurelo-recent-colors') || '[]');
  } catch {
    return [];
  }
}

function addRecentColor(color: string) {
  const normalized = color.toLowerCase();
  const recent = getRecentColors().filter((c) => c !== normalized);
  recent.unshift(normalized);
  try {
    localStorage.setItem('aurelo-recent-colors', JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {}
}

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  const [recentColors, setRecentColors] = useState(getRecentColors);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectColor = useCallback(
    (color: string) => {
      const c = color.toLowerCase();
      setHex(c);
      onChange(c);
      addRecentColor(c);
      setRecentColors(getRecentColors());
    },
    [onChange],
  );

  const handleHexInput = (raw: string) => {
    setHex(raw);
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
      onChange(raw.toLowerCase());
      addRecentColor(raw);
      setRecentColors(getRecentColors());
    }
  };

  const handleEyeDropper = async () => {
    if (!('EyeDropper' in window)) return;
    try {
      // @ts-ignore — EyeDropper API
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      selectColor(result.sRGBHex);
    } catch {
      /* user cancelled */
    }
  };

  // Sync external value changes
  if (value !== hex && /^#[0-9a-fA-F]{6}$/.test(value) && document.activeElement !== inputRef.current) {
    setHex(value);
  }

  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            className,
          )}
        >
          <div
            className="h-6 w-6 shrink-0 rounded border border-border"
            style={{ backgroundColor: value }}
          />
          <span
            className="tabular-nums text-foreground"
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
          >
            {value}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[240px] p-3 space-y-3">
        {/* Current color preview + hex input */}
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 shrink-0 rounded-md border border-border"
            style={{ backgroundColor: value }}
          />
          <input
            ref={inputRef}
            value={hex}
            onChange={(e) => handleHexInput(e.target.value)}
            onBlur={() => setHex(value)}
            className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm tabular-nums text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            style={{ fontFamily: 'ui-monospace, monospace' }}
            placeholder="#000000"
            maxLength={7}
          />
          {hasEyeDropper && (
            <button
              type="button"
              onClick={handleEyeDropper}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Pick color from screen"
            >
              <Pipette size={16} />
            </button>
          )}
        </div>

        {/* Preset swatches */}
        <div>
          <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">Presets</div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => selectColor(c)}
                className={cn(
                  'h-6 w-6 rounded border transition-transform hover:scale-110',
                  value.toLowerCase() === c
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border',
                )}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Recent swatches */}
        {recentColors.length > 0 && (
          <div>
            <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">Recent</div>
            <div className="flex flex-wrap gap-1.5">
              {recentColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => selectColor(c)}
                  className={cn(
                    'h-6 w-6 rounded border transition-transform hover:scale-110',
                    value.toLowerCase() === c
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-border',
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
