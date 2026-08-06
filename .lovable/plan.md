# Unified Client Documents

One document system for every client asset — uploaded files and external links, internal or client-facing — replacing the split between the Docs tab's Files panel and the Portal tab's Shared Resources.

## Information architecture

```text
Client Detail
  Docs tab
    Notes            (unchanged)
    Documents        <- new canonical list (files + links, internal + shared)
      [+ Add Document]  -> modal: Upload File | Add Link -> metadata form
  Portal tab
    (Resources section removed entirely)


Client Portal
  "Documents" tab (was "Resources")
    shows only documents with visibility = shared, grouped by status
    approval actions unchanged
```

A document is one record. Where the bytes live (storage file vs. external URL) is just a `kind` field, not a separate feature.

## Data model

Today's `shared_resources` table already holds link records, approvals (`resource_approvals`), portal payloads, and RLS. Uploaded files have **no** database row at all — they only exist as objects in the `client-files` storage bucket, which is why they carry no metadata.

Plan: promote `shared_resources` into the canonical document table rather than creating a third system.

- Rename `shared_resources` -> `client_documents`, and `resource_approvals.resource_id` -> `document_id` (table renamed to `document_approvals`). Postgres renames preserve data, FKs, and policies.
- New columns on `client_documents`:
  - `visibility text not null default 'internal'` (`internal` | `shared`)
  - `category text` (workspace-configurable, seeded defaults — replaces the earlier tags idea)
  - `lifecycle_state text not null default 'active'` (`active` | `archived`) — independent of approval
  - `approval_state text not null default 'not_required'` (`not_required` | `pending` | `approved` | `rejected`), replacing the overloaded `status` + `needs_approval` pair
  - `document_date date` (editable, defaults to today), `notes text`
  - `file_name text`, `file_size bigint`, `mime_type text` (populated for uploads)
  - `is_pinned boolean not null default false`
  - `updated_by uuid`, `metadata jsonb not null default '{}'`
- Lifecycle and approval never derive from each other: archiving a document does not change its approval state, and an approval decision does not archive anything.
- Categories live in `workspace_settings` under a new `documents` section (`{ categories: string[] }`), seeded with: Proposal, Contract, Retainer, Invoice, Financial, Legal, Brand Assets, Marketing Assets, Sales Assets, Design Files, Creative Assets, Website Assets, Content, Social Media, Photography, Video, Training, Onboarding, Project Deliverables, Reports, Research, Meeting Notes, Client Information, Reference Material, Miscellaneous. Workspaces can add, rename, or hide entries.
- Future-proofing hooks included now: `project_id` link, `metadata jsonb` for generated PDFs / AI output / e-signature envelopes, `source` marker (`manual` | `generated` | `integration`), and soft archive so nothing is destroyed as workflows grow.


## Migration strategy

1. Rename tables/columns and add the new columns; `visibility` backfills to `shared` for every existing resource (they were all client-facing).
2. Backfill file rows: for each object under `client-files/{workspace}/client-{clientId}/`, insert a `client_documents` row with `kind='file'`, `visibility='internal'`, title from the filename (timestamp prefix stripped), `file_path` set to the storage path. Run as a one-time authenticated backfill from an edge function so storage can be listed with the service role; the Docs list also self-heals by showing any orphan storage object that has no row yet.
3. `checklist_item_links` already references `file_path`, which is preserved — no change needed there.
4. Portal edge functions (`portal-view`, `portal-resource-decision`) switch to the new names; the portal response keeps a `documents` key and the client portal tab is relabelled.

## UX

**Add Document modal** — framed as "create a document record", not an upload dialog. One form regardless of source: Document Name, Description, Category (select from workspace list), Source (Upload File / External Link — a segmented control that swaps the file drop zone for a URL field, everything else identical), Date, Visibility (Internal / Shared), Request Client Approval (only enabled when Shared), Notes (optional), and Pin this document. Name auto-fills from the filename or link, and category is remembered from the last document added for that client as a soft default.

**Documents list** — a modern manager, not a spreadsheet. Each row leads with a type-aware icon or thumbnail derived from mime type and link provider: PDF, Word, Spreadsheet, Image (thumbnail preview when available), Video, Figma, Google Drive, Dropbox, Loom, Notion, generic link.

```text
[icon]  Name                       Category    Visibility   Approval    Added by   Updated   [...]
        description snippet
```

Pinned documents render in a pinned group that always sits above the list regardless of sort or grouping. Above that sits a filter bar (search, category, visibility, approval state) plus an Active/Archived toggle, and a "Pending client approval" count chip. Row actions: open, edit, change visibility, request approval, download, pin/unpin, archive. Multi-select enables bulk visibility change, bulk category change, and bulk archive.

## Edge cases

- Switching a document from Shared to Internal while approval is pending resets `approval_state` to `not_required` and keeps the decision history rows.
- Archiving is reversible and never touches approval state; hard delete is a separate, confirmed action that also removes the storage object.
- Storage objects uploaded outside the app appear in the list as unmanaged rows until edited, rather than being hidden.
- Portal shows only `visibility = 'shared'` and `lifecycle_state = 'active'`, never leaking internal titles; signed URLs for shared files are issued by the portal function against the portal token.
- Removing a workspace category leaves existing documents' category strings intact; they surface as an "Uncategorized (legacy)" filter entry.


## Technical notes

- Migration tool for renames/columns/grants/policies; policies follow existing workspace-scoped patterns.
- New `src/data/documentsApi.ts` replaces `sharedResourcesApi.ts` (kept as a thin re-export during the change, then removed).
- New components: `src/components/documents/DocumentsPanel.tsx`, `AddDocumentModal.tsx`, `DocumentRow.tsx`, `DocumentFilters.tsx`.
- `ClientDetail.tsx` Docs tab renders Notes + DocumentsPanel; the `SharedResourcesPanel` import and Portal-tab resources block are removed.
- `ClientPortal.tsx` `ResourcesTab` becomes `DocumentsTab` with the same approval calls against the renamed endpoint.
