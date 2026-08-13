# Align Tasks page with full-width page structure

## Current state
`src/pages/Tasks.tsx` wraps its two-pane workspace in a constrained container:

```jsx
<motion.div className="px-4 lg:px-0 py-6 lg:py-0 max-w-[1400px] mx-auto lg:h-[calc(100vh-var(--app-header-h,56px))] lg:flex lg:flex-col min-h-0">
```

The `max-w-[1400px] mx-auto` and `lg:px-0` prevent the Tasks page from filling the main content area the way `Home.tsx` and `Clients.tsx` do. The selected element in `Root.tsx` (the `<div>` wrapping `<header>` + `<main>`) uses `flex-1 min-w-0 overflow-x-hidden` to fill the full width, and the child pages follow that with `w-full min-w-0` plus `PageHeader` + `px-4 lg:px-6` content gutters.

## Goal
Make the Tasks page use the same full-width fill structure as the other pages while preserving its two-pane workspace behavior.

## Changes

### 1. `src/pages/Tasks.tsx` — outer container
- Replace the constrained `motion.div` wrapper with `w-full min-w-0` (matching `Clients.tsx`/`Home.tsx`).
- Remove `max-w-[1400px] mx-auto` and the asymmetric `px-4 lg:px-0 py-6 lg:py-0`.
- Keep the page able to fill viewport height for the sidebar + list split.

### 2. `src/pages/Tasks.tsx` — page header
- Replace the inline header block with the shared `PageHeader` primitive from `@/components/primitives/composition`.
- This gives the same `px-4 lg:px-6 pt-6 pb-5 border-b border-border` masthead as every other page.
- Preserve the title "Tasks", the "{totalOpen} open" meta, and the subtitle.

### 3. `src/pages/Tasks.tsx` — two-pane layout below header
- Wrap `TaskNavigation` + `TaskListView` in a flex row that fills the remaining viewport height.
- Use consistent horizontal gutters so the sidebar left edge aligns with the page header text.
- Keep the existing `mode="global"` behavior, archived toggle, and modal wiring unchanged.

### 4. `src/components/tasks/TaskNavigation.tsx` — global gutter
- Revisit the `pl-8` global-mode padding. With the page now full-width, the sidebar may need to align with the `PageHeader` gutter (`px-4 lg:px-6`). Adjust only the global-mode left padding so the rail starts at the same x-position as the header text; do not change `client` mode.

### 5. Verify
- Build passes.
- Tasks page renders full-width on desktop and still scrolls correctly in both panes.
- No regression in archived-client toggle, list creation, or task modal.
