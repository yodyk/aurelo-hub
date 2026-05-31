# Client Portal Evolution — Implementation Plan

Approved audit + refinements baked in. Phased so each phase ships independently with visible client value. No re-audit; this is build sequencing.

---

## Guiding constraints (locked)

- **3 client questions** drive every surface: *what's waiting on me · what changed · what's next*.
- **Link-first** Shared Resources. No file-hosting positioning. Lightweight uploads (PDFs, images) only — later, optional.
- **Tasks default private.** Per-checklist `shared_with_client` flag controls visibility.
- **Activity feed is derived** from existing tables. No `portal_events` table in v1.
- **Milestones are freelancer-defined.** Title + status + optional due date. Nothing else.
- **Projects stay**, simplified — not removed.
- **Mobile-first.** Waiting-on-you above the fold on phones. Deep links from day one.
- **Visual system:** Cool Graphite + Cobalt, hairlines, display type, 4px radius cap, Motion confirms. Strip all hardcoded hex from `ClientPortal.tsx`.

---

## Phase 1 — Reframe (no schema changes)

Goal: portal *feels* like the new Aurelo and is reorganized around the 3 questions, using only data we already have.

**Scope**
- New IA: `Home / Resources / Tasks / Billing` (Resources is a stub in P1 — empty state only, link-first messaging).
- New homepage composition (in order, sections hide when empty):
  1. **Header** — workspace logo, "Client Portal" chip, contact card (freelancer name + email pulled from workspace owner).
  2. **Client identity strip** — name, model badge, status dot, optional `portal_greeting`.
  3. **Waiting on you** — derived list:
     - Unpaid invoices (`status in (sent, issued, overdue)`) → "Pay invoice {number}"
     - Checklist items where `added_by = 'owner'` AND `assigned_to_client = true` AND `status != complete` (new boolean, see schema below)
     - (Phase 4 will add approvals + questions to this list)
  4. **This Week** — freelancer-authored weekly update card (Phase 3 adds the table; in P1 hidden).
  5. **Recent activity** — derived semantic feed:
     - `invoice.sent`, `invoice.paid` (from `invoices`)
     - `task.completed` (from `checklist_items.completed_at`, only on shared checklists)
     - `note.shared` (Phase 3)
     - `deliverable.added`, `deliverable.approved` (Phase 2/4)
     - Merge, sort by timestamp desc, cap at 20.
  6. **Engagements** — simplified project list: name · status · "Next: {milestone title}" (milestone in P3; in P1 show status only).
  7. **Retainer bar** — only when `model = 'Retainer'` AND `retainer_total > 0`.
- **Strip from default view:** hours-logged stat, monthly-earnings stat, total-sessions stat, per-session revenue, work tags exposed to client, session-list-as-activity.
- **Visual migration:** replace every `#hex` literal in `ClientPortal.tsx` with portal-scoped CSS vars derived from the freelancer system; keep the light-mode lock; adopt hairline borders (`border-[var(--hairline)]`), display headings, 4px radius, tabular-nums on all numbers.
- **Mobile-first restructure:**
  - Single column on mobile; 2-up grid only ≥`lg`.
  - Waiting-on-you above the fold (no hero stats grid first).
  - Sticky bottom CTA when viewing a focused item (Pay / Approve placeholder).
  - Tabs become a hairline segmented control; collapse to bottom-sheet picker if >4 entries.
- **Deep-link routing:** `/portal/:token?focus=invoice:{id}` and `?focus=task:{id}` — scroll to and highlight target on mount. Lays groundwork for email-link parity.

**Out of scope for P1**
- Approvals workflow, deliverables, weekly updates, milestones, questions, file uploads, Stripe pay inline.

**Files touched (estimate)**
- `src/pages/ClientPortal.tsx` — major rewrite, split into:
  - `src/components/portal/PortalHeader.tsx`
  - `src/components/portal/PortalWaitingOnYou.tsx`
  - `src/components/portal/PortalActivityFeed.tsx`
  - `src/components/portal/PortalEngagements.tsx`
  - `src/components/portal/PortalRetainerCard.tsx`
  - `src/components/portal/PortalResources.tsx` (stub)
  - `src/components/portal/PortalTasksTab.tsx`
  - `src/components/portal/PortalBillingTab.tsx`
  - `src/components/portal/portalTheme.ts` — token bridge
- `supabase/functions/portal-view/index.ts` — return only what the new IA needs, drop session-level fields the UI no longer renders, include workspace owner contact, include derived activity in a single response.

---

## Phase 2 — Billing first-class + inline pay

Goal: paying an invoice from the portal becomes a one-tap action; reduces "did you get my payment?" emails.

- Promote `Billing` tab; show outstanding first, then paid history.
- Each unpaid invoice in *Waiting on you* gets a primary **Pay** action.
- Wire to existing `create-invoice-payment` edge function (Stripe Connect already exists). Returns checkout URL; portal opens in same tab; success returns to `/portal/:token?focus=invoice:{id}&paid=1` and shows a confirmation toast.
- Retainer block stays a card inside Billing (also surfaced on Home when active).
- No schema changes.

---

## Phase 3 — Weekly update + shared notes + milestones

Goal: the freelancer can post a short structured update and a project's "next" is visible.

**Schema**

