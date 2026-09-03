# Roadmap

## Income & Expenses workspace (in progress)
- [x] Migration: income_entries, expenses, expense_instances, expense_instance_additions, expense_categories (RLS + GRANTs + indexes)
- [x] financeApi + initial source synchronization (projects, retainers, invoices)
- [x] Pure utils: money (decimal-safe), recognition (cash/accrual), recurrence, dedupe
- [ ] Follow-up: source-mutation subscriptions and exact retainer-cycle date generation
- [x] Fixture coverage for utils
- [x] Route `/income-expenses` + sidebar entry
- [x] Page shell, period controls, Actual/Planned toggle, overview band
- [x] Income table + overrides + exclusion
- [x] Expense series/instances/additions
- [x] Filters, URL state, sticky totals, drag-pan, CSV export
- [x] Empty/loading/error/responsive/a11y states
- [x] Build + typecheck + tests

Notes from user corrections: cash/accrual uses dual dates (earned + paid); tax settings live in `workspace_settings` section `finance`; no "Partially Paid" state; currency mismatch entries excluded from totals with a visible review count.
