
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

# PHASE 1F — Retired-Color Purge (executed)

**Objective:** Eliminate every residual retired hex value from the application surface so the Cool Graphite + Cobalt palette governs at the source. Foundation closeout before App Shell work.

**Mappings applied (verbatim hex → hex, preserves hover/active shading semantics):**
- `#2e7d9a` (retired teal primary) → `#3B66F0` (Cobalt primary)
- `#256a83` / `#256A83` (teal hover, ~90%) → `#3458D9`
- `#1e5f75` / `#1E5F75` (teal active, ~80%) → `#2D4BBE`
- `#fafaf9` / `#fafaf8` / `#f7f6f3` (retired beige bg) → `#FBFCFD` (Cool Graphite background)
- `#8c7428` / `#bfa044` (retired mustard warning) → `#C2860C` (Amber warning)

**Result:** 22 files touched, 0 retired hexes remaining (verified by `rg`). Hover/active state differentiation preserved by mapping each shade independently. No structural / layout / behavior changes. Future phases will progressively migrate these arbitrary classes to semantic Tailwind tokens (`primary`, `warning`, `background`) per component.

**READY FOR PHASE 1G.**

# PHASE 1G — App Shell Hairline Refinement (executed)

**Objective:** Tune the persistent app shell (sidebar, topbar, breadcrumb bar, mobile menu, floating timer) to the constitution's hairline-led, calmer altitude system. Surgical pass on `Root.tsx` only.

**Changes:**
- Sidebar chrome divider: `border-border` → `border-[var(--sidebar-border)]` (sunken-surface-tuned).
- Internal shell rules (logo divider, settings footer, breadcrumb bar, topbar, mobile-menu header, workspace block, mobile bottom section, user-menu popover divider): `border-border` → `border-[var(--hairline)]`.
- Floating timer pill shadow: inline `0 8px 32px rgba(0,0,0,0.10)...` → `var(--elev-3)` (token-driven, theme-aware).

**Intentionally preserved:**
- User-menu popover and floating timer pill keep `border border-border` — they float above content and need a visible edge, not a hairline.
- Sidebar active-state (cobalt rail + `bg-primary/8`), nav typography, theme switcher, timer pill colors — already on-token from Phases 1A–1F.

**Result:** Shell chrome now reads as one continuous calm surface; dividers recede to ~6% opacity (light) / 4.5% (dark) per constitution. No behavior, no layout, no component-API change.

**READY FOR PHASE 1H.**

# PHASE 1H — Auth Surfaces Token Migration (executed)

**Objective:** Move all four auth entry-point pages (Login, Signup, ResetPassword, AcceptInvite) off hardcoded hex values onto semantic tokens so they inherit the Cool Graphite + Cobalt foundation, fix dark-mode readiness, and correct semantic mis-mapping (Login was rendering errors in cobalt).

**Mappings applied (verbatim → semantic):**
- `bg-[#FBFCFD]` → `bg-background`
- `text-[#1c1c1c]` → `text-foreground`
- `text-[#717182]` → `text-muted-foreground`
- `text-[#b0b0b8]` / `placeholder:text-[#b0b0b8]` → `text-[var(--foreground-subtle)]`
- `bg-[#3B66F0]` → `bg-primary`; `bg-[#3B66F0]/10` → `bg-primary/10`
- `text-[#3B66F0]` → `text-primary`
- `hover:bg-[#3458D9]` → `hover:bg-[color-mix(in_oklab,var(--primary)_92%,black)]`
- `active:bg-[#2D4BBE]` → `active:bg-[color-mix(in_oklab,var(--primary)_84%,black)]`
- `hover:text-[#3458D9]` → `hover:text-[color-mix(in_oklab,var(--primary)_92%,black)]`
- Focus rings: `focus:border-[#3B66F0]/40` → `focus:border-primary/55`; `focus:ring-[#3B66F0]/10` → `focus:ring-primary/15`; `focus:ring-[#3B66F0]/20` → `focus:ring-primary/20`
- `accent-[#3B66F0]` → `accent-[hsl(var(--primary))]`
- `border-black/10` / `border-black/[0.06]` / `bg-black/[0.06]` → `[var(--hairline)]`
- `border-black/15` → `border-[var(--border-strong)]`
- `bg-white` → `bg-card`; `hover:bg-[#f5f5f5]` → `hover:bg-[var(--surface-sunken)]`; `active:bg-[#eee]` → `active:bg-[var(--accent)]`

