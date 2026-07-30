# Plan: Replace Display Font (Inter Tight → New Google Font)

## Goal
Swap the display font used across Aurelo from `Inter Tight` to a different Google Font, while keeping `Inter` as the body font. The change should be centralized so it propagates everywhere `font-display` or `var(--font-display)` is used.

## Current State
- Body font: `Inter` (loaded from Google Fonts in `src/index.css`).
- Display font: `Inter Tight` (loaded from the same Google Fonts URL, declared as CSS variable `--font-display`, mapped in `tailwind.config.ts` as `fontFamily.display`).
- Usage is widespread (~70+ references) via the `font-display` Tailwind class or `var(--font-display)` in CSS. No hardcoded `Inter Tight` strings exist in React components outside of the font-stack definitions.

## Process

1. **Choose the replacement font**
   - Replacement: **TASA Orbiter** (Google Fonts).
   - Weights needed: 500, 600, 700 (matches current `Inter Tight` usage).
   - Note: Google Fonts serves TASA Orbiter as static weight instances. We will request 500, 600, 700 to keep the same request size and avoid loading unused weights.


2. **Update the Google Fonts import**
   - File: `src/index.css` (line 1).
   - Replace the `family=Inter+Tight:wght@500;600;700` portion of the URL with the new font family and weights.
   - Keep `Inter` (body) in the same URL to maintain a single request.

3. **Update CSS custom property**
   - File: `src/index.css` (~line 18).
   - Change `--font-display: 'Inter Tight', ...` to `--font-display: '<New Font>', 'Inter', system-ui, sans-serif`.
   - Keep `Inter` as the fallback so the UI remains acceptable during slow loading.

4. **Update Tailwind config**
   - File: `tailwind.config.ts` (~line 18).
   - Change `display: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif']` to `display: ['<New Font>', 'Inter', 'system-ui', 'sans-serif']`.

5. **Update descriptive comments**
   - File: `src/index.css` (~lines 16 and 108).
   - Change comments referencing "Inter Tight" to the new font name.

6. **Tune typography altitude tokens (optional)**
   - File: `src/index.css` (type altitude section, ~lines 108-140).
   - If the new font has different metrics (x-height, spacing, weight), adjust `--type-display-*`, `--type-page-*`, etc., and tracking values to preserve visual hierarchy.

7. **Audit the portal theme**
   - File: `src/index.css` (dark/portal section if any overrides exist).
   - Ensure no portal-specific `--font-display` override still references the old font.

8. **Verify build + preview**
   - Run `bun run build` to confirm no broken CSS/Tailwind references.
   - Spot-check pages that use display type heavily: `Home`, `ClientDetail`, `ProjectDetail`, `ClientPortal`, `Insights`, and auth screens.
   - Check for FOUT/FOUC and ensure weights render correctly.

## Files to Change
- `src/index.css` (Google Fonts URL, `--font-display`, comments, optional altitude tokens)
- `tailwind.config.ts` (`fontFamily.display`)

## Files to Review (no edits expected, but confirm visually)
- `src/pages/Home.tsx`
- `src/pages/ClientDetail.tsx`
- `src/pages/ProjectDetail.tsx`
- `src/pages/ClientPortal.tsx`
- `src/pages/Insights.tsx`
- `src/pages/Login.tsx` / `src/pages/Signup.tsx`

## Open Decision
- **Resolved**: Replacement font is **TASA Orbiter** from Google Fonts.
- **Pending approval**: Switch from plan mode to build mode so the changes can be applied to `src/index.css` and `tailwind.config.ts`.

## Risks & Notes
- Changing the display font affects brand identity. Best to preview on the heaviest type pages first.
- TASA Orbiter is served by Google Fonts as static 500/600/700 instances; we will request only those weights.
- `Inter` remains the body/fallback font, so any text rendering before the webfont loads still looks acceptable.
- If visual metrics look off after preview, we may tune the `--type-display-*` / `--type-page-*` altitude tokens in a follow-up pass.
