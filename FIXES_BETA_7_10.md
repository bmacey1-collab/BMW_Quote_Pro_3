# Beta 7.10 — Incentive Performance Rewrite

- Rebuilt the Add Incentive picker using cached program matches and DOM fragments.
- Removed the full program scan from repeated dialog opens.
- Add Incentive now opens only after its lightweight list is ready.
- Applying or removing an incentive updates the incentive area immediately, then recalculates scenario cards and the worksheet on the next browser frame.
- Added a direct in-memory lookup for selected incentives instead of repeatedly searching all programs.
- Program changes automatically clear the incentive match cache.
