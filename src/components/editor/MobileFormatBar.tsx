// ── Touch formatting bar ────────────────────────────────────────────
// Deliberately NOT keyboard-docked. A viewport-fixed bar has to fight the
// software keyboard, safe-area insets, modal stacking contexts and
// orientation changes on iOS Safari — and loses at least one of those
// fights on every release. Instead this is a compact bar that sticks to
// the top of the editing surface while the editor has focus: stable in
// modals and drawers, never covers content, never jumps.
import type { Editor } from '@tiptap/react';
import { Bold, Italic, List, ListOrdered, CheckSquare, Link2, Strikethrough } from 'lucide-react';
import { motion } from 'motion/react';
import { transitions } from '@/lib/motion';
import type { EditorFeatureSet } from './variants';

interface Props {
  editor: Editor;
  features: EditorFeatureSet;
  onLink: () => void;
}

export default function MobileFormatBar({ editor, features, onLink }: Props) {
  const Btn = ({
    onClick, active, label, children,
  }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode }) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rich-touch-btn${active ? ' is-active' : ''}`}
    >
      {children}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={transitions.micro}
      role="toolbar"
      aria-label="Text formatting"
      className="rich-touch-bar"
    >
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold">
        <Bold className="w-4 h-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic">
        <Italic className="w-4 h-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} label="Strikethrough">
        <Strikethrough className="w-4 h-4" />
      </Btn>
      {features.lists && (
        <>
          <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} label="Bulleted list">
            <List className="w-4 h-4" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} label="Numbered list">
            <ListOrdered className="w-4 h-4" />
          </Btn>
        </>
      )}
      {features.checklist && (
        <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} label="Checklist">
          <CheckSquare className="w-4 h-4" />
        </Btn>
      )}
      {features.link && (
        <Btn onClick={onLink} active={editor.isActive('link')} label="Link">
          <Link2 className="w-4 h-4" />
        </Btn>
      )}
    </motion.div>
  );
}
