# Aurelo — Mobile Operating System Audit

Scope: every authenticated surface, judged against Linear / Things 3 / Superhuman / Monarch mobile.
Constraint: desktop is the reference implementation. Every recommendation is tagged **Mobile-Only**, **Shared**, or **Reject** with explicit Desktop / Mobile impact.

---

## Part A — Executive Summary

Aurelo's desktop has clearly absorbed the IA, composition, visual, task, and timer overhauls. Mobile has not. The product currently *resizes* gracefully but doesn't *behave* like a mobile-native tool. Three structural problems dominate everything else:

1. **The shell is a desktop shell that hides things below `lg:`.** There is no thumb-reach model, no bottom nav, no sticky primary action, and the only navigation entry point is a top-right hamburger that hides behind the notification popover.
2. **Editorial headers (PageHeader, ClientDetail header) were sized for 1440px columns.** On 390px they consume 30–45% of the viewport before any content renders. Hierarchy inverts: chrome > content.
3. **Tables are the primary data surface and they horizontally clip.** Clients, TimeLog, Invoicing, and Insights all use fixed grid-template-columns that exceed mobile width. Users either scroll horizontally (broken on iOS momentum) or lose columns entirely.

Fixing 1–3 unlocks ~70% of the perceived quality gain. The remainder is craft: drawer widths, touch targets, action group reflow, and a small set of mobile-only affordances (bottom action bar, sticky filter, swipe-to-complete on tasks).

**Verdict:** A freelancer cannot currently run their business comfortably from Aurelo on a phone. They can read it. They cannot operate it. With the Critical list below shipped, that flips.

---

## Part B — Critical Mobile Issues (must fix before launch)

### B1. Notification popover renders ~5px wide
**Root cause:** `NotificationCenter.tsx` line 158 sets `left-2 right-2 w-auto` but the popover is inside the header's right-aligned flex cluster, and the absolute parent collapses to the trigger's width. The `left-2 right-2` resolves against the trigger, not the viewport.
**Fix (Mobile-Only):** Portal the panel to `document.body` on `< lg`, or anchor with `position: fixed; left: 8px; right: 8px; top: 56px` when `window.innerWidth < 1024`. Keep current desktop popover untouched.
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P0 · Effort: S

### B2. Mobile menu exit animation glitches
**Root cause:** `exit={{ opacity: 0, y: '-100%' }}` combined with `drag="y"` and `transition={{ duration: 0.2 }}` — the drag transform fights the exit transform, and the linear ease produces the snap.
**Fix (Mobile-Only):** Separate drag dismiss from exit. On dismiss, animate `y` to `-100%` with the project's `[0.32, 0.72, 0, 1]` ease over 280ms, then unmount. Remove `touch-none` on the outer container (it blocks scroll inside the menu when nav grows).
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P0 · Effort: S

### B3. No persistent mobile navigation
Today, every navigation requires: tap hamburger → wait for full-screen modal → tap link → modal exits. That's ~600ms per nav, vs. Linear's instant tab bar.
**Fix (Mobile-Only):** Add a 5-slot bottom tab bar on `< lg`: Today · Tasks · Clients · Time · More. Hide the top hamburger. The "More" sheet contains Projects, Invoices, Insights, Settings.
Desktop Impact: Neutral (hidden by `lg:hidden`) · Mobile Impact: Positive · Severity: P0 · Effort: M

### B4. Timer control disappears on small screens
`<span className="hidden md:inline">Start timer</span>` leaves just an icon button next to the notification bell — easy to miss, and the running-timer pill (`px-3 py-1.5` with mm:ss + stop) crowds the bell at 360px.
**Fix (Shared):** Move the running-timer pill into a thin sticky "Now Strip" at the top of the viewport on mobile (already exists on Today — promote it shell-wide when a timer is running). Keep the header bell + a single icon-only timer toggle.
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P0 · Effort: M

### B5. Client list collapses to unreadable rows
`Clients.tsx` uses `grid-cols-[1fr_90px_100px_110px_80px_140px]` (~610px minimum) inside a `min-w-0` container. On 390px the grid either overflows hidden or text truncates aggressively. Status, Type, Team, Rate, Revenue all compete in the remaining ~140px.
**Fix (Mobile-Only):** Below `md`, swap the grid for a stacked row: avatar + name + status dot on row 1; small meta line "Hourly · 3 sessions · $1,240" on row 2; right-aligned chevron. Keep the desktop grid exactly as-is.
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P0 · Effort: M

