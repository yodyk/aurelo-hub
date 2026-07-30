// ── Slash menu surface ──────────────────────────────────────────────
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { motion } from 'motion/react';
import { transitions } from '@/lib/motion';
import type { SlashItem } from './slashCommand';

export interface SlashMenuHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface Props {
  items: SlashItem[];
  command: (item: SlashItem) => void;
  listId: string;
}

export const SlashMenu = forwardRef<SlashMenuHandle, Props>(({ items, command, listId }, ref) => {
  const [active, setActive] = useState(0);

  useEffect(() => setActive(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowDown') {
        setActive((i) => (i + 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === 'ArrowUp') {
        setActive((i) => (i - 1 + items.length) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const item = items[active];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }), [items, active, command]);

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.micro}
      role="listbox"
      id={listId}
      aria-label="Insert block"
      aria-activedescendant={items[active] ? `${listId}-${items[active].id}` : undefined}
      className="rich-slash-menu"
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        const isActive = i === active;
        return (
          <button
            key={item.id}
            id={`${listId}-${item.id}`}
            role="option"
            aria-selected={isActive}
            type="button"
            onMouseEnter={() => setActive(i)}
            onMouseDown={(e) => { e.preventDefault(); command(item); }}
            className={`rich-slash-item${isActive ? ' is-active' : ''}`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="rich-slash-title">{item.title}</span>
            <span className="rich-slash-hint">{item.hint}</span>
          </button>
        );
      })}
    </motion.div>
  );
});

SlashMenu.displayName = 'SlashMenu';
