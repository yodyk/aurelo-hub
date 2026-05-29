
# PHASE 1A — Design Foundations

Pure token-layer migration. No component rewrites, no page rewrites, no behavior changes. After this phase, the entire product visually shifts to Cool Graphite + Cobalt without touching a single component file.

## Objective
Install the Cool Graphite + Cobalt token system as the foundation every downstream phase will inherit. Replace the beige/teal/oklch token values with a calm cool-neutral spine, one decisive cobalt accent, subdued status colors, a harmonized chart palette, and a 5-level type system on Inter + Inter Display. Preserve every existing token *name* so no downstream code breaks.

## User-facing impact
Every page in the product looks new immediately: paper white becomes cool paper, teal becomes cobalt, mustard warnings become amber, charts harmonize, numbers stop dancing in tables (tabular numerals globally). No layout shifts, no missing styles, no broken components. Pure visual lift.

## Components affected
None directly. All components inherit through tokens. Indirect inheritance:
- `src/components/ui/*` (button, input, badge, table, label, etc.) — pick up new colors/elevation through existing token usage.
- `src/components/primitives/composition.tsx` — inherits typography + accents.
- `src/components/ui/badge.tsx` — color-mix recipes resolve to cobalt/amber/etc. automatically.

## Pages affected
All of them, visually. None functionally.

## Dependencies
None. This phase is the dependency for 1B–4.

## Files to modify
1. `src/index.css` — `:root` and `.dark` token blocks, font import, `@theme inline` chart entries, base layer typography.
2. `tailwind.config.ts` — chart color tokens, fontFamily entries for Inter Display.
3. `mem://style/color-palette` — update to reflect Graphite + Cobalt (replaces "Teal primary" line).
4. `mem://style/foundation-tokens` — update accent / status / chart references.
5. `mem://project/constitution` — create (carry-over from prior turn).
6. `mem://index.md` — Core section update + add Constitution reference.

No other files are touched in Phase 1A.

## Design decisions (locked, no alternatives)

### Font stack
- Display: **Inter Display** (500/600/700) — Google Fonts.
- Body: **Inter** (400/500/600/700) — already loaded.
- Mono: system mono fallback only (no JetBrains until a real mono need surfaces).
- Replace the existing `@import` line with a single combined Google Fonts request that adds Inter Display alongside Inter.
- Global `font-feature-settings: "cv11","ss01","ss03","tnum","case"` on body. `font-variant-numeric: tabular-nums` enforced on `.type-display`, `.type-page`, `.type-num`, `td`, `th`, and inputs of `type="number"`.

### Neutral palette — light (replaces beige)
- `--background` `#FBFCFD` — cool paper, faintest blue cast, never sterile pure white.
- `--surface-sunken` `#F4F6F8`
- `--surface-raised` `#FFFFFF`
- `--surface-overlay` `#FFFFFF`
- `--foreground` `#0F1419` — graphite, not black.
- `--foreground-muted` `#5B6470`
- `--foreground-subtle` `#8A93A0`
- `--card` `#FFFFFF`
- `--secondary` `#EEF1F4`
- `--muted` `#EEF1F4`
- `--muted-foreground` `#5B6470`
- `--accent` `#E8ECF1` (neutral hover wash — never blue-tinted).
- `--border` `rgba(15, 23, 35, 0.08)`
- `--border-strong` `rgba(15, 23, 35, 0.14)`
- `--hairline` `rgba(15, 23, 35, 0.06)`
- `--input-background` `#F1F4F7`
- `--sidebar` `#F4F6F8` (sunken layer, sits between bg and card).
- `--sidebar-border` `rgba(15, 23, 35, 0.06)`

### Neutral palette — dark
- `--background` `#0B0E12`
- `--surface-sunken` `#070A0D`
- `--surface-raised` `#161A20`
- `--surface-overlay` `#1A1F26`
- `--foreground` `#E8ECF1`
- `--foreground-muted` `#9AA3AF`
- `--foreground-subtle` `#6B7480`
- `--card` `#14181E`
- `--secondary` `#1E232A`
- `--muted` `#1A1F26`
- `--muted-foreground` `#9AA3AF`
- `--accent` `#1E232A`
- `--border` `rgba(255, 255, 255, 0.07)`
- `--border-strong` `rgba(255, 255, 255, 0.12)`
- `--hairline` `rgba(255, 255, 255, 0.045)`
- `--input-background` `#1A1F26`
- `--sidebar` `#10141A`
- `--sidebar-border` `rgba(255, 255, 255, 0.05)`

