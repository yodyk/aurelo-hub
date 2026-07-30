// ── Slash command extension ─────────────────────────────────────────
// Deliberately restrained: seven block commands, nothing more.
import { Extension, type Editor, type Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import {
  Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code, Minus,
  type LucideIcon,
} from 'lucide-react';
import type { EditorFeatureSet } from './variants';

export interface SlashItem {
  id: string;
  title: string;
  hint: string;
  icon: LucideIcon;
  keywords: string[];
  enabled: (f: EditorFeatureSet) => boolean;
  run: (editor: Editor, range: Range) => void;
}

export const SLASH_ITEMS: SlashItem[] = [
  {
    id: 'h2',
    title: 'Heading',
    hint: 'Section title',
    icon: Heading2,
    keywords: ['heading', 'title', 'h2'],
    enabled: (f) => f.heading,
    run: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 2 }).run(),
  },
  {
    id: 'h3',
    title: 'Subheading',
    hint: 'Smaller title',
    icon: Heading3,
    keywords: ['subheading', 'h3', 'small title'],
    enabled: (f) => f.heading,
    run: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 3 }).run(),
  },
  {
    id: 'bullet',
    title: 'Bulleted list',
    hint: 'Unordered points',
    icon: List,
    keywords: ['bullet', 'list', 'ul'],
    enabled: (f) => f.lists,
    run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run(),
  },
  {
    id: 'ordered',
    title: 'Numbered list',
    hint: 'Ordered steps',
    icon: ListOrdered,
    keywords: ['number', 'ordered', 'ol', 'steps'],
    enabled: (f) => f.lists,
    run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run(),
  },
  {
    id: 'checklist',
    title: 'Checklist',
    hint: 'Track items',
    icon: CheckSquare,
    keywords: ['todo', 'task', 'check', 'checkbox'],
    enabled: (f) => f.checklist,
    run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run(),
  },
  {
    id: 'quote',
    title: 'Quote',
    hint: 'Cite or highlight',
    icon: Quote,
    keywords: ['quote', 'blockquote', 'cite'],
    enabled: (f) => f.blockquote,
    run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run(),
  },
  {
    id: 'code',
    title: 'Code block',
    hint: 'Monospaced block',
    icon: Code,
    keywords: ['code', 'snippet', 'pre'],
    enabled: (f) => f.codeBlock,
    run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    title: 'Divider',
    hint: 'Separate sections',
    icon: Minus,
    keywords: ['divider', 'rule', 'hr', 'separator'],
    enabled: (f) => f.horizontalRule,
    run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run(),
  },
];

export interface SlashRenderer {
  onStart: (props: any) => void;
  onUpdate: (props: any) => void;
  onKeyDown: (props: any) => boolean;
  onExit: () => void;
}

export const SlashCommand = Extension.create<{
  features: EditorFeatureSet;
  renderer: () => SlashRenderer;
}>({
  name: 'auroSlashCommand',

  addOptions() {
    return { features: null as any, renderer: null as any };
  },

  addProseMirrorPlugins() {
    const features = this.options.features;
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        // Only at the start of an empty-ish text block, never inside code.
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const parent = $from.parent;
          if (parent.type.name === 'codeBlock') return false;
          if (state.selection.$from.marks().some((m) => m.type.name === 'code')) return false;
          // The "/" must be the first character of the text block.
          const textBefore = parent.textBetween(0, Math.max(0, range.from - $from.start()), '\n', '\n');
          return textBefore.trim().length === 0;
        },
        items: ({ query }) => {
          const q = query.toLowerCase().trim();
          return SLASH_ITEMS.filter((i) => i.enabled(features)).filter((i) =>
            !q
              ? true
              : i.title.toLowerCase().includes(q) || i.keywords.some((k) => k.includes(q)),
          );
        },
        command: ({ editor, range, props }) => {
          (props as SlashItem).run(editor as Editor, range);
        },
        render: this.options.renderer,
      }),
    ];
  },
});
