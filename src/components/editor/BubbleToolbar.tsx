// ── Selection formatting bubble + link editing ──────────────────────
import { useEffect, useRef, useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Strikethrough, Code, Link2, Link2Off, MoreHorizontal,
  Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Check, X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { transitions } from '@/lib/motion';
import type { EditorFeatureSet } from './variants';
import { normalizeUrl } from './linkUtils';

interface Props {
  editor: Editor;
  features: EditorFeatureSet;
}

function Btn({
  onClick, active, label, children, disabled,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      title={label}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`rich-tool-btn${active ? ' is-active' : ''}`}
    >
      {children}
    </button>
  );
}

export default function BubbleToolbar({ editor, features }: Props) {
  const [more, setMore] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (linkMode) setTimeout(() => inputRef.current?.focus(), 20);
  }, [linkMode]);

  const openLink = () => {
    setLinkValue(editor.getAttributes('link').href || '');
    setMore(false);
    setLinkMode(true);
  };

  const applyLink = () => {
    const href = normalizeUrl(linkValue);
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkMode(false);
  };

  return (
    <BubbleMenu
      editor={editor}
      // Render into <body> so no ancestor overflow / stacking context can clip
      // or paint over the bubble (focus rings, cards, drawers).
      appendTo={() => document.body}
      options={{
        placement: 'top',
        // Push the bubble clear of the writing surface: the offset grows with
        // the distance from the selection to the top of the field, so the bar
        // always floats fully above the editor box instead of half-covering
        // the first line or its focus ring.
        offset: ({ rects }: any) => {
          const shellTop = (editor.view.dom as HTMLElement).getBoundingClientRect().top;
          const gap = rects.reference.y - shellTop;
          return Math.max(10, gap + 12);
        },
        strategy: 'fixed',
        // Vertical behaviour is viewport-based (default boundary); only the
        // horizontal axis is clamped to the editor's own box.
        flip: { padding: 8 },
        shift: { boundary: editor.view.dom as HTMLElement, padding: 4, crossAxis: false },
        size: {
          boundary: editor.view.dom as HTMLElement,
          padding: 4,
          apply({ elements }) {
            const w = (editor.view.dom as HTMLElement).getBoundingClientRect().width;
            Object.assign(elements.floating.style, { maxWidth: `${Math.max(180, w - 8)}px` });
          },
        },
      }}

      shouldShow={({ editor: e, from, to }) => {
        if (!e.isEditable) return false;
        if (e.isActive('codeBlock')) return false;
        return to > from;
      }}
      className="rich-bubble-wrap"
    >
      <motion.div
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitions.micro}
        role="toolbar"
        aria-label="Text formatting"
        className="rich-bubble"
      >
        {linkMode ? (
          <div className="flex items-center gap-1 px-1">
            <input
              ref={inputRef}
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                if (e.key === 'Escape') { e.preventDefault(); setLinkMode(false); editor.commands.focus(); }
              }}
              placeholder="Paste or type a link"
              aria-label="Link address"
              className="rich-link-input"
            />
            <Btn onClick={applyLink} label="Apply link"><Check className="w-3.5 h-3.5" /></Btn>
            {editor.isActive('link') && (
              <Btn
                onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); setLinkMode(false); }}
                label="Remove link"
              >
                <Link2Off className="w-3.5 h-3.5" />
              </Btn>
            )}
            <Btn onClick={() => { setLinkMode(false); editor.commands.focus(); }} label="Cancel">
              <X className="w-3.5 h-3.5" />
            </Btn>
          </div>
        ) : (
          <>
            <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold">
              <Bold className="w-3.5 h-3.5" />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic">
              <Italic className="w-3.5 h-3.5" />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} label="Strikethrough">
              <Strikethrough className="w-3.5 h-3.5" />
            </Btn>
            <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} label="Inline code">
              <Code className="w-3.5 h-3.5" />
            </Btn>
            {features.link && (
              <Btn onClick={openLink} active={editor.isActive('link')} label="Link">
                <Link2 className="w-3.5 h-3.5" />
              </Btn>
            )}
            <span className="rich-bubble-sep" aria-hidden />
            <Btn onClick={() => setMore((m) => !m)} active={more} label="More formatting">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Btn>
            {more && (
              <div className="rich-bubble-more" role="group" aria-label="Block formatting">
                {features.heading && (
                  <>
                    <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} label="Heading">
                      <Heading2 className="w-3.5 h-3.5" />
                    </Btn>
                    <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} label="Subheading">
                      <Heading3 className="w-3.5 h-3.5" />
                    </Btn>
                  </>
                )}
                {features.lists && (
                  <>
                    <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} label="Bulleted list">
                      <List className="w-3.5 h-3.5" />
                    </Btn>
                    <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} label="Numbered list">
                      <ListOrdered className="w-3.5 h-3.5" />
                    </Btn>
                  </>
                )}
                {features.checklist && (
                  <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} label="Checklist">
                    <CheckSquare className="w-3.5 h-3.5" />
                  </Btn>
                )}
                {features.blockquote && (
                  <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} label="Quote">
                    <Quote className="w-3.5 h-3.5" />
                  </Btn>
                )}
              </div>
            )}
          </>
        )}
      </motion.div>
    </BubbleMenu>
  );
}