```sql
-- Weekly update (one current per workspace+client; older are history)
CREATE TABLE public.portal_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  client_id uuid NOT NULL,
  this_week text,
  next_week text,
  waiting_on_you text,
  posted_at timestamptz NOT NULL DEFAULT now(),
  posted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- GRANTs + RLS: workspace members read/write own; portal-view reads via service role.

-- Milestones (freelancer-defined; minimal)
CREATE TABLE public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  project_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'upcoming', -- upcoming | in_progress | complete
  due_date date,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Per-checklist client visibility (default private)
ALTER TABLE public.checklists ADD COLUMN shared_with_client boolean NOT NULL DEFAULT false;

-- Per-item client assignment (drives Waiting on you)
ALTER TABLE public.checklist_items ADD COLUMN assigned_to_client boolean NOT NULL DEFAULT false;

-- Notes shared with client
ALTER TABLE public.notes ADD COLUMN shared_with_client boolean NOT NULL DEFAULT false;
```

**Portal changes**
- Home: render *This Week* card when a `portal_updates` row exists; hide entirely when none.
- Engagements: show "Next: {next incomplete milestone title}" per project.
- Activity feed gains `note.shared` and `update.posted` event types (derived).
- Tasks tab: only show checklists where `shared_with_client = true`; split visually into **On you** (`assigned_to_client = true`) vs **On us**.

**Freelancer-side additions**
- Client detail → new "Portal" section to write/edit weekly update (3 short fields).
- Project detail → milestones manager (title, status, due, drag-reorder).
- Checklist row → "Share with client" toggle.
- Note row → "Share with client" toggle.

---

## Phase 4 — Shared Resources + Approvals

Goal: kill "can you resend that link?" and "approved!" email threads.

**Schema**

```sql
-- Renamed from "deliverables" to reflect link-first scope
CREATE TABLE public.shared_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  client_id uuid NOT NULL,
  project_id uuid,
  kind text NOT NULL,            -- link | file
  provider text,                  -- google_drive | dropbox | onedrive | figma | loom | vimeo | youtube | notion | airtable | url
  url text,
  file_path text,                 -- nullable; for lightweight uploads (PDF/image)
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'shared',  -- shared | for_review | approved | final
  needs_approval boolean NOT NULL DEFAULT false,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.resource_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  client_id uuid NOT NULL,
  resource_id uuid NOT NULL,
  decision text NOT NULL,        -- approved | changes_requested | rejected
  comment text,
  decided_at timestamptz NOT NULL DEFAULT now()
);
```

- Provider detection on URL paste (regex → provider + favicon).
- Portal Resources tab groups by `status`: For review · Approved · Final · All.
- When `needs_approval = true` and no decision yet → appears in *Waiting on you* with Approve / Request changes (with comment) / Reject.
- Lightweight upload path uses existing `client-files` bucket (private), capped client-side at e.g. 25 MB and content-type-restricted to PDF/image to keep storage liability low.
- Activity feed gains `resource.added`, `resource.approved`, `resource.changes_requested`.
- Email notifications to freelancer on each decision via `notifications` + Resend.

---

## Phase 5 — Questions + email-portal parity

- `portal_questions` table: question, answer, asked_at, answered_at, asked_by_user_id.
- Unanswered question → *Waiting on you*.
- Every notification email (invoice sent, approval requested, question posted) links to the exact portal item via `?focus=` deep link added in P1.
- Optional: PWA manifest per workspace using `clientFaviconUrl` so clients can add the portal to home screen.

---

## Phase 6 — Polish

- Pull-to-refresh on mobile activity feed.
- Skeleton loaders matching new surface system.
- Empty-state pass: every section hides when empty (no "no activity yet" placeholders cluttering the home).
- Audit `portal-view` payload size; lazy-load activity beyond first 20.

---

## Technical notes

**`portal-view` edge function changes (all phases)**
- Add `workspaceOwner: { name, email }` to response.
- Add `activity: SemanticEvent[]` derived server-side (single sorted, capped list).
- Add `waitingOnYou: WaitingItem[]` derived server-side (unpaid invoices + client-assigned tasks + pending approvals + open questions).
- Honor `shared_with_client` filters for `checklists` and `notes`.
- Continue gating money fields behind `show_portal_costs`.

**Mobile deep-link mechanic (P1)**
- Read `?focus=` in `ClientPortal.tsx`, scroll to `#focus-{id}` after data load, apply a 1.2s cobalt ring highlight via Motion.

**Visual token bridge (`portalTheme.ts`)**
- Re-exports the freelancer system's surface, hairline, type, and accent tokens scoped under a `.portal-light` root class so the portal stays light-mode locked even if the host page is dark.

**RLS pattern for every new public-schema table**
- Members read/write within their workspace via `get_user_workspace_ids()`.
- Service role full access (portal-view edge function uses it).
- No anon grants — portal access is always token-gated through the edge function.

---

## Sequencing summary

```text
P1  Reframe + IA + visual migration + deep links                (no schema)
P2  Inline Stripe pay + Billing tab promotion                   (no schema)
P3  Weekly update + milestones + share flags on tasks/notes     (schema)
P4  Shared Resources (link-first) + Approvals                   (schema)
P5  Questions + full email/portal deep-link parity              (schema)
P6  Polish, empty-state pass, lazy activity                     (no schema)
```

Each phase is independently shippable. P1 alone changes the portal's perception immediately because the homepage answers the 3 client questions using only data we already have.

---

## What I need from you before starting P1

1. Confirm I can rewrite `ClientPortal.tsx` into the component split above (it's a 961-line file today; splitting is essentially mandatory).
2. Confirm Resources should be a visible tab in P1 (with an "Add resources from your freelancer's tools — Drive, Figma, Loom, Notion…" empty state) **or** hidden until P4. My default: visible stub, sets expectations.
3. Confirm the workspace owner is the right contact to surface in the header. (If you have multi-member workspaces with a designated "client lead," I'll surface that instead — but it'd need a Phase 3 schema bit.)

Approve and I'll start Phase 1.
