# BMW Quote Pro 3.0 Beta 4

Beta 1 is based on the clean Version 3 architecture and includes the complete Alpha 9 workflow with a repaired BMW program PDF importer.

## PDF import

1. Open Program Center.
2. Click **Import BMW Program PDF**.
3. Choose the PDF.
4. Watch the status beside the button as the library and pages load.
5. Review all detected rows.
6. Correct or deselect questionable rows.
7. Click **Save Approved Programs**.

The importer dynamically loads Mozilla PDF.js in the browser. The selected PDF is processed locally in the browser and is not uploaded to an outside extraction service.

Imported rows are marked **Needs Review** until confirmed.

## Included workflow

- Lease, One-Pay Lease, Finance, Cash and BMW Select
- Base and customer rates
- Automatic lease residual adjustments
- Program Center with incentives
- PDF import review
- Quick missing-program entry
- Incentive selection popup
- Scenario card reordering
- Accepted-deal manager worksheet
- Client grouping and multiple quotes per person
- Autosave and draft restore
- Local save plus optional Supabase deal synchronization

Continue using Version 2.4.1 for live work until Beta calculations and importing have been tested against actual BMW program documents.


## Beta 2 — Incentive Selection Fix

- Apply Selected is disabled until at least one incentive is checked.
- Empty matching programs clearly explain why no incentive can be applied.
- Added Add Incentive to This Program directly inside the selection workflow.
- New incentives save to the matching Program Center record.
- Newly added incentives are automatically checked and ready to apply.
- Applied incentives display a Remove Incentive button in Deal Builder.
- Removing an incentive recalculates scenarios, refreshes the Manager Worksheet, and autosaves the draft.
- Selected program incentives retain their source program and source incentive IDs.


## Beta 3 — Residual Import Fix

- Residual parsing now accepts formats such as `55%`, `55 %`, and `55.0%`.
- Imported residuals are explicitly labeled as the 36-month/15,000-mile base residual.
- The review table flags every missing or invalid residual.
- Rows with missing residuals start deselected.
- Selected rows cannot be saved until their residual is corrected.
- Residual edits update the review status immediately.
- Normal lease mileage adjustments continue to be applied later in the scenario calculation.


## Beta 4 — Shared Program Center

Run `supabase/002_v3_programs_and_incentives.sql` in the BMW Quote Pro 3 Dev SQL Editor.

After deploying Beta 4:

1. Open the app on the work laptop where the programs currently appear.
2. Confirm Database shows that you are signed in.
3. Open Program Center.
4. Click **Upload Local Programs** once.
5. Wait for the successful upload message.
6. Open the app on the phone or home computer and click **Sync Programs**.

Program Center now reads and writes:

- `v3_programs`
- `v3_program_incentives`

Local storage remains a cache so the program can still open quickly. Supabase is the shared source across devices.