### B6. ClientDetail header is oversized
H1 client name uses display-scale typography; logo + name + status pills + 4–5 action buttons all sit on a single header row that wraps into 4–5 lines on mobile, often pushing the first content section below the fold.
**Fix (Mobile-Only):** On `< md`: shrink avatar to 32px, drop client name to `text-[20px]`, move action buttons (Add Session, Add Note, Settings, Edit) into a horizontal scrollable chip rail directly under the name, and collapse status/model into a single meta line.
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P0 · Effort: M

### B7. Settings drawer / page is unusable on mobile
4564-line Settings page renders the tab sidebar and panel side-by-side. On mobile the sidebar wraps and the panel becomes ~50% width.
**Fix (Mobile-Only):** Two-pane → single-pane stack. List of sections becomes a full-width menu; selecting one pushes a sub-page with a back chevron. Save bar becomes sticky bottom on mobile (not bottom-of-form).
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P0 · Effort: M

### B8. Tables horizontally clip without scroll affordance
TimeLog, Invoicing, and the Clients table all rely on `overflow-x-auto` parents but the inner grids don't trigger scroll because they shrink. Numbers wrap. Action menus get clipped.
**Fix (Mobile-Only):** For TimeLog and Invoicing, replace the grid with a stacked row pattern on `< md` (date · client · duration · amount stacked; tap opens existing detail drawer). Clients handled in B5.
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P0 · Effort: M

---

## Part C — Important Mobile Issues

### C1. Net / Gross toggle placement (Insights)
Currently in the page header, visually disconnected from the KPI cards it controls. Users hit it, see no change, and assume it's broken.
**Fix (Shared):** Co-locate the toggle inside the "Revenue" KPI card cluster, sticky to the top of that section. Improves comprehension on both surfaces.
Desktop Impact: Positive · Mobile Impact: Positive · Severity: P1 · Effort: S

### C2. Retainer "Send Update" full-width but left-aligned text
On mobile the button stretches but the icon+label cluster sits at the left edge.
**Fix (Shared):** `justify-center` on the button content. Already correct on the design-system Button — this is a one-off override in retainer panel. Remove the override.
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P1 · Effort: XS

### C3. Email Activity tabs stack poorly
Multiple horizontal tabs wrap onto 2–3 rows.
**Fix (Mobile-Only):** Convert to horizontal scroll tab rail with snap (`overflow-x-auto snap-x` + `flex-nowrap`). Pattern reusable for Project tabs, Settings tabs, Insights filters.
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P1 · Effort: S, then reuse

### C4. Invoicing filter row breaks composition
Search input, status segmented control, and date range each wrap independently.
**Fix (Mobile-Only):** Below `md`, collapse filters into a single "Filters" button that opens a bottom sheet with all controls. Search bar stays full-width above the list.
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P1 · Effort: M

### C5. Quick Add task on mobile has no keyboard affordance
The Quick Add bar is desktop-keyboard-first ("type → Enter"). On mobile, virtual keyboard covers the bar after focus, the parser hints aren't visible, and there's no submit button.
**Fix (Mobile-Only):** Quick Add opens as a bottom sheet with the input pinned just above the keyboard, parsed chips inline above the input, and a circular submit button at the right edge.
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P1 · Effort: M

### C6. Touch targets below 44pt
Status dots in Clients (8px), checkbox cells in TimeLog bulk (16px), the timer stop button (20px), small chevrons in collapsibles, theme toggle, table row chevrons.
**Fix (Shared):** Audit pass — wrap any sub-44pt interactive in a 44pt hit area using `before:` pseudo-elements so visuals stay small. Desktop sees no visual change.
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P1 · Effort: M

### C7. Today page hierarchy on mobile
Week Pulse + bar chart consume the first screen; Tasks (the operating action) is below the fold. Inverts the page's stated purpose.
**Fix (Mobile-Only):** On `< md`, reorder: NowStrip → Tasks module → Active Projects → Week Pulse → Needs Attention. Desktop layout preserved.
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P1 · Effort: S

### C8. Drawer widths
TaskDrawer, ClientNotes drawer, and Settings sub-drawers use fixed `w-[480px]` or `max-w-md`. On 390px screens that's ~98% width with no breathing room and the close affordance is hit-or-miss near the system status bar.
**Fix (Shared):** Use `w-full sm:max-w-[480px]` and add `pt-[max(12px,env(safe-area-inset-top))]` to the drawer header. Also add a top drag handle on mobile.
Desktop Impact: Neutral · Mobile Impact: Positive · Severity: P1 · Effort: S

