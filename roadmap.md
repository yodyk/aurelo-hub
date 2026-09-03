# Roadmap

## Income & Expenses workspace
...
- [x] Add full edit modals and row edit actions for manual/synced income and expenses

## W-2 Income & Withholding Context
- [x] Apply owner-only database tables and RLS for employment sources, paychecks, tax payments, and withholding settings
- [ ] Add employment schedule, YTD-overlap, idempotent paycheck, offset, and reserve utilities
- [ ] Add employment API and preserve confirmed history during future projection regeneration
- [ ] Add owner-only W-2, paycheck, withholding, and estimated-tax-payment UI to Income & Expenses
- [ ] Add context-only employment subtotals, offset breakdown, disclaimers, rate helper, and permission-safe CSV export
- [ ] Add regression fixtures for permissions, YTD overlap, offsets, semimonthly/biweekly schedules, history, and reserve floor
- [ ] Run typecheck, build, fixtures, security linter, and validate remaining scope
