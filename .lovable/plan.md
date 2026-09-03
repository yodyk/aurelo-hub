# W-2 Income & Withholding Context

Add employment (W-2) income and tax-payment tracking to Income & Expenses, kept strictly separate from business revenue and from Aurelo's business analytics.

## Answer to the question you raised

Yes, it is worth adding — but only under the model you described. Regular paycheck withholding is a prepayment against the salary's own tax, not surplus that can quietly shrink a freelance reserve. So Aurelo will display it for reference and only offset the reserve with amounts the user explicitly designates: extra per-paycheck withholding intended for non-wage income, recorded estimated tax payments, and a deliberate advanced override.

## What gets built

### 1. Employment income sources
Add one or more jobs, each with: employer name, gross amount (annual salary or per-paycheck), pay frequency (weekly, biweekly, semimonthly, monthly, annual/manual), start date, optional end date, next paycheck date, notes, active/inactive.

Withholding context per job:
- YTD gross wages and "YTD through" date
- YTD federal income tax withheld
- Optional YTD state/local income tax withheld
- Additional federal withholding per paycheck, with a checkbox: "designated to cover freelance or other non-wage income"
- Optional additional state withholding per paycheck (same designation flag)
- Optional projected remaining withholding

FICA, insurance, retirement and other payroll deductions are deliberately out of scope and never enter the offset math.

### 2. Paycheck generation
Future paychecks generate from the schedule as **Projected**; entered or user-confirmed historical paychecks are **Actual**. Generation is idempotent via a stable occurrence key per job and pay date. Schedule generation starts strictly after the "YTD through" date, so YTD totals and generated paychecks can never overlap.

### 3. Tax payments & withholding section
Record estimated tax payments: payment date, amount, tax year, jurisdiction (Federal / State / Local / Other), period label, notes. Period labels are presented as user labels, not official IRS periods.

### 4. Layout inside Income & Expenses
Three separated areas, each with its own subtotal:
- Business Income
- Employment Income
- Tax Payments & Withholding

Employment rows carry an "Employment / W-2" source type and never roll into Business Income.

Overview band relabelled to:

```text
Business Income
Business-Use Expenses
Estimated Business Profit
Business Tax Reserve Before Offsets
Additional Withholding & Estimated Payments
Remaining Suggested Reserve
```

Plus a secondary, clearly labelled "Combined Gross Income Context" (Business Income + W-2 gross) — context only, never described as taxable income, AGI, or liability.

### 5. Reserve math

```text
Business Tax Reserve Before Offsets = max(0, Estimated Business Profit x User Tax Rate)

Remaining Suggested Reserve = max(0,
    Business Tax Reserve Before Offsets
  - Additional Withholding Designated for Other Income
  - Estimated Tax Payments (matching tax year)
  - Other Withholding Available (advanced manual override)
)
```

Regular federal/state withholding is displayed for reference only and never subtracted. Result is floored at zero.

### 6. Copy, tooltips, disclaimer
- Tooltip on the offsets figure: "Regular paycheck withholding generally covers your employment income. Aurelo only applies additional withholding you identify for freelance or other income to this reserve estimate."
- Advanced override helper: "Use this only if you have determined that part of your regular withholding exceeds what is needed for your employment income, such as after using a tax professional or withholding estimator."
- Section disclaimer: "Aurelo does not calculate your total household tax liability. Salary, filing status, deductions, credits, and other income can change what you owe. This view is for planning only."
- IRS Tax Withholding Estimator link shown when jurisdiction is United States.

## Technical notes

- **Schema:** three new workspace-scoped tables — `employment_sources`, `employment_paychecks` (unique on workspace + source + occurrence key), `tax_payments`. Each gets GRANTs to `authenticated`/`service_role`, RLS enabled, and workspace-membership policies matching the existing finance tables. Amounts use `numeric(14,2)`; all arithmetic goes through the existing integer-cents helpers in `src/lib/finance/money.ts`.
- **Isolation:** employment data stays out of `income_entries`, so `syncIncomeSources`, client aggregates, dashboard revenue, client dependency, project profitability, utilization and effective rate are untouched by construction. No changes to those code paths.
- **Recognition:** paychecks recognize on pay date; cash/accrual toggling does not apply to wages. Employment rows respect the selected period and Actual / Actual + Planned mode the same way business rows do.
- **Code:** extend `src/lib/finance/types.ts`, add `src/lib/finance/employment.ts` (paycheck schedule generation, offset math), extend `src/data/financeApi.ts` with employment and tax-payment CRUD, and add `EmploymentSection` / `TaxPaymentsSection` components plus modals under `src/components/finance/`.
- **Tests:** fixtures covering pay-frequency schedule generation, YTD-cutover with no overlap, idempotent regeneration, offset math with designated vs ordinary withholding, and the zero floor.

## Out of scope

Household tax liability, filing status, deductions, credits, FICA modelling, and any claim of official tax calculation.
