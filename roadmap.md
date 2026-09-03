# Roadmap

## Income & Expenses workspace (in progress)
- [ ] Migration: income_entries, expenses, expense_instances, expense_instance_additions, expense_categories (RLS + GRANTs + indexes)
- [ ] financeApi + source synchronization (projects, retainers, invoices)
- [ ] Pure utils: money (decimal-safe), recognition (cash/accrual), recurrence, dedupe
- [ ] Vitest coverage for utils
- [ ] Route `/income-expenses` + sidebar entry
- [ ] Page shell, period controls, Actual/Planned toggle, overview band
- [ ] Income table + overrides + exclusion
- [ ] Expense series/instances/additions
- [ ] Filters, URL state, sticky totals, drag-pan, CSV export
- [ ] Empty/loading/error/responsive/a11y states
- [ ] Build + typecheck + tests

Notes from user corrections: cash/accrual uses dual dates (earned + paid); tax settings live in `workspace_settings` section `finance`; no "Partially Paid" state; currency mismatch entries excluded from totals with a visible review count.
