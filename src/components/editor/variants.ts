// ── Editor variants ─────────────────────────────────────────────────
// Variants only tune placeholders, enabled nodes, chrome and persistence.
// They never fork the editor implementation.

export type EditorVariant = 'note' | 'task' | 'session';

export interface EditorFeatureSet {
  heading: boolean;
  lists: boolean;
  checklist: boolean;
  blockquote: boolean;
  codeBlock: boolean;
  horizontalRule: boolean;
  link: boolean;
  slashMenu: boolean;
}

export interface EditorVariantConfig {
  /** Stable placeholder. Never rotates within a session. */
  placeholder: string;
  /** Visual chrome for the writing surface. */
  chrome: 'bare' | 'quiet';
  minHeight: number;
  features: EditorFeatureSet;
}

const full: EditorFeatureSet = {
  heading: true,
  lists: true,
  checklist: true,
  blockquote: true,
  codeBlock: true,
  horizontalRule: true,
  link: true,
  slashMenu: true,
};

export const EDITOR_VARIANTS: Record<EditorVariant, EditorVariantConfig> = {
  note: {
    placeholder: 'Capture ideas, decisions, and next steps…',
    chrome: 'bare',
    minHeight: 96,
    features: { ...full },
  },
  task: {
    placeholder: 'Add details, links, or acceptance criteria…',
    chrome: 'quiet',
    minHeight: 76,
    features: { ...full, horizontalRule: false },
  },
  session: {
    placeholder: 'Summarize the work completed…',
    chrome: 'quiet',
    minHeight: 72,
    features: {
      ...full,
      heading: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      slashMenu: false,
    },
  },
};
