# BMW Quote Pro 3.0 Alpha 6

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
