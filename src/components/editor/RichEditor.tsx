// ── RichEditor ──────────────────────────────────────────────────────
// The single canonical rich text primitive for Aurelo.
// Notes, task descriptions and session notes all render this component;
// only the `variant` differs. There are no other editor implementations.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, ReactRenderer, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import BubbleToolbar from './BubbleToolbar';
import InlineToolbar from './InlineToolbar';
import MobileFormatBar from './MobileFormatBar';
import { SlashMenu, type SlashMenuHandle } from './SlashMenu';
import { SlashCommand } from './slashCommand';
import { EDITOR_VARIANTS, type EditorVariant } from './variants';
import { normalizeUrl } from './linkUtils';
import { useInputCapability } from '@/lib/useInputCapability';
import {
  isEditorContentEmpty,
  normalizeEditorContent,
  toStorableEditorContent,
} from '@/lib/editorContent';

export interface RichEditorProps {
  value: string | null | undefined;
  onChange?: (html: string | null) => void;
  /** Fired on blur — the natural commit point for form-bound surfaces. */
  onBlur?: (html: string | null) => void;
  variant?: EditorVariant;
  /** Overrides the variant's stable placeholder. */
  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
  ariaLabel?: string;
  /** Identity of the edited record; remounts content when it changes. */
  recordId?: string;
}

export default function RichEditor({
  value,
  onChange,
  onBlur,
  variant = 'note',
  placeholder,
  editable = true,
  autoFocus = false,
  minHeight,
  maxHeight,
  className = '',
  ariaLabel,
  recordId,
}: RichEditorProps) {
  const config = EDITOR_VARIANTS[variant];
  const { touchEditing } = useInputCapability();
  const [focused, setFocused] = useState(false);
  const emitRef = useRef(onChange);
  emitRef.current = onChange;

  const initial = useMemo(() => normalizeEditorContent(value), [recordId, variant]); // eslint-disable-line react-hooks/exhaustive-deps

  const slashRenderer = useCallback(() => {
    let component: ReactRenderer<SlashMenuHandle> | null = null;
    let el: HTMLDivElement | null = null;

    const place = (rect: (() => DOMRect | null) | null | undefined) => {
      if (!el || !rect) return;
      const r = rect();
      if (!r) return;
      const menuH = el.offsetHeight || 240;
      const below = window.innerHeight - r.bottom;
      const top = below < menuH + 16 ? r.top - menuH - 6 : r.bottom + 6;
      el.style.top = `${Math.max(8, top)}px`;
      el.style.left = `${Math.min(r.left, window.innerWidth - 268)}px`;
    };

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(SlashMenu, {
          props: { ...props, listId: 'rich-slash' },
          editor: props.editor,
        });
        el = document.createElement('div');
        el.className = 'rich-slash-layer';
        el.appendChild(component.element);
        document.body.appendChild(el);
        place(props.clientRect);
      },
      onUpdate: (props: any) => {
        component?.updateProps({ ...props, listId: 'rich-slash' });
        place(props.clientRect);
      },
      onKeyDown: (props: any) => {
        if (props.event.key === 'Escape') return true;
        return component?.ref?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        component?.destroy();
        el?.remove();
        component = null;
        el = null;
      },
    };
  }, []);

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        heading: config.features.heading ? { levels: [2, 3] } : false,
        bulletList: config.features.lists ? {} : false,
        orderedList: config.features.lists ? {} : false,
        blockquote: config.features.blockquote ? {} : false,
        codeBlock: config.features.codeBlock ? {} : false,
        horizontalRule: config.features.horizontalRule ? {} : false,
        link: config.features.link
          ? {
              openOnClick: false,
              autolink: true,
              defaultProtocol: 'https',
              protocols: ['http', 'https', 'mailto', 'tel'],
              HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
              validate: (href: string) => !!normalizeUrl(href),
            }
          : false,
      }),
      ...(config.features.checklist
        ? [TaskList, TaskItem.configure({ nested: true })]
        : []),
      Placeholder.configure({
        placeholder: placeholder ?? config.placeholder,
        showOnlyWhenEditable: true,
      }),
      ...(config.features.slashMenu && !touchEditing
        ? [SlashCommand.configure({ features: config.features, renderer: slashRenderer })]
        : []),
    ],
    content: initial,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'rich-editor-surface',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      emitRef.current?.(isEditorContentEmpty(html) ? null : toStorableEditorContent(html));
    },
  }, [recordId, variant, editable, touchEditing]);

  // Keep external value changes in sync without clobbering active typing.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const next = normalizeEditorContent(value);
    if (next !== editor.getHTML() && !(isEditorContentEmpty(next) && editor.isEmpty)) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  // The selection bubble replaces the inline bar so the two can never collide.
  const [hasSelection, setHasSelection] = useState(false);
  useEffect(() => {
    if (!editor) return;
    const sync = () => setHasSelection(!editor.state.selection.empty);
    editor.on('selectionUpdate', sync);
    editor.on('blur', sync);
    sync();
    return () => {
      editor.off('selectionUpdate', sync);
      editor.off('blur', sync);
    };
  }, [editor]);

  const [linkSeed, setLinkSeed] = useState(0);
  const handleTouchLink = () => {
    if (!editor) return;
    const current = editor.getAttributes('link').href || '';
    const input = window.prompt('Link address', current);
    if (input === null) return;
    const href = normalizeUrl(input);
    if (!href) editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    setLinkSeed((s) => s + 1);
  };

  if (!editor) {
    return (
      <div
        className={`rich-editor-shell is-${config.chrome} ${className}`}
        style={{ minHeight: minHeight ?? config.minHeight }}
        aria-busy="true"
      />
    );
  }

  return (
    <div
      className={`rich-editor-shell is-${config.chrome}${focused ? ' is-focused' : ''} ${className}`}
      data-variant={variant}
    >
      {editable && touchEditing && focused && (
        <MobileFormatBar
          key={linkSeed}
          editor={editor}
          features={config.features}
          onLink={handleTouchLink}
        />
      )}
      {editable && !touchEditing && (
        <>
          {/* Only one bar at a time: the bubble owns selections, the inline bar owns the caret. */}
          <InlineToolbar
            editor={editor}
            features={config.features}
            onLink={handleTouchLink}
            hidden={hasSelection}
          />
          <BubbleToolbar editor={editor} features={config.features} />
        </>
      )}

      <EditorContent
        editor={editor}
        className="rich-editor-content"
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          const html = editor.getHTML();
          onBlur?.(isEditorContentEmpty(html) ? null : toStorableEditorContent(html));
        }}
        style={{
          minHeight: minHeight ?? config.minHeight,
          maxHeight,
          overflowY: maxHeight ? 'auto' : undefined,
        }}
      />
    </div>
  );
}
