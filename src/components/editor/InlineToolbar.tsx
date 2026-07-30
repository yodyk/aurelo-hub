// ── Always-visible formatting bar (shown while the editor has focus) ──
// The selection bubble stays for in-flow formatting; this bar exists for
// discoverability so writers never have to guess the editor is rich.
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Strikethrough, Code, Link2,
  Heading2, List, ListOrdered, CheckSquare, Quote,
} from 'lucide-react';
import type { EditorFeatureSet } from './variants';

interface Props {
  editor: Editor;
  features: EditorFeatureSet;
  onLink: () => void;
}

function Btn({
  onClick, active, label, children,
}: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`rich-tool-btn${active ? ' is-active' : ''}`}
    >
      {children}
    </button>
  );
}

export default function InlineToolbar({ editor, features, onLink }: Props) {
  return (
    <div role="toolbar" aria-label="Text formatting" className="rich-inline-bar">
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold">
        <Bold className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic">
        <Italic className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} label="Strikethrough">
        <Strikethrough className="w-3.5 h-3.5" />
      </Btn>
      <span className="rich-bubble-sep" aria-hidden />
      {features.heading && (
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} label="Heading">
          <Heading2 className="w-3.5 h-3.5" />
        </Btn>
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
      <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} label="Inline code">
        <Code className="w-3.5 h-3.5" />
      </Btn>
      {features.link && (
        <Btn onClick={onLink} active={editor.isActive('link')} label="Link">
          <Link2 className="w-3.5 h-3.5" />
        </Btn>
      )}
    </div>
  );
}