### Accent — Aurelo Cobalt
- Light `--primary` `#3B66F0` — restrained, decisive, used sparingly.
- Light `--primary-foreground` `#FFFFFF`
- Light `--primary-soft` `rgba(59, 102, 240, 0.08)`
- Light `--primary-glow` `rgba(59, 102, 240, 0.18)`
- Light `--ring` `rgba(59, 102, 240, 0.45)`
- Dark `--primary` `#6B8FFF` (lifted for AA contrast on dark surfaces).
- Dark `--primary-foreground` `#08101F`
- Dark `--primary-soft` `rgba(107, 143, 255, 0.12)`
- Dark `--primary-glow` `rgba(107, 143, 255, 0.24)`
- Dark `--ring` `rgba(107, 143, 255, 0.50)`

### Status — subdued, never neon
- Light: `--success #1F8A5B`, `--warning #C2860C` (amber, replaces mustard), `--destructive #C8324A`.
- Dark: `--success #5BC992`, `--warning #E6B547`, `--destructive #E07686`.
- Each gets a `*-foreground` tuned for contrast against the soft tint backgrounds the badge already uses (`color-mix(... 10–14% ...)`).

### Chart palette — harmonized to cobalt
1. `#3B66F0` cobalt
2. `#5B9BD5` cool steel blue
3. `#7A6FE0` lavender
4. `#3FA68A` sage
5. `#D38B4A` warm clay (single warm note, contrast anchor)

Dark variants lift L by ~12% on each. Same five `--chart-1..5` slots.

### Elevation — quieter, hairline-led
- `--elev-1` `0 1px 0 rgba(15,23,35,0.04), 0 1px 2px rgba(15,23,35,0.04)`
- `--elev-2` `0 1px 0 rgba(15,23,35,0.04), 0 6px 16px rgba(15,23,35,0.06)`
- `--elev-3` `0 2px 0 rgba(15,23,35,0.05), 0 18px 40px rgba(15,23,35,0.12)` (modals/slide-overs only)
- Dark scales darken alpha to 0.35 / 0.45 / 0.55 respectively.

### Typography — 5-altitude scale (tuned, not rebuilt)
Keep token names; tune values to Inter Display:
- `--type-display`: 40 / 1.05 / weight 640 / tracking −0.035em / `font-family: 'Inter Display'`
- `--type-page`: 26 / 1.15 / weight 620 / tracking −0.028em / Inter Display
- `--type-section`: 16 / 1.3 / weight 600 / tracking −0.012em / Inter
- `--type-body`: 13.5 / 1.45 / weight 460 / tracking −0.005em / Inter
- `--type-meta`: 12 / 1.4 / weight 500 / tracking 0 / Inter
- `--type-eyebrow`: 10.5 / 1.4 / weight 600 / tracking +0.09em UPPER / Inter

Add two numeric utilities (new, no breakage):
- `.type-num` — 13.5px Inter 500 tabular-nums (for cells).
- `.type-num-lg` — 22px Inter Display 600 tabular-nums (for totals/KPI tiles).

Body smoothing line `letter-spacing: -0.015em` on `body` is removed — tracking is now per-altitude.

### Selection + focus
- Selection background: `--primary-glow`.
- Focus ring recipe unchanged (already correct): `0 0 0 2px var(--background), 0 0 0 4px var(--ring)` — inherits new cobalt ring automatically.

## What stays vs changes vs retires

**Stays (no changes):**
- Every token *name* in `:root` / `.dark`.
- `@theme inline` mapping block structure.
- 4px global radius cap and all radius tokens.
- Motion tokens (`--ease-emphasized`, `--ease-standard`, `--dur-*`).
- Spacing scale.
- All component files in `src/components/**`.
- All page files.

**Changes (value-only):**
- All neutral, surface, accent, status, chart, elevation, input, sidebar token *values*.
- Type-scale numeric values (weights, sizes, tracking) for Inter Display.
- Font import (adds Inter Display).
- Body `font-feature-settings` (adds `tnum`, `case`).

