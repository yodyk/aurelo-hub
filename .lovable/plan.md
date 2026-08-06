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
  - `doc_type text` (free text, workspace-configurable list)
  - `tags text[] not null default '{}'`
  - `document_date date` (editable "date added" / effective date, defaults to today)
  - `file_name text`, `file_size bigint`, `mime_type text` (populated for uploads)
  - `updated_by uuid`
  - `archived_at timestamptz` (soft delete, keeps approval history intact)
- Keep `status`, `needs_approval`, `sort_order`, `project_id` — the approval workflow is reused as-is, only gated on `visibility = 'shared'`.
- Document types live in `workspace_settings` under a new `documents` section (`{ types: string[] }`) seeded with Proposal, Contract, Retainer, Invoice, Scope of Work, Creative Brief, Brand Assets, Design Files, Legal, Tax, Other. Users add their own from the modal.
- Future-proofing hooks included now: `project_id` link, `metadata jsonb` for generated/e-signature payloads, and `archived_at` so nothing is lost when workflows evolve.

## Migration strategy

1. Rename tables/columns and add the new columns; `visibility` backfills to `shared` for every existing resource (they were all client-facing).
2. Backfill file rows: for each object under `client-files/{workspace}/client-{clientId}/`, insert a `client_documents` row with `kind='file'`, `visibility='internal'`, title from the filename (timestamp prefix stripped), `file_path` set to the storage path. Run as a one-time authenticated backfill from an edge function so storage can be listed with the service role; the Docs list also self-heals by showing any orphan storage object that has no row yet.
3. `checklist_item_links` already references `file_path`, which is preserved — no change needed there.
4. Portal edge functions (`portal-view`, `portal-resource-decision`) switch to the new names; the portal response keeps a `documents` key and the client portal tab is relabelled.

## UX

**Add Document modal** — step 1 picks Upload File or Add Link; step 2 is the same metadata form for both: Title (auto-filled from filename or link title), Type (combobox with create-new), Description, Document date, Tags, Visibility toggle, and — when shared — "Request client approval".

**Documents list** — a scannable table replacing the current card stack:

```text
[icon] Name / description        Type       Visibility   Status      Added by   Date      ...
```

with a filter bar (search, type, visibility, status), grouping toggle (by type or by date), row actions (open, edit metadata, change visibility, request approval, download, archive), and empty/loading states. Selecting rows enables bulk visibility change and bulk archive.

Small additions worth having: a "Pending client approval" summary chip at the top, inline provider badge for links (Figma/Drive/Loom detection already exists), and last-updated relative timestamps.

## Edge cases

- Making a document internal while an approval is pending clears `needs_approval` and records the change; existing approval history is retained.
- Deleting a file document removes the storage object and archives the row so approval history survives.
- Storage objects uploaded outside the app appear as unmanaged rows until edited; the list surfaces them rather than hiding them.
- Portal shows only `visibility = 'shared'` and never leaks internal titles; the signed-URL path for shared file documents is issued by the portal function using the portal token.
- Deleting a workspace document type leaves existing documents' type strings intact (free text, not an enum).

## Technical notes

- Migration tool for renames/columns/grants/policies; policies follow existing workspace-scoped patterns.
- New `src/data/documentsApi.ts` replaces `sharedResourcesApi.ts` (kept as a thin re-export during the change, then removed).
- New components: `src/components/documents/DocumentsPanel.tsx`, `AddDocumentModal.tsx`, `DocumentRow.tsx`, `DocumentFilters.tsx`.
- `ClientDetail.tsx` Docs tab renders Notes + DocumentsPanel; the `SharedResourcesPanel` import and Portal-tab resources block are removed.
- `ClientPortal.tsx` `ResourcesTab` becomes `DocumentsTab` with the same approval calls against the renamed endpoint.
