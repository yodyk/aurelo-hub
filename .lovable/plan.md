# Plan: Preview DM Sans as Body Font

## Goal
Temporarily swap the body font from **Inter** to **DM Sans** while keeping **TASA Orbiter** as the display font. This is a preview/test change; the user wants to be able to revert easily if it doesn't look right.

## Current State
- Display font: `TASA Orbiter` (just applied in the previous change).
- Body font: `Inter` (Google Fonts variable axis, CSS variable `--font-sans`, Tailwind `font-sans`).
- Fallbacks: `system-ui` and generic sans-serif are already in place.

## Process

1. **Update Google Fonts import**
   - File: `src/index.css` (line 1).
   - Keep `TASA Orbiter` (display) and add `DM Sans` as a variable font (or static 400/500/600/700).
   - Remove the current `Inter` variable family from the import to keep payload reasonable.

2. **Update CSS custom property for body font**
   - File: `src/index.css` (~line 17).
   - Change `--font-sans: 'Inter', ...` to `--font-sans: 'DM Sans', 'Inter', system-ui, sans-serif;`.
   - Keep `Inter` as a fallback so text remains readable during slow loading.

3. **Update Tailwind body font**
   - File: `tailwind.config.ts` (~line 17).
   - Change `sans: ['Inter', 'system-ui', 'sans-serif']` to `sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif']`.

4. **Update descriptive comments**
   - File: `src/index.css` (~line 16).
   - Change "Inter (body)" reference to "DM Sans (body)".

5. **Verify build + preview**
   - Run `bun run build` to confirm no broken CSS/Tailwind references.
   - Spot-check pages that mix body and display type: `Home`, `ClientDetail`, `Insights`, `Settings`, `Login`.
   - Check that TASA Orbiter headings still render correctly against DM Sans body copy.

## Files to Change
- `src/index.css` (Google Fonts URL, `--font-sans`, comment)
- `tailwind.config.ts` (`fontFamily.sans`)

## Files to Review (no edits expected, but confirm visually)
- `src/pages/Home.tsx`
- `src/pages/ClientDetail.tsx`
- `src/pages/Insights.tsx`
- `src/pages/Settings.tsx`
- `src/pages/Login.tsx`

## Revert Strategy
Because this is a purely presentational change touching only two configuration files, the easiest way to revert is:

- **Option A: Chat revert** — Click the revert button below the AI message that implements this change. It will restore the project to the state immediately before the change.
- **Option B: History tab** — Open the History tab and select the version before the DM Sans swap.

If you want to compare side-by-side, I can also take screenshots of the same page before and after the swap so you can decide which to keep.

## Risks & Notes
- DM Sans is a variable font, so we can load a single `wght@400..700` range instead of multiple static files.
- Keeping `Inter` as a fallback means no visual breakage if the webfont fails, but it will briefly show Inter during loading.
- TASA Orbiter remains untouched as the display font.
- If the visual rhythm feels off, we may need to tune line-height/letter-spacing tokens in a follow-up pass; this plan skips that to keep the preview lightweight.