**Retires:**
- Beige `#f7f6f3` / `#f0efeb` paper surfaces.
- Teal `#2e7d9a` primary.
- Mustard `#8c7428` warning.
- `--ease-spring` token (removed; motion direction forbids spring overshoot — leaving the token invites misuse). Any in-codebase reference is removed in a later phase, not this one.
- The body-wide `letter-spacing: -0.015em` rule.

## Implementation tasks (engineering-ready)

1. **Update `src/index.css` font import** (line 1):
   - Replace the existing Inter `@import url(...)` with a single Google Fonts request loading Inter (400/500/600/700) **and** Inter Display (500/600/700).

2. **Rewrite `:root` block** (lines ~13–133):
   - Replace every value listed in "Neutral palette — light", "Accent — Aurelo Cobalt" (light row), "Status — light row", "Chart palette" (light values), "Elevation — light values".
   - Update the 5 typography blocks with the values in "Typography — 5-altitude scale".
   - Remove `--ease-spring`.

3. **Rewrite `.dark` block** (lines ~135–196):
   - Same set, dark values.

4. **Update `@theme inline`** (lines ~198–244):
   - No structural changes. Confirm `--color-chart-*` still points to `var(--chart-*)`.
   - Add `--font-display: 'Inter Display', 'Inter', system-ui, sans-serif;` and `--font-sans: 'Inter', system-ui, -apple-system, sans-serif;` so utilities like `font-sans` and a new `font-display` work.

5. **Update `@layer base`** (lines ~246–341):
   - Remove `letter-spacing: -0.015em` from `body`.
   - Extend `font-feature-settings` to `"cv02","cv03","cv04","cv11","ss01","tnum","case"`.
   - Apply `font-family: var(--font-display)` to `h1` and `h2` only; leave `h3`/`h4` on Inter.
   - Keep the focus-visible halo block as-is.

6. **Update `@layer utilities` type scale** (lines ~349–392):
   - Add `font-family: var(--font-display)` to `.type-display` and `.type-page`.
   - Update numeric values per "Typography — 5-altitude scale".
   - Add new `.type-num` and `.type-num-lg` utilities.
   - Leave legacy aliases (`.type-title`, `.type-heading`, `.type-caption`) untouched — they continue to mirror current targets.

7. **Update `tailwind.config.ts`**:
   - `fontFamily`: add `display: ['Inter Display', 'Inter', 'system-ui', 'sans-serif']`. Keep `sans` mapping.
   - No color additions required (everything flows through CSS vars).

8. **Memory writes** (build-mode only):
   - Create `mem://project/constitution` with the approved constitution.
   - Update `mem://style/color-palette` — replace "Teal primary" with "Cobalt #3B66F0 / dark #6B8FFF, cool blue-grey neutrals, amber warning, harmonized 5-color chart palette".
   - Update `mem://style/foundation-tokens` — reference new accent + chart slots, note `--ease-spring` removed.
   - Update `mem://index.md` — adjust Core line about color/accent; add `[Constitution](mem://project/constitution)` link.

## Acceptance criteria

- All five token surfaces (`--background`, `--surface-sunken`, `--surface-raised`, `--surface-overlay`, `--card`) render with the new cool-neutral values in light **and** dark.
- Primary buttons, focus rings, active segmented-control segments, selection highlight, and `HairlineBar` mid-fill all render in cobalt.
- Warning badges (e.g. retainer pacing) render amber, not mustard.
- Recharts components on Insights show the new harmonized 5-color palette.
- All headings, page titles, and `type-display` numbers render in Inter Display (visually confirmed via Network tab font load + computed style spot-check).
- Numeric table cells across Time, Invoices, Clients, Insights show tabular alignment (column widths stable across rows).
- No console errors, no missing CSS variables, no FOUC longer than the existing baseline.
- Zero regressions on layout: every existing page renders without overflow, clipping, or unstyled elements.
- Lighthouse contrast: foreground/background AA passes on both themes.

## Risk + rollback
Single-commit, value-only migration. Rollback = revert `src/index.css` and `tailwind.config.ts`. No data, no schema, no behavior touched.

---

**READY FOR PHASE 1B.**