**Semantic correction:**
- Login error block was rendered in cobalt (`bg-[#3B66F0]/6 ... text-[#3B66F0]`) — now correctly uses `bg-destructive/[0.08] border-destructive/20 text-destructive`, matching Signup and ResetPassword.
- Signup / ResetPassword error blocks migrated from rust-red hex (`#c27272`) to `destructive` tokens.

**Intentionally preserved:**
- Apple OAuth button (`bg-[#1c1c1c]`, `hover:bg-[#333]`, `active:bg-[#111]`) — Apple brand asset, must remain solid black across themes.
- Waitlist pill on Signup — inline cobalt gradient `linear-gradient(135deg, #2D4BBE, #3B66F0)`, on-palette.
- Google OAuth SVG glyph colors (Google brand).

**Result:** 4 files migrated, 0 retired hex values remain (verified by `rg`). Auth pages now respond to dark theme (where applicable) and inherit any future token adjustments without further edits. Error semantics consistent across all auth surfaces.

**READY FOR PHASE 1I.**

# PHASE 1I — Onboarding Surface Token Migration (executed)

**Objective:** Complete the auth-funnel migration by moving the Onboarding shell (`src/pages/Onboarding.tsx`) and the in-funnel `OnboardingPlanPicker` component off hardcoded hex + stone-palette Tailwind classes onto semantic tokens. Same calibration as Phase 1H, extended to the stone-* neutrals and inline shadow recipes.

**Mappings applied (verbatim → semantic):**
- Page bg: `bg-[#FBFCFD]` → `bg-background`
- Text: `text-[#1c1c1c]`/`text-[#44403c]` → `text-foreground`; `text-[#78716c]` → `text-muted-foreground`; `text-[#a8a29e]` → `text-[var(--foreground-subtle)]`
- Stone palette: `bg-stone-50` → `bg-[var(--surface-sunken)]`; `bg-stone-100` → `bg-[var(--accent)]`; `bg-stone-200` → `bg-[var(--border-strong)]`; `stone-400/500` → subtle/muted; `border-stone-200/60` → `border-[var(--hairline)]`
- Primary tints/borders/rings: all `[#3B66F0]/n` → `primary/n` (with `/8` → `/[0.08]`, `/40` → `/55`, `/30` → `/40`, `/50` → `/60`, `/15` → `/20`)
- Solid primary + hover/active mapped through `color-mix(in_oklab,var(--primary)_92%,black)` recipe consistent with Phase 1H
- Hairlines: `border-black/[0.04|0.06|0.08]` → `[var(--hairline)]`; `border-black/[0.12]` → `[var(--border-strong)]`; `bg-black/[0.06]` → `bg-[var(--hairline)]`
- Surfaces: `bg-white` → `bg-card`
- Inline shadows: `rgba(94,161,191,0.08)` (retired teal) and `rgba(0,0,0,0.03)` recipes → `var(--elev-1)`; `rgba(94,161,191,0.1)` → `var(--elev-2)`

**Component-specific (`OnboardingPlanPicker`):**
- `ACCENT` map now reads CSS variables instead of frozen hex: `starter → var(--foreground-muted)`, `pro → var(--primary)`, `studio → var(--warning)`. Inline `style={{ color, backgroundColor }}` on Check icons and plan CTA buttons now follow the live token, including dark-mode shift.
- `dangerouslySetInnerHTML` regex highlight changed from frozen `color:#1c1c1c` to `color:var(--foreground)`.

