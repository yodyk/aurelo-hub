
# Aurelo — Refined Roadmap & Screen Architecture Specifications

Roadmap approved. This document incorporates the four executive adjustments and delivers detailed screen specs for the six core surfaces.

---

## Part A — Roadmap Adjustments (binding)

### Adjustment 1 — Timer Rebalance

The timer is **persistent and prestigious, not omnipresent and dominant.**

- Lives in the **app shell top strip** at all times: compact pill, 280px max width, shows running client/project + elapsed time + stop button. When idle, collapses to a single "Start timer" affordance with a keyboard hint (`T`).
- Is **never** the dominant element on any page except a dedicated "Focus" mode (full-screen timer, optional, triggered by clicking the pill).
- On **Today**, the timer is one of three peer zones — not the hero. The hero is "what needs you today."
- On **Client Workspace** and **Project**, the start-timer action is a *secondary* button next to the primary action of that screen (e.g. "New invoice" on Billing tab, "Add session" on Work tab).
- Aurelo opens to **Today** in whatever state the user actually arrived in — review mode, billing mode, or tracking mode are all equally first-class entry points.

### Adjustment 2 — Client Workspace Tab Model (revised)

Portal stays separate from Settings. Final structure is **5 tabs**, not 4, not 10:

| # | Tab | Contains |
|---|---|---|
| 1 | **Overview** | Header KPIs, recent activity, key contacts, retainer state, custom fields, tags |
| 2 | **Work** | Projects, Sessions, Tasks, Checklists, Recurring rules |
| 3 | **Docs** | Notes (Tiptap) + Files, side-by-side two-column |
| 4 | **Billing** | Invoices for this client, rate hierarchy, payment terms, Stripe Connect state, retainer cycles, payment history |
| 5 | **Portal** | Client-facing portal: link, visibility toggles, what the client sees preview, share controls |

Workspace administration (assignments, role permissions, archival, delete) lives in a **gear icon** in the client header that opens a slideover — not a tab. Settings is administrative chrome, not a destination. Portal is a *product surface the client uses* and earns its own tab.

### Adjustment 3 — Typography Hierarchy (5 altitudes)

Replaces the 3-altitude proposal. Tokens to add to `index.css`:

| Token | Use | Size / weight / tracking / line-height |
|---|---|---|
| `--type-display` | Marquee numbers (Today hero metric, Insights hero) | 40px / 680 / -0.035em / 1.05 |
| `--type-page` | Page H1 (Clients, Time, Invoices, Insights, Client Workspace header) | 26px / 700 / -0.03em / 1.15 |
| `--type-section` | Section title within a page, modal/slideover title, card group title | 17px / 650 / -0.018em / 1.3 |
| `--type-body` | Default UI text, table cells, form labels, list rows | 13.5px / 500 / -0.005em / 1.45 |
| `--type-meta` | Captions, secondary metadata, helper text | 11.5px / 600 / 0 / 1.4 (uppercase eyebrow: 10.5/600/0.08em) |

Rules:
- Display appears at most **once per page** and only on Today, Insights, and Client Workspace header.
- Page → Section → Body are the workhorse triad; Meta is for support copy only.
- Two weights co-exist per composition (e.g. 500 body + 700 page). Never three.
- Numeric variants of Display, Page, and Body inherit `font-variant-numeric: tabular-nums`.

### Adjustment 4 — Personality & Identity (Aurelo's voice)

Aurelo's identity is **the calm command center of a one-person business.** It is not playful, not corporate, not "delight-bombed." The voice is **quiet, exact, and slightly old-world**, like a financial publication crossed with a Swiss watch face. Concrete commitments:

