# BMW Quote Pro 3.0 Alpha 8

Build date: 2026-07-24

Alpha 6 is a clean rewrite. It does not load the Version 2 calculator, Version 2 results renderer, or Version 2 save routines.

## Working foundation

- Dashboard and recent saved deals
- Independent Deal state
- Independent Scenario state
- Lease, One-Pay Lease, Finance, Cash and BMW Select calculations
- Automatic mileage residual adjustments
- In-service and custom-mile residual deductions
- Individual incentives by quote type
- Payment Roller
- Customer Quote renderer
- Manager Worksheet renderer
- Dealer Settings
- Program Center
- Local save/load
- Optional Supabase save/load through the new `v3_deals` JSONB table

## Supabase

Run `supabase/001_v3_clean_deals.sql` in the Version 3 development project.

Alpha 6 always saves locally first. When connected and signed in, it also saves the same complete deal object to Supabase.

Continue using Version 2.4.1 for live customer work until calculation parity and printing are fully tested.


## Alpha 7

- Manager Worksheet lists every incentive, amount, applicable quote type, and program code.
- Manager Worksheet includes total incentives and scenario-specific applied incentive totals.
- Added an option to combine dealer discount and incentives on the customer quote.
- The combine option changes presentation only; calculations remain unchanged.


## Alpha 8

- Added Base/Buy Money Factor and Used/Customer Money Factor.
- Added Buy APR and Used/Customer APR for Finance and BMW Select.
- Manager Worksheet shows money-factor and APR markup.
- Manager Worksheet includes a complete due-upfront breakdown for each scenario.
- Added customer email, phone, persistent client IDs, and quote counts.
- Saved deals are grouped by client, allowing multiple vehicles and quotes under one customer.
- Added automatic local draft saving after meaningful changes.
- Drafts restore automatically when the app is reopened.
- Manual Save Deal remains the permanent save and Supabase synchronization action.
