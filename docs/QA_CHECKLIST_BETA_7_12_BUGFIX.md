# BMW Quote Pro 3.0 Beta 7.12 - Bug-Fix QA Checklist

Scope: Verify bug-fix pass only (no redesign), covering:
- BUG 1: Incentive duplication
- BUG 2: Automatic scenario title regeneration
- BUG 3: Finance/BMW Select term-based rate reload

## Preconditions

1. Open Deal Builder.
2. Ensure at least one active program exists with distinct term/rate values for:
   - Finance (example: 60 term APR differs from 72 term APR)
   - BMW Select (example: 60 term APR/balloon differs from 72 term APR/balloon)
3. Ensure a vehicle is set (year/model) so matching programs can resolve.
4. Start from a new deal.

## Test Set A - Incentive Lifecycle (BUG 1)

### A1. Program Apply Adds Incentives Once

1. Add Lease, Finance, BMW Select scenarios.
2. Apply a matching program via Program Picker.
3. Open Selected Incentives panel.

Expected:
- Each scenario has only one instance of each eligible program incentive.
- Incentive total equals the sum of unique eligible incentives plus scenario extra incentive.

### A2. Re-Apply Same Program Does Not Duplicate

1. Re-open Program Picker.
2. Re-apply the same program to the same deal.

Expected:
- Incentive counts do not increase.
- Preview indicates already-present incentives rather than adding duplicates.

### A3. Edit Scenario and Save Does Not Duplicate

1. Edit each scenario and modify a non-incentive field (for example term, cash adjustment).
2. Save scenario.

Expected:
- Incentive list remains unique (no duplicated rows).

### A4. Add Cash Scenario After Others Exist

1. With Lease/Finance/Select already present, add Cash scenario.
2. Inspect incentives on all scenarios.

Expected:
- Existing scenarios do not receive duplicated incentives.
- Cash scenario only has incentives eligible for cash/all.

### A5. Save and Reload Deal

1. Save deal.
2. Open Saved Deals and reload the same deal.
3. Inspect incentives again.

Expected:
- No duplicate incentives introduced by load/hydration.

## Test Set B - Automatic Scenario Title Behavior (BUG 2)

### B1. Auto-Named Lease Updates on Edit

1. Create default Lease scenario (auto title).
2. Change term or mileage.

Expected:
- Title updates automatically (for example term/mileage reflected).

### B2. Auto-Named Finance Updates on Edit

1. Create default Finance scenario (auto title).
2. Change term.

Expected:
- Title updates automatically (for example 60mo to 72mo Finance).

### B3. Auto-Named BMW Select Updates on Edit

1. Create default BMW Select scenario (auto title).
2. Change term.

Expected:
- Title updates automatically.

### B4. Custom Title Is Preserved

1. Rename a scenario to a custom title.
2. Edit term and save.

Expected:
- Custom title remains unchanged.
- Only scenario economics/fields update.

## Test Set C - Term-Based Program Rate Reload (BUG 3)

### C1. Finance Rate Reload by Term

1. Edit Finance scenario tied to a program.
2. Change term from one known value to another (for example 60 to 72).
3. Observe Buy APR and Used/Customer APR.

Expected:
- APR fields update to the program values associated with the selected term.
- Save/re-open keeps the updated rates.

### C2. BMW Select Rate + Balloon Reload by Term

1. Edit BMW Select scenario tied to a program.
2. Change term (for example 72 to 60 or 60 to 72).
3. Observe Buy APR, Used/Customer APR, and Balloon %.

Expected:
- APR and Balloon update to term-specific program values.
- Save/re-open keeps the updated values.

### C3. Lease Integrity Check

1. Edit Lease term/miles and verify lease-specific fields.

Expected:
- Lease MF/residual flow remains intact.
- No cross-over from Finance/Select rate logic.

## Regression Safety Checks

1. Quote page renders selected scenarios correctly.
2. Manager Worksheet reflects accepted scenario without duplicate incentives.
3. Print views remain functional for Customer Quote and Manager Worksheet.
4. Local save/load remains backward compatible with existing deals.

## Pass Criteria

- No duplicate incentives appear after apply, re-apply, edit, add-scenario, save, or reload.
- Auto titles regenerate for auto-named scenarios and never overwrite custom titles.
- Finance and BMW Select rates (and Select balloon) reload correctly when term changes.
- Lease, Finance, BMW Select, and Cash all remain operational.
