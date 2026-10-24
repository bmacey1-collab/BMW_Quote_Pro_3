# Beta 7.12 — Scenario Integrity Fixes

- Fixed duplicate scenario incentives by deduplicating incentive merge paths during program sync, scenario edits, and legacy deal migration.
- Reapplying the same BMW program no longer adds duplicate incentives to any scenario.
- Saving and reloading deals now preserves a single instance of each scenario incentive (backward-compatible with older saved deals).
- Scenario editor now regenerates automatic scenario titles when term/mileage inputs change.
- Custom scenario titles are preserved and are not overwritten by automatic naming.
- Custom lease mileage now overrides the standard mileage in automatic titles and the Manager Worksheet Annual Mileage row, including One-Pay Lease scenarios and printed output. Clearing Custom Miles restores the standard mileage label; calculations and stored mileage fields are unchanged.
- Finance scenarios now reload term-appropriate program APR values when the term changes.
- BMW Select scenarios now reload term-appropriate APR and balloon values when the term changes.
- Live scenario preview updates now reflect automatic title and term-based rate changes before save.
- Removed dead incentive code encountered in the bug-fix path to reduce duplicate logic risk.