---

## Part D — Per-Screen Audit

### D1. App Shell
- Hamburger placed in the *right* cluster next to the bell — non-standard; thumb-reach OK but discoverability poor. Move to left, or replace entirely with bottom nav (B3).
- No safe-area-inset handling — content slides under iOS home indicator on Today / Tasks footers.
- `min-h-screen` should be `min-h-[100dvh]` for iOS Safari URL bar.
- Sidebar collapse toggle uselessly visible only on `lg`; that's correct, but the chevron icon swap is the only thing distinguishing the two header layouts — feels accidental, not designed.

### D2. Today
- See C7. Additionally: bar chart day labels (`Mon · Tue · …`) become illegible at 360px because they're sized for 32px-wide bars; abbreviate to `M T W T F S S` on mobile.
- "Active Projects" / "Needs Attention" two-column grid stacks fine but the section headers lose their eyebrow weight rhythm. Acceptable.
- NowStrip works well; this is the strongest mobile surface in the app.

### D3. Clients
- See B5. Search input + segmented control wrap onto 2 rows; segmented control should become a horizontal scroll rail on mobile (C3 pattern).
- ClientAssignmentManager `compact` mode renders 3 stacked avatars in 110px — on mobile collapses to 0px-wide because grid column hidden. Drop the column entirely on mobile and surface assignees inside the detail page only.

### D4. Client Workspace
- See B6 for header.
- Tab bar (Overview / Sessions / Notes / Files / Billing / Settings) currently wraps. Convert to horizontal scroll rail (C3).
- Edit Client button placement: today it sits in the action cluster; on mobile it's the lowest-frequency action and should move into the Settings tab content, not header chips.
- Retainer card uses a 3-column metric layout that compresses to unreadable numbers. Stack vertically with hairline dividers on `< md`.
- Files & Notes drawer triggers Tiptap, which on iOS shows the keyboard accessory bar and pushes the editor into a ~120px window. Provide a "fullscreen edit" mode on mobile.
- Billing section: invoice rows clip. Apply B8 pattern.

### D5. Tasks
- Task list rows already mostly mobile-friendly. Status popover anchored to the dot can render off-screen on right-edge taps — clamp to viewport.
- Drawer: due-date, project picker, and client picker all open as popovers anchored inside the drawer — they overflow the drawer on small screens. On mobile, push these to nested bottom sheets.
- Swipe gestures: this is the single highest-leverage mobile-only addition. Swipe right = complete; swipe left = waiting-on. Aligns with Things 3 and Superhuman.
- Quick Add: see C5.

### D6. Time
- TimeLog table: B8.
- Multi-select bulk action bar is positioned absolutely at page bottom but doesn't account for safe-area-inset-bottom or the proposed bottom nav. Reposition above the tab bar with `bottom: calc(56px + env(safe-area-inset-bottom))`.
- Date filter and project filter wrap onto separate rows. Use C4 pattern (filter bottom sheet).
- Editing a session opens a modal with cramped form rows; convert to a stacked single-column form on mobile.

### D7. Invoices
- Row layout: B8.
- Status pills cluster with amount on the right and become misaligned. Move status to the secondary row beneath title/client.
- Search/filter: C4.
- Invoice detail (PDF preview) renders in an iframe — on mobile this becomes a tiny letter-boxed view. Replace iframe with a rendered React preview at mobile widths, or a "Download / Open in browser" CTA.
- Batch invoice builder uses a multi-pane workflow that completely fails below `lg`. Stage as a 3-step wizard on mobile (Select sessions → Confirm details → Send).

### D8. Insights
- Recharts components don't have mobile-tuned tick density. Reduce X-axis ticks to ~4 on `< md`.
- Net/Gross toggle: C1.
- KPI cards stack to 2 columns at `sm` then 1 column at `xs` — that 2-column intermediate state truncates large currency values. Force single column below 640px.
- Forward Signals cards are dense; on mobile, each signal's metric should sit above the description, not in a side column.

### D9. Settings
- See B7.
- Within each settings panel: forms use 2-column label/input grids that stack OK, but Save bars are inline-at-bottom-of-form, not sticky — users scroll past the change indicator. Sticky bottom save bar with `env(safe-area-inset-bottom)` on mobile.
- Color pickers and date pickers open as popovers anchored to triggers — frequently clipped at viewport edges. Use bottom sheets on mobile.

---

## Part E — Mobile-Specific Opportunities