**Visual signature.**
- The **hairline** is the brand. Aurelo uses hairlines (1px `--hairline`) where competitors use cards. Every screen reads as a single page, not a deck.
- **Editorial numerals.** Money and time use a slightly tighter tabular face with an oversized decimal break — the number is the hero, the unit is the whisper.
- **One accent moment per screen.** Teal is reserved for the *one thing the user came here to do*. Everywhere else is grayscale + status. This restraint is the look.
- **Cinematic motion.** Transitions ease on `cubic-bezier(0.32, 0.72, 0, 1)` (Apple's tactile curve, already in `button.tsx` — extend system-wide). Page transitions: 240ms cross-fade + 4px upward translate. Never bouncy. Never spring.

**Voice & copy.**
- Aurelo addresses the user as a **professional**, not a "creator." Words: *invoice, retainer, deliverable, cycle, ledger, rate, scope, runway*. Never: *workspace pals, awesome, oops, you got this*.
- Time is humanized but precise: "Due Friday," "2h 14m today," "Net 30 — sent Tuesday."
- Money is never approximate. `$1,240.00` not `~$1.2k`. Aurelo trusts its user with real numbers.

**Moments of confidence (replaces "delight").**
- **Sent.** When an invoice is sent: the row collapses elegantly, a hairline of teal sweeps left-to-right across it (600ms), and the status updates in place. No toast. The motion *is* the confirmation.
- **Paid.** Invoice paid: the row's number shifts to teal with a 1px underline, status pill swaps to Paid, and a single soft tone plays (opt-in, off by default). The amount briefly enlarges (+8%) then settles.
- **Cycle reset.** Retainer reset: the cycle bar resets with a slow fill animation (1.2s) that visually *earns* the new period.
- **Day done.** When the user stops their last timer of the day and total billable ≥ goal, the timer pill morphs into a one-line summary: "6h 42m logged — $1,420 earned today." Dismissible. No fireworks.

**Empty states with personality.**
- "No invoices yet. The first one is the hardest." → `[ Create invoice ]`
- "No sessions logged today. The day is still yours." → `[ Start timer ]`
- "No clients yet. Aurelo gets useful the moment you add one." → `[ Add client ]`
- "No retainer cycles. Add a retainer to start tracking caps and warnings." → `[ Set up retainer ]`
- No illustrations. One line of human copy + one verb-led CTA. The personality is in the *sentence*, not in art.

**Onboarding experience.**
- Three screens, not seven: **You** (name, business identity, currency), **How you bill** (hourly default rate, billing cycle, payment terms), **Your first client** (optional, skippable). Each screen is centered, one focal input at a time, hairline progress dots at top.
- Closes with a one-line sentence: *"Welcome, [Name]. Your first month starts now."* — then drops into Today, not a tour. The Spotlight Tour is preserved but becomes opt-in via a `?` in the header, not auto-triggered.

**Onboarding aesthetic.** Same hairlines, same type scale, same teal accent — onboarding *is* the product, not a separate marketing skin. This continuity is itself a confidence signal.

**Progress feedback.**
- Retainer cycle fill: animated hairline bar across client cards, segmented at 70/85/90 with subtle color shifts (gray → amber → coral). The bar is the only colored element on the card.
- Invoice aging: rows fade from full opacity at Sent → slight desaturation at Net 30 → coral hairline at Overdue. Visual aging mirrors real aging.
- Project budget burn: a single ring on the project card, no chart, no legend. The ring is the chart.

**What Aurelo will not do.**
- No mascots. No emoji in product copy. No celebratory modals. No streaks. No badges. No XP. No "achievements unlocked." No motivational quotes on empty states. No gradients in product chrome.
- These omissions *are* the personality.

---

## Part B — Detailed Screen Architecture

### Screen 1 — Today (`/`)

**1. Primary purpose.** Land the user in the right work, immediately. Answer three questions in one glance: *Where did I leave off? What needs me today? Where is my week?*

**2. Dominant element.** The **"Needs you" rail** — a vertically stacked, prioritized list of items requiring action today: overdue invoices, retainers at 85%+, unanswered portal messages, tasks due today, scheduled recurring sessions about to run. Each item is one row, one verb. This is the hero because review and decision are the most common entry intents — not tracking.

**3. Secondary elements.**
- **Timer pill** (in app shell, always — not duplicated on Today).
- **Today's sessions list** — chronological, with client, project, elapsed time, billable state. Inline edit on hover. The day's running total in the section header, in Display numerals.
- **Week pulse** — a single horizontal hairline bar showing M–S with billable hours per day. No chart chrome. Hover reveals exact amounts.

**4. Tertiary elements.**
- Setup checklist (only while incomplete; collapses to one line).
- "Quick add session" affordance at the bottom of the sessions list.
- Greeting line removed entirely.

**5. Layout structure.**

```text
┌─────────────────────────────────────────────────────────────┐
│  Today · Thursday, May 29                                   │  ← page meta (no H1 "Today" — the date IS the title)
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   NEEDS YOU                                  (3 items)      │  ← section eyebrow
│   ────────────────────────────────────────────────────      │
│   ◐  Invoice #1042 to Acme Co — overdue 4 days   $2,400 →  │
│   ◐  Northwind retainer at 87%                   [review] → │
│   ◐  Reply: Lighthouse portal note                       →  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│   TODAY'S SESSIONS                          2h 14m today    │  ← running total = Display numerals
│   ────────────────────────────────────────────────────      │
│   09:14   Acme · Brand refresh           1h 02m   billable │
│   11:30   Northwind · Q2 audit           1h 12m   billable │
│   + Quick add                                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│   THIS WEEK                                                 │
│   M ▰▰▰▰░  T ▰▰▰░░  W ▰▰▰▰▰  T ▰▰░░░  F ░░░░░             │
│   18h 30m billable · $2,840 accrued                         │
└─────────────────────────────────────────────────────────────┘
```

Single column, max-width 880px, centered. No 60/40 split, no two-column experiments.

**6. Composition hierarchy.** Eyebrow (Meta uppercase) → Section content (Body) → Inline numerics (Display when totals, Body tabular when row-level). One Display per zone, max.

**7. Interaction hierarchy.**
1. Click any "Needs you" row → opens the relevant entity in a slideover (invoice, retainer, portal thread).
2. Click any session row → inline edit.
3. Click week bar segment → navigate to Time filtered to that day.
4. Keyboard: `T` starts timer (from anywhere), `N` opens quick-add session, `I` opens new invoice.

**8. Removed.**
- Greeting + workspace logo.
- Performance bar chart.
- Animated counter on revenue.
- Relative-date tooltip.
- Setup checklist as a card (now a one-liner).
- Demo mode banner.
- Trial banner (moves to sidebar footer).
- Forward Signals widget (now in Insights).

**9. Relocated.**
- Performance chart → Insights.
- Forward Signals → Insights → Alerts rail.
- Notification bell → app shell.

**10. What makes this premium.** The page does not greet you. It *defers* to you. The first thing you see is the work, not the product. The dominant element is consequential, not decorative. The numerics are editorial. The page reads top-to-bottom like a one-page brief — no widgets competing for attention. Aurelo respects that you came here to *do something*.

---

### Screen 2 — Clients (`/clients`)

**1. Primary purpose.** Find a client fast; assess every client's health in a single scan.

**2. Dominant element.** The **client table** — one row per client, generous rhythm (56px rows), hairline dividers, no card grid. The table *is* the page.

**3. Secondary elements.**
- Visible search input (always shown, not Cmd+K — this is a destination users land on to find someone).
- Status filter strip (All · Active · Prospect · Archived) — segmented control, not pills.
- "Add client" button, top right.

**4. Tertiary elements.**
- Per-row revenue hairline bar (role-gated).
- Team assignment chips, compact.
- Archived clients collapsed into a single expandable group at the bottom: "*Archived (12) — show*".

**5. Layout structure.**

```text
┌─────────────────────────────────────────────────────────────────┐
│  Clients                                         [+ Add client] │
│  24 active · $18,420 this month                                 │
│                                                                 │
│  [All] [Active] [Prospect] [Archived]      ⌕ Search clients     │
├─────────────────────────────────────────────────────────────────┤
│  CLIENT              STATUS  TYPE      TEAM   RATE   THIS MONTH │
│  ────────────────────────────────────────────────────────────── │
│  ● Acme Co           Active  Retainer  AB     $145   $2,400 ▰▰▰░│
│  ● Northwind         Active  Hourly    AB JD  $120   $1,840 ▰▰░░│
│  ● Lighthouse        Prosp.  —         —      —      —          │
│  ...                                                            │
│  ▸ Archived (12)                                                │
└─────────────────────────────────────────────────────────────────┘
```

**6. Composition hierarchy.** Page heading (Page token) → meta line (Meta) → controls strip (Body) → table eyebrow headers (Meta uppercase 10.5px tracking 0.08em) → rows (Body, tabular-nums for numerics).

**7. Interaction hierarchy.**
1. Click row → Client Workspace.
2. Hover row → reveal `ArrowUpRight` icon (already implemented).
3. Right-click row → context menu (Edit, Archive, Start timer for this client, Create invoice).
4. Search filters live as you type; status segments are exclusive.

**8. Removed.**
- Revenue hero stats above the table (the per-row bar carries it).
- Card grid option.
- Plan-limit banner shown at all times (now appears only on add attempt).

**9. Relocated.**
- Add-client over-limit warning → modal at point of action.

**10. What makes this premium.** The table is the only thing on the page. No widgets, no insights, no recommended actions. The hairline rhythm reads like a ledger. The revenue bar — the only color on each row besides the status dot — gives Aurelo the visual signature of "this is a business." Hover states are silent. The page doesn't try to be a dashboard. It's an index.

---

### Screen 3 — Client Workspace (`/clients/:id`)

**1. Primary purpose.** Be the *one room* where everything about this client lives. The user enters and orients in 1 second.

**2. Dominant element.** The **editorial header** — client name in Display, status pill, effective rate (Display numerals: `$142.50 /hr effective`), and one primary action button contextual to the active tab. The header has presence, not chrome.

**3. Secondary elements.**
- **Underline tab bar** — 5 tabs: Overview · Work · Docs · Billing · Portal.
- **Gear icon** (header right) — opens Settings slideover (assignments, custom fields, archive, delete).
- **Start timer for this client** — secondary outline button next to the primary action.

**4. Tertiary elements.**
- Breadcrumb: `Clients › Acme Co` (small, top-left, single line).
- Tags + custom field chips appear inside Overview, not in the header.
- Favicon/logo 40px circle next to the name.

**5. Layout structure.**

```text
┌─────────────────────────────────────────────────────────────────┐
│  Clients › Acme Co                                              │
│                                                                 │
│  ⬤  Acme Co                                ● Active             │  ← Display 40px
│       $142.50 /hr effective · $24,800 lifetime                  │  ← Page numerals
│                                                                 │
│  [Overview]  Work  Docs  Billing  Portal              [⚙] [▶ Start timer] [+ New invoice]│
│  ──────────                                                     │  ← active underline 2px teal
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ACTIVE TAB CONTENT                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Tab contents:**
- **Overview:** Three-column KPI strip (Lifetime, This month, Effective rate) in Display numerals → "Recent activity" timeline (sessions + invoices + notes interleaved, Body) → Contacts list → Custom fields + tags.
- **Work:** Three sections separated by hairlines — Projects (cards, 1 per row, with budget ring + status), Sessions (table, default-filtered to this client), Tasks & Checklists (one inline list, no separate tabs). "Recurring rules" link at the bottom.
- **Docs:** Two-column split — Notes (Tiptap) on left 60%, Files (grid of file rows with type icon, name, size, date) on right 40%. Resize handle.
- **Billing:** Invoice table (filtered to this client) at top, retainer cycle visualization below, rate hierarchy + payment terms + Stripe Connect state in a Settings-style hairline list at bottom.
- **Portal:** Live preview iframe of what the client sees (left 70%), controls panel (right 30%) — link, copy, regenerate, visibility toggles per section, last viewed timestamp.

**6. Composition hierarchy.** Display (name) → Page numerals (rate/lifetime) → Section eyebrows inside each tab → Body content. Two altitudes per tab content area, never more.

**7. Interaction hierarchy.**
1. Tab click — instant switch, no animation longer than 180ms.
2. Primary CTA in header changes by tab: Overview = "Add note," Work = "New project," Docs = "Upload file," Billing = "New invoice," Portal = "Copy link."
3. Gear icon → settings slideover (480px right drawer).
4. Any entity in any tab → edit in slideover, never a separate page (except project detail which keeps its route for deep-link sharing).

**8. Removed.**
- 10-tab sidebar inside client detail.
- Separate Notes tab, separate Checklists tab, separate Files tab, separate Settings tab.
- Redundant identity sections.
- Multiple stat cards in the header (consolidated to two numerics in the header sub-line).

**9. Relocated.**
- Notes + Files → Docs tab.
- Checklists → Work tab.
- Recurring sessions → Work tab footer link → slideover.
- Assignments → Settings slideover (via gear).
- Webhook events per-client → removed (Workspace settings only).

**10. What makes this premium.** The client *is* a workspace, not a record. The header reads like a magazine masthead — name in Display, business numbers in Page numerals, status as a quiet pill. Five tabs is the exact right number: it implies depth without sprawl. The Portal getting its own tab tells the user that the client-facing surface is a first-class product, not a setting. Every CTA in the header is contextual — the screen *knows what mode you're in*.

---

### Screen 4 — Time (`/time`)

**1. Primary purpose.** Review, correct, and act in bulk on logged work — the freelancer's audit ledger.

**2. Dominant element.** The **session list** — date-grouped, dense but breathable, with sticky date headers and per-day totals in Page numerals.

**3. Secondary elements.**
- **Filter rail** (left, 240px, collapsible): client, project, member, date range, billable state, group-by (none/client/project).
- Visible search at top.
- Secondary tab strip at the very top of the page: **Sessions** (default) · **Recurring** (the recurring-sessions manager lives here).
- Bulk action floating bar appears at bottom on multi-select.

**4. Tertiary elements.**
- Saved views dropdown (e.g., "Billable this week," "Projects view" — replaces the standalone `/projects` page).
- Export button (top-right, icon-only with tooltip).

**5. Layout structure.**

```text
┌─────────────────────────────────────────────────────────────────┐
│  Time                                            [Export] [+ Log]│
│  84h 20m this week · 76h billable · $9,840 accrued              │  ← Page numerics
│                                                                 │
│  [Sessions] Recurring                                           │  ← secondary tab strip
├──────────────┬──────────────────────────────────────────────────┤
│ FILTERS      │ ⌕ Search sessions          [Saved: All ▾]        │
│              │                                                  │
│ Client       │ ── THU MAY 29 ─────────────── 6h 12m · $720 ──── │
│ □ Acme       │ 09:14  Acme · Brand refresh    1h 02m   $145    │
│ □ Northwind  │ 11:30  Northwind · Q2 audit    1h 12m   $144    │
│ ...          │ ...                                             │
│              │                                                  │
│ Project      │ ── WED MAY 28 ─────────────── 7h 04m · $830 ──── │
│ ...          │ ...                                              │
│              │                                                  │
│ Date range   │                                                  │
│ Billable     │                                                  │
│ Group by     │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

**6. Composition hierarchy.** Page heading → Page numerics for week totals → secondary tabs → eyebrow date headers (Meta uppercase with per-day Page numerics) → Body rows. The date headers carry the rhythm.

**7. Interaction hierarchy.**
1. Click row → inline edit (expands in place; not a slideover for speed).
2. Cmd-click rows → multi-select → bulk bar appears (Invoice, Mark billable, Delete, Reassign project).
3. Filter changes update list live with 180ms fade.
4. Group-by switches the section dividers from date to client/project.

**8. Removed.**
- Standalone `/projects` page (now a saved view in Time: "Projects").
- The visible "task vs notes" type discriminator chip (single description field; the type is implied by duration = 0).
- Per-page chart widget at the top.

**9. Relocated.**
- Recurring sessions manager → secondary tab.
- Cross-client project triage → saved view.
- Bulk invoice creation → preserved, links to Batch Invoice Builder.

**10. What makes this premium.** The ledger reads like a bank statement — date headers, totals, hairline rows, tabular numerics. The filter rail is restrained, no chart noise. The page never tells you what to do; it shows you what you did. The dense rhythm signals professional tooling. Aurelo trusts the user to do bulk work without hand-holding.

---

### Screen 5 — Invoices (`/invoices`)

**1. Primary purpose.** Know who owes you, who you need to invoice next, and what just got paid.

**2. Dominant element.** A **status-segmented invoice list**. The segmented control (Draft · Sent · Overdue · Paid · All) is the page's organizing principle, sitting directly above the list.

**3. Secondary elements.**
- Outstanding total + paid-this-month total in the page header (Page numerals).
- "Create invoice" button → opens Batch Invoice Builder by default (sessions-aware).
- Invoice presets accessible via dropdown next to Create.

**4. Tertiary elements.**
- Stripe Connect setup nudge — one-line hairline banner above the list, only if not connected; dismissible per-session.
- Filter row: client, date range, amount range.
- Visible search.

**5. Layout structure.**

```text
┌─────────────────────────────────────────────────────────────────┐
│  Invoices                          [Presets ▾] [+ Create invoice]│
│  $8,420 outstanding · $14,200 paid this month                   │
│                                                                 │
│  ─ Connect Stripe to accept card payments → [Connect]  [×]      │  ← contextual nudge
│                                                                 │
│  [All] [Draft] [Sent] [Overdue · 2] [Paid]      ⌕ Search        │
├─────────────────────────────────────────────────────────────────┤
│  # 1042   Acme Co            Net 30 · Overdue 4d   $2,400  →   │  ← Overdue row: coral hairline
│  # 1041   Northwind          Sent · Due in 8d      $1,840  →   │
│  # 1040   Lighthouse         Draft                 $   600 →   │
│  # 1039   Acme Co            Paid · May 22         $2,400      │  ← Paid: amount teal
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

**6. Composition hierarchy.** Page heading → Page numerics (outstanding/paid) → segmented control with badge count for Overdue → table rows. The segmented control is *the* hierarchy — it tells the eye what mode the page is in.

**7. Interaction hierarchy.**
1. Click row → invoice slideover (preview + actions: Send, Mark paid, Resend, Download PDF, Email log).
2. Segment click → instant filter (no spinner, no fade longer than 120ms).
3. Cmd+click for multi-select → bulk send / mark paid / export.
4. Email activity log lives inside the slideover under a "History" disclosure.

**8. Removed.**
- Vanity revenue hero card.
- Stripe Connect status as a separate Settings tab (now contextual nudge + still in Settings).
- Standalone Email Activity Log page.

**9. Relocated.**
- Email activity log → per-invoice, inside slideover.
- Presets management → dropdown + still editable in Settings → Billing.
- Stripe Connect setup → contextual nudge here + comprehensive flow in Settings.

**10. What makes this premium.** The segmented control with `Overdue · 2` is the most important affordance — it surfaces the one number that matters. The aging visualization (coral hairline on overdue rows, teal numerals on paid rows) makes the *state of the business* legible at a glance. The "Sent" and "Paid" animations (hairline sweep, amount enlarge) make every transaction feel earned. The page reads like a controller's screen at a private bank.

---

### Screen 6 — Insights (`/insights`)

**1. Primary purpose.** Answer one question: *Is my business healthy, and where is it bending?*

**2. Dominant element.** A **single hero metric in Display** — "Net effective rate this month" — with a sparkline beneath. This is the freelancer's heartbeat number. Larger than anything else on the page.

**3. Secondary elements.**
- Three focused charts beneath, in a single row (or stacked on narrow viewports):
  1. **Revenue by client** (concentration / dependency) — horizontal bar, top 5 + Other.
  2. **Billable %** — donut with the percent in the center in Display numerals.
  3. **Profitability by project** — vertical bar sorted by effective rate, color-shifted at thresholds.
- **Alerts rail** (right column, 320px): Forward Signals live here as a quiet list of algorithmic alerts (scope creep, dependency, trend, rate erosion).

**4. Tertiary elements.**
- Time-range selector (top right): This month / Last month / Last 90 days / Year to date / Custom.
- Comparison toggle: vs previous period (off by default).
- Studio-role section below: Team Utilization (locked behind role gate, single chart).
- Export button.

**5. Layout structure.**

```text
┌─────────────────────────────────────────────────────────────────┐
│  Insights                              [This month ▾] [Compare] │
│                                                                 │
├──────────────────────────────────────────┬──────────────────────┤
│                                          │ ALERTS                │
│      NET EFFECTIVE RATE                  │ ──────                │
│                                          │ ⚠ Acme scope +18%    │
│      $138.40 / hr                        │ ↗ Northwind trend     │
│      ──────────────────                  │ ⚠ Lighthouse retainer │
│      ╱╲      ╱╲    ╱                     │   at 87%              │
│        ╲╱╲  ╱  ╲  ╱                      │ ↘ Rate erosion: -4%   │
│           ╲╱    ╲╱                       │                       │
│      vs last month: +$4.20               │                       │
│                                          │                       │
├──────────────────────────────────────────┤                       │
│                                          │                       │
│  REVENUE      BILLABLE %    PROFITABILITY│                       │
│  BY CLIENT                  BY PROJECT   │                       │
│  ▰▰▰▰ Acme    ⌬ 78%        ▮▮▮▮▮▮▮▮      │                       │
│  ▰▰▰ North.                 ▮▮▮▮▮        │                       │
│  ▰▰ Light.                  ▮▮▮          │                       │
│  ▰ Other                                 │                       │
│                                          │                       │
├──────────────────────────────────────────┴──────────────────────┤
│  TEAM UTILIZATION (Studio)                                      │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

**6. Composition hierarchy.** The hero metric in Display dominates by an order of magnitude. The three secondary charts are visually equal to each other. The alerts rail is meta-level by altitude (smaller type, denser). Team Utilization is a separate band below, visually demoted.

**7. Interaction hierarchy.**
1. Hover hero sparkline → tooltip with exact daily value.
2. Click any chart → opens a detail slideover with the underlying breakdown table.
3. Click any alert → navigates to the responsible entity (client, project, retainer).
4. Time-range change → all charts update with 240ms cross-fade.

**8. Removed.**
- Dashboard-style widget grid.
- Donut variants of the same metric (one donut, one purpose).
- "Forward Signals" as a standalone destination.
- Per-widget headers and descriptions.

**9. Relocated.**
- Forward Signals → Alerts rail here.
- Team Utilization → bottom band of this page (was a separate page).
- Performance bar chart from Home → here as one of the secondary charts.

**10. What makes this premium.** The hero metric establishes that Aurelo *has an opinion* about what matters — net effective rate, not gross revenue, not hours worked. The single Display number with a sparkline below is the gesture of a financial product, not a dashboard. The Alerts rail makes algorithmic intelligence feel quiet and trustworthy — no badges, no exclamation marks, no urgency theater. The page tells you the truth in one screen.

---

## Part C — Implementation Sequence (unchanged but reaffirmed)

1. **Phase 1** — App shell (top strip with timer pill, workspace, search, user) + 5-verb sidebar + route redirects for `/projects`, `/tasks`, `/team`.
2. **Phase 2** — Today rebuild per spec above.
3. **Phase 4 (run before 3)** — Composition primitives: `<PageHeader>`, `<Slideover>`, `<DataList>`, `<SegmentedControl>`, eyebrow section header, hero metric component, hairline-bar component. Type tokens (5 altitudes) added to `index.css`.
4. **Phase 3** — Client Workspace rebuild using new primitives (5 tabs, gear-settings slideover, contextual primary CTA per tab).
5. **Phase 5** — Progressive disclosure relocation (Forward Signals → Insights rail, retainer warnings → Today + Overview, plan limits → point-of-action, webhooks → Settings → Integrations, recurring → Time secondary tab, demo mode → user menu).
6. **Phase 6** — Design system hardening: lock the 5 type tokens, spacing scale, 4 surface layers, icon/badge/status rules, lint enforcement.

Parallelizable: task/session UI unification (ride with Phase 3), Cmd+K (ride with Phase 1), empty-state copy sweep (ride with Phase 4).

---

Approve and I will start Phase 1 — the app shell, the timer pill, the 5-verb sidebar, and the redirect adapters — implementing the composition primitives in lockstep so Phase 2's Today rebuild lands on the new foundation.