**Bonus fix (memory-aligned):**
- Removed `mode="wait"` from the `<AnimatePresence>` wrapping onboarding step transitions. Core memory: "Do NOT use `mode='wait'` on `AnimatePresence` (causes React.lazy deadlock)." Step-to-step transitions remain visually smooth because each motion child uses opacity + y enter/exit on its own keyed wrapper.

**Result:** 2 files migrated, 0 retired hexes or stone-* utilities remaining in onboarding scope (verified by `rg`). Onboarding now inherits the Cool Graphite + Cobalt foundation and is dark-mode-ready alongside the rest of the auth funnel. The plan-picker accent map auto-tracks token edits.

**READY FOR PHASE 1J.**

# PHASE 1J — Core Internal Surfaces Token Sweep (executed)

**Objective:** Migrate the seven highest-traffic internal pages (Settings, Invoicing, ClientDetail, ClientEdit, ProjectDetail, Projects, Insights) off hardcoded hex / rgba / stone-* utilities onto semantic tokens (`primary`, `destructive`, `warning`, `chart-2`, `accent`, `muted-foreground`, `--foreground-subtle`, `--surface-sunken`). Single regex pass via `/tmp/phase1j.mjs`.

**Mappings applied:**
- **Destructive** `#c27272` + `rgba(194,114,114,…)` + darker hover `#b05656` → `destructive` token across `bg-`, `text-`, `border-`, `ring-`, `hover:` variants. Inline string literals (`RED = "#c27272"`, `'#c27272'`, `'#b05656'`) → `'var(--destructive)'`. Hover-darker recipe: `color-mix(in_oklab,var(--destructive)_88%,black)`.
- **Warning** `#C2860C` → `warning` token. Inline `GOLD = "#C2860C"` → `'var(--warning)'`.
- **Primary** `#3B66F0` → `primary` token across all utility variants (incl. `/8` → `/[0.08]`, `/6` → `/[0.06]`, `border-/12` → `border-primary/15`). Inline `BLUE = "#3B66F0"` → `'var(--primary)'`. Gradients `linear-gradient(…, #3B66F0, #5bb8d4)` → `linear-gradient(…, var(--primary), var(--chart-2))`.
- **Retired cyan accent** `#5bb8d4` (paired with cobalt in retainer/profit gradients) → `var(--chart-2)` (cool steel blue, on-palette).
- **Sky** `#38bdf8` (Insights `CHART_BLUE`) → `var(--chart-2)`.
- **Stone palette:** `bg-stone-100[ dark:bg-stone-800]` → `bg-accent`; `text-stone-600 dark:text-stone-400` / `text-stone-500 dark:text-stone-400` → `text-muted-foreground`; `text-stone-400` / `bg-stone-400` → `[var(--foreground-subtle)]`; `bg-stone-800` → `bg-[var(--surface-sunken)]`.
- **Stone hex** `text-[#a8a29e]` / `text-[#78716c]` / `text-[#9a9aac]` → `--foreground-subtle` / `muted-foreground`.

**Intentionally preserved:**
- `Settings.tsx:944` `brandColor: '#3B66F0'` and `Settings.tsx:1249` `ws.brandColor || "#3B66F0"` — workspace brand color is a **user-customizable data value** persisted to the database; the literal `#3B66F0` is the seed default, not a styling token.
- Integration partner brand hexes (`#4285F4` Google, `#4A154B` Slack, `#A259FF` Figma, `#0061FF` Dropbox, `#FFD02F`, `#10b981`, `#0ea5e9`) — third-party brand colors required for visual recognition.
- Switch knob `bg-white` instances — intentionally white-in-all-themes for "on" indicator contrast.

**Result:** 7 files migrated, ~145 hardcoded color references removed in one pass. Zero retired hex/stone references remain outside the brandColor data defaults (verified by `rg`). Profit gradients, retainer pacing fills, destructive Danger Zone blocks, warning amber alerts, and Insights chart blues all now follow the Cool Graphite + Cobalt foundation and respect dark mode automatically.

**READY FOR PHASE 1K.**