1. **Bottom nav (B3)** — single largest UX uplift.
2. **Swipe gestures on Tasks** — complete / waiting-on; matches mental model.
3. **Bottom-sheet pattern library** — one primitive reused for: Quick Add, Filters, Pickers, Settings sub-sheets. Build once, deploy everywhere.
4. **Sticky NowStrip when timer is running** — already 80% built; promote shell-wide.
5. **Pull-to-refresh on Today, Tasks, Time, Invoices** — matches platform expectation.
6. **Long-press on task row** = open status popover without opening drawer.
7. **Haptic feedback** (via `navigator.vibrate(10)`) on status changes, timer start/stop, swipe completions. Free polish.
8. **Safe-area-inset tokens** added to design system: `--safe-top`, `--safe-bottom` → used by sticky chrome.
9. **Mobile-only "Add" FAB** on Tasks, Sessions, Invoices that triggers the right Quick Add sheet.
10. **Command-palette equivalent**: bottom-sheet search invoked from a magnifier in the bottom nav. Replaces the desktop ⌘K.

---

## Part F — Desktop Protection Review

Every Critical and Important recommendation above is either `< lg` / `< md` gated (Mobile-Only) or a co-located improvement that also helps desktop (Shared). Explicit **Reject** list to keep on record:

- **Reject:** converting desktop Clients/TimeLog/Invoicing tables into card layouts. Tables are correct on desktop; only the mobile branch becomes stacked rows.
- **Reject:** moving Net/Gross toggle out of context on desktop into a global setting. C1 co-locates; it does not remove the desktop placement, just relocates it inside the data section.
- **Reject:** hiding desktop sidebar in favor of bottom nav. Sidebar is canonical on `lg+`; bottom nav is mobile-only.
- **Reject:** widening drawer minimums above 480px to "feel bigger" on tablet — would crowd desktop content area.
- **Reject:** replacing the desktop quick-add keyboard flow with the mobile bottom sheet. Mobile sheet is additive, gated on `< md`.

---

## Part G — Implementation Roadmap

### Sprint 1 — Foundations (1 week, unblocks everything)
1. Bottom nav component (B3)
2. Bottom-sheet primitive (used by C4, C5, D5 pickers, D9 pickers)
3. Safe-area-inset tokens + `100dvh` shell
4. Notification popover portal fix (B1)
5. Mobile menu exit animation fix (B2)

### Sprint 2 — Critical Surfaces (1 week)
6. Clients mobile row pattern (B5)
7. ClientDetail mobile header + chip rail (B6)
8. Tables → stacked rows on mobile: TimeLog, Invoicing (B8)
9. Settings stack-and-push navigation (B7)
10. Timer surface + sticky NowStrip when running (B4)

### Sprint 3 — Quality Pass (1 week)
11. Horizontal scroll tab rail primitive + apply to Email Activity, Client Workspace tabs, Project tabs (C3)
12. Filter bottom-sheet on Invoicing, TimeLog (C4)
13. Quick Add bottom sheet (C5)
14. Touch target audit pass (C6)
15. Today reorder on mobile (C7)
16. Drawer width + safe-area + drag handle (C8)
17. Net/Gross co-location (C1)
18. Retainer button alignment (C2)

### Sprint 4 — Native Feel (1 week, post-launch acceptable)
19. Swipe gestures on Tasks
20. Pull-to-refresh
21. Long-press status popover
22. Haptics
23. Mobile FAB pattern
24. Mobile command sheet

### Technical Details
- Add a `useIsMobile()` hook (matchMedia `(max-width: 1023px)`) — already partially present; standardize.
- Tailwind: introduce `safe-top` / `safe-bottom` utilities backed by `env(safe-area-inset-*)`.
- Drawer primitive: extract from TaskDrawer into `src/components/primitives/Drawer.tsx`; bottom-sheet variant lives alongside.
- Bottom nav lives in `Root.tsx` next to the existing sidebar `<aside>`, gated `lg:hidden`. Pushes `main` padding-bottom by `calc(56px + env(safe-area-inset-bottom))` on mobile only.
- Tables: introduce `<DataList>` primitive that renders `<table>` on `md+` and stacked rows on `<md`, sharing the same row component contract. Migrate Clients, TimeLog, Invoicing first.
- Notification popover: render via `createPortal(panel, document.body)` when `useIsMobile()` is true, with fixed positioning.

End state: desktop unchanged at the pixel level; mobile becomes a tool a freelancer can actually run their day from.
