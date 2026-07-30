# Rich Text Editor Overhaul — One Canonical Writing Surface

Today Aurelo has two overlapping editor implementations (`NoteEditor` with a permanent 9-button toolbar, and `RichDescriptionEditor` wrapping it in a grey box), plus plain `<textarea>` session notes in the modals. This plan replaces all of that with a single `RichEditor` primitive and a genuinely quiet writing experience.

## Research takeaways (Refero: Skiff, Notion-class doc editors, Linear, Craft)

- Premium editors show **no persistent toolbar**. Formatting arrives on selection (floating bubble) or on demand (`/` menu).
- The writing column is the only strong visual element — no border, no filled box, no card around the text.
- Markdown shortcuts carry most formatting; the toolbar is a fallback for discoverability, not the primary path.
- Save state is a passive, tiny text label — never a banner.
- On touch, floating bubbles are unreliable under the keyboard; mobile gets a compact bar docked above the keyboard instead.

## Decisions

| Question | Decision |
| --- | --- |
| Fixed toolbar? | No. Removed entirely on desktop. |
| Formatting on selection? | Yes — floating bubble (Tiptap `BubbleMenu`), hairline surface, 6 actions + overflow. |
| Slash menu? | Yes, but lightweight: heading, bullet, numbered, checklist, quote, code, divider. No date/entity refs in this pass. |
| Mobile | Compact docked format bar above keyboard when focused; no bubble menu. |
| Chrome | No border, no filled background. A single hairline appears on the left of the writing column only while focused. |
| Save feedback | Passive `Saving… / Saved / Edited 2m ago` micro-label, right-aligned, fades in and out. |

## What gets built

### 1. `src/components/editor/RichEditor.tsx` — the only editor

```tsx
<RichEditor variant="note" | "task" | "session" value onChange ... />
```

Variant config lives in `editorVariants.ts` and only controls: placeholder set, enabled nodes, min height, autosave behavior, and whether the slash menu is on. No forked rendering logic.

Sub-files:
- `BubbleToolbar.tsx` — selection formatting (bold, italic, strike, code, link, list) + "More" popover for heading/quote/divider.
- `SlashMenu.tsx` — Tiptap suggestion plugin, keyboard-first, arrow/enter/escape, filters as you type.
- `MobileFormatBar.tsx` — docked bar, 44px targets, only mounted below `lg`.
- `SaveIndicator.tsx` — passive status text driven by an `useAutosave` hook (debounced, flush on blur/unmount).

### 2. Editor behavior

- Markdown input rules: `#`/`##`/`###`, `-`, `1.`, `[]`, `>`, `` ``` ``, `---`.
- Extensions added: Link (autolink, paste-over-selection), Underline, Horizontal rule, Code block, Blockquote, Typography (smart quotes/dashes).
- Keyboard: Mod-B/I/U/K/Shift-X, Tab / Shift-Tab list indent, Shift-Enter hard break, Enter exiting empty list items and blockquotes, Backspace at start of an empty heading reverting to paragraph.
- Paste: HTML sanitized to the supported schema; plain-text paste keeps markdown parsing; pasting a URL over a selection creates a link.
- No image upload in this pass (storage/permission surface out of scope) — pasted images are dropped with a quiet toast.

### 3. Typography

New scoped stylesheet replacing the `.note-editor-content` rules in `index.css`:
- 15px / 1.65 body, generous paragraph rhythm (`0.75em` between paragraphs, not margin-collapse guesswork).
- Headings on `--font-display`, tight tracking, clear step-down, top margin larger than bottom.
- Lists with hanging markers so text aligns to the left rail; nested lists indent one rhythm unit.
- Blockquote: hairline left rule, no background tint.
- Inline code and code block: subtle surface at `--elev-1`, 4px radius, monospace 13px.
- Checklists: aligned checkbox, completed items at 55% opacity with strikethrough.
- Links: cobalt, underline offset 2px, hover intensity change only.

### 4. Contextual placeholders

Rotating-per-context (not animated), driven by variant:
- note → "Capture ideas…", "Document client decisions…", "Write meeting notes…"
- task → "Add details, links, or acceptance criteria…"
- session → "Summarize today's work…"
Plus a second-line hint on the empty doc: "Type / for commands" (desktop only, fades on first keypress).

### 5. Focus, selection, motion

- Focus: no ring on the editor box; the left hairline rail fades in at `transitions.micro` and the placeholder dims. Immediate, no scale.
- Selection highlight uses a cobalt tint at low alpha rather than the browser default.
- Bubble menu enters with 120ms opacity + 2px rise (`ease.emphasized`), exits at 120ms. Nothing bounces.
- Respects `prefers-reduced-motion`.

### 6. Migration of call sites

- `ClientNotes.tsx` → `<RichEditor variant="note">`
- `ChecklistPanel.tsx`, `TaskDrawer.tsx` → `<RichEditor variant="task">` (drops the grey `rich-desc-shell` box)
- `Modals.tsx` session-notes textareas (Add Session / Edit Session) → `<RichEditor variant="session">`. Session notes are currently plain text stored in `sessions.notes`; the editor writes HTML, so read paths that render notes as plain strings (TimeLog table, ClientDetail sessions tab, portal) get a shared `renderNoteText()` helper that strips tags for compact/tabular display. No schema change.
- Old `NoteEditor.tsx` and `RichDescriptionEditor.tsx` are deleted.

### 7. Accessibility & performance

- `role="textbox"`, `aria-multiline`, labelled by the surrounding field label; bubble menu is a real toolbar with `aria-label`s and arrow-key roving focus; slash menu is a listbox with `aria-activedescendant`.
- Bubble/slash menus render in portals so no container clipping (matching the Radix pattern already used in the app).
- Editor instance memoized; autosave debounce keeps writes off the keystroke path; `immediatelyRender: false` and no per-keystroke React state above the editor, so long notes don't re-render parents.

## Verification

Build + typecheck, then a Playwright pass on the Notes tab and Task drawer capturing: empty state, selection bubble, slash menu open, long-document typing, and a 390px mobile viewport with the docked bar.

## Out of scope

Image upload, collaborative cursors, comments, `/date` and entity references, and portal-side editing.
