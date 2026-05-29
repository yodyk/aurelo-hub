# Aurelo — Information Density Audit

Scope: surface-level information hierarchy. Ignores color, typography, spacing,
motion, formatting (all assumed final). Goal: reduce cognitive load on list and
dashboard surfaces by demoting metadata that is not earning its place.

Each row classifies a field as:

- **Keep** — primary, scannable, earns its column
- **Secondary** — kept but de-emphasized (smaller, muted, or under hover)
- **Contextual** — shown on row hover, expand, or detail drawer
- **Remove** — does not belong on this surface

---

## 1. Clients (list)

| Field | Classification | Rationale |
|---|---|---|
| Client name + avatar | Keep | Primary identity, sort anchor |
| Status (Active/Prospect/Archived) | Keep | Only as filter chip in toolbar; row-level pill becomes a 4px tone dot on the avatar |
| MRR / Retainer monthly | Keep | Most operationally important number |
| Lifetime revenue | Secondary | Smaller, under MRR or right column |
| Dependency % | Secondary | Color only when >30% (warning) or >50% (destructive); otherwise muted |
| Last session date | Contextual | Hover or detail; not list-critical |
| Project count | Contextual | Drawer / detail |
| Tag chips | Remove from list | Plain text tag line on hover; reduces chip inflation (Adj.5) |
| Owner / assignees | Contextual | Avatars stack on hover; not the primary scan target |
| Notes preview | Remove | Belongs on detail |

**Net effect:** 10 fields → 4 visible columns + 1 hover layer.

---

## 2. Client Workspace (detail)

The detail screen currently mixes financial KPIs, project lists, session
history, notes, checklists, and assignees on a single scroll surface.

- **Keep at top:** Identity header, primary KPIs (MRR, lifetime, dependency, hours MTD)
- **Demote to tab:** Projects, Sessions, Invoices, Notes, Checklists, Files, Assignees
- **Remove from header:** Tag list, contact phone (move to identity card), social links
- **Contextual:** Cycle history (already private, keep collapsed by default)

The existing tab sidebar pattern is correct. The audit only recommends pruning
header chrome above the tabs.

---

## 3. Projects (list)

| Field | Classification | Rationale |
|---|---|---|
| Project name | Keep | Sort anchor |
| Client name | Keep | Required disambiguation |
| Status pill | Secondary | Tone dot + label; not full badge |
| Budget | Keep (numeric, right-aligned) | Financial scan |
| Spent | Keep (numeric) | Pairs with budget |
| Effective rate | Keep (numeric, color only when off-target) | Profitability signal |
| Hours logged | Secondary | Muted, smaller, under Spent |
| Due date | Keep | Time-pressure scan |
| Tag chips | Remove from list | Plain text on hover |
| Assignees | Contextual | Avatar stack on hover |
| Last activity | Contextual | Drawer |

**Add:** a single "Trajectory" micro-sparkline column (last 4 weeks of spend) —
replaces three text fields with one glanceable visual.

---

## 4. Time (sessions)

Current row carries: date, client, project, category, duration, billable, rate,
revenue, notes preview, tag chips, recurring icon, billed status.

| Field | Classification | Rationale |
|---|---|---|
| Date | Keep | Primary axis |
| Client → project | Keep | Single combined column (`Acme · Website redesign`) |
| Category | Secondary | Muted text after client/project |
| Duration | Keep (numeric) | Right-aligned, decimals aligned |
| Revenue | Keep (numeric) | Right-aligned |
| Billed status | Keep | Single tone dot (paid / sent / draft / —) |
| Rate | Contextual | Hover tooltip on revenue cell |
| Billable toggle | Contextual | Hover row action |
| Notes preview | Remove from list | Click row to expand or open drawer |
| Tag chips | Remove from list | Hover only |
| Recurring icon | Secondary | Small glyph adjacent to date |

**Net effect:** 11 fields → 6 visible columns. The "notes preview" line is the
single biggest visual-noise reduction.

---

## 5. Invoices (list)

| Field | Classification | Rationale |
|---|---|---|
| Invoice number | Keep | Sort + reference |
| Client | Keep | Required |
| Issue date | Secondary | Smaller, under invoice number |
| Due date | Keep | "Due in 5 days" is the action signal |
| Status | Keep | Badge stays — invoice status drives behaviour |
| Total | Keep (numeric) | Right-aligned |
| Balance due | Keep (numeric) | Right-aligned, only shown when ≠ total |
| Tax breakdown | Remove from list | Detail only |
| Payment terms | Contextual | Tooltip on due date |
| Sent count / reminder count | Contextual | Hover or detail timeline |
| Tag chips | Remove | N/A on invoices |

---

## 6. Insights

Current dashboard pattern is dense by intent — that is correct for a financial
analytics surface. The recommendations are narrow:

- **KPI tiles:** drop secondary delta text below number when delta is < 1%
- **Charts:** remove competing legend chips when the chart itself is colour-coded with inline labels
- **Tables under charts:** apply Time-style column pruning (rate as tooltip, notes off)
- **Forward Signals card:** cap visible signals to top 3; "Show all" expands
- **Period selector:** single segmented control; remove redundant date-range picker when period is preset

---

## 7. Today / Home

Current "Today" tries to surface: timer, recent sessions, upcoming invoices,
unpaid balance, week target, retainer warnings, checklist, project alerts.

| Section | Classification | Rationale |
|---|---|---|
| Timer + week target | Keep (hero) | Highest-frequency action |
| Today's sessions | Keep | Primary log |
| Money-at-rest (overdue + unpaid balance) | Keep | Single combined card, not two |
| Retainer warnings | Keep | Only when ≥1 client over 70% |
| Project alerts | Secondary | Collapsed list, expand to show |
| Setup checklist | Contextual | Dismissable, hide once 80% complete |
| Performance bar chart | Keep | Already core to dashboard layout memory |
| Forward Signals teaser | Remove from Today | Lives on Insights; one teaser line max |
| News / changelog / tips | Remove | Not a Today concern |

**Net effect:** 8 sections → 4 always-visible + 2 conditional + 2 removed.

---

## Cross-cutting recommendations

1. **Tag inflation:** apply Adj.5 — tags become plain-text `· tag · tag` lines
   on hover layer, never colored chips on list rows. Reserve chips for status.
2. **Avatar stacks:** all "assignees" UI moves to row-hover layer.
3. **Tone dots:** prefer 4–6px tone dots over full pills for non-actionable
   status (project status, client status). Reserve full badges for invoice
   status where the badge IS the call to action.
4. **Hover row actions:** introduce a right-edge action affordance ("⋯") that
   reveals the contextual layer (assignees, tags, rate, notes). One pattern,
   used everywhere.
5. **Detail drawers:** invest in a right-side drawer pattern for rows that
   currently overload the list. Reduces the "I have to click to navigate" tax
   while keeping list scanability.

---

Trim PRs follow this audit; each surface gets one focused commit.
