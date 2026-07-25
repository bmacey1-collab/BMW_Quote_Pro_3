# BMW Quote Pro 3.0 Beta 1

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
