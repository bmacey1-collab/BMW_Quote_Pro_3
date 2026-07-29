# BMW Quote Pro 3.0 Beta 7.9

## Saved Deals
- Added instant search across customer, co-buyer, email, phone, stock number, VIN, year, make, model, salesperson, quote number, deal type, scenario name, and notes.
- Added quick filters for My Deals, Lease, Finance, Select, Cash, This Month, and Last 90 Days.
- Added sorting by newest, oldest, customer, vehicle, payment, deal type, and salesperson.
- Added a visible result count.
- Added deal type, payment, stock number, and salesperson details to saved-deal cards.
- Added a 30-second deal cache so repeated page visits do not keep downloading and rebuilding the same list.

## Recent Deals
- Dashboard continues to show the eight most recently saved deals.
- Recent cards now include deal type, payment, stock number, and salesperson.
- Refresh forces a fresh database read.

## Add Incentive Performance
- The incentive dialog opens immediately with a loading message instead of freezing the browser.
- Matching and list rendering are deferred until the dialog is visible.
- Only the latest matching program month is loaded during normal deal selection instead of rebuilding incentives from every historical month.
- Applied-incentive checks now use a Set lookup rather than repeatedly scanning the full list.
