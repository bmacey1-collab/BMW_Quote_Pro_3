# BMW Quote Pro 3.0 Beta 7.12 - Bug-Fix QA Results

Date: 2026-08-08
Scope: BUG 1, BUG 2, BUG 3 verification in Deal Builder runtime.
Reference checklist: docs/QA_CHECKLIST_BETA_7_12_BUGFIX.md

## Summary

- Overall result: PASS
- Bugs verified: 3 of 3
- Scenario types covered: Lease, Finance, BMW Select, Cash

## Results Matrix

| ID | Test | Result | Evidence |
|---|---|---|---|
| A1 | Program apply adds incentives once | PASS | Per-scenario incentive rows remained 1 each, total stayed $4,000.00 |
| A2 | Re-apply same program does not duplicate | PASS | Before and after re-apply: each scenario had 1 incentive row, total unchanged at $4,000.00 |
| A3 | Edit/save scenario does not duplicate incentives | PASS | Scenario edits and saves preserved 1 incentive row per scenario |
| A4 | Cash scenario does not duplicate others | PASS | Cash retained single eligible incentive; other scenarios unchanged |
| A5 | Save/reload does not duplicate incentives | PASS | Snapshot before save/open and after open matched exactly: 1 row per scenario, $4,000.00 total |
| B1 | Lease auto title regenerates | PASS | 36mo Lease 10k miles -> 48mo Lease 12k miles while editing |
| B2 | Finance auto/custom title behavior | PASS | Custom title My Custom Finance preserved through term edits |
| B3 | Select auto title regenerates | PASS | 60mo BMW Select -> 72mo BMW Select on term change |
| B4 | Custom title not overwritten | PASS | My Custom Finance remained custom (nameSource custom) |
| C1 | Finance term rate reload | PASS | Term 60 -> 72 changed buyApr/apr 2.99 -> 3.49 and persisted after save/reopen |
| C2 | Select term rate and balloon reload | PASS | Term 60 -> 72 changed buyApr/apr 4.99/5.49 -> 5.49/5.49 and balloon 48 -> 45, persisted after save/reopen |
| C3 | Lease integrity check | PASS | Lease remained lease-specific; no finance/select rate-field crossover observed |

## Notable Observations

1. Program re-apply can normalize scenario defaults (for example lease/select term) but did not create incentive duplicates.
2. Live edit updates for title and term-based rates are now visible before save and remain after save/reopen.

## Residual Risk

1. No automated test suite exists for scenario title/rate/incentive lifecycle coupling; validation is currently manual/runtime.
2. Dense event-binding sections in js/app.js increase regression risk for future UI behavior changes.
