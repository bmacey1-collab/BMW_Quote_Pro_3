# BMW Quote Pro 3.0 Alpha 1

This is a separate development project. Continue using BMW Quote Pro 2.4.1 for live deals.

## Alpha 1

- Dashboard landing page
- Recent Quotes preserved
- New quick actions
- Colored flexible-scenario preview
- Program Center foundation
- Manager Worksheet foundation
- Existing calculator retained under Deal Builder during development

The scenario cards are design previews in Alpha 1. They are not yet connected to the calculation engine.

Recommended separate deployment:
- GitHub repository: `BMW_Quote_Pro_3_Dev`
- Netlify development site
- Separate Supabase test project


## 3.0.0 Alpha 2 — Working Scenario Engine

Build date: 2026-07-24

### Working in this Alpha

- Lease, Finance, Cash Purchase, and BMW Select scenario calculations
- Add, edit, rename, duplicate, and delete scenarios
- Maximum of six working scenarios
- Select any three for presentation
- Required-field validation, including intentional zero sales tax
- Roll Payment by solving for:
  - Selling price
  - Cash up front
  - Trade allowance
- First/last name and co-buyer
- Salesperson dropdown
- Stock, VIN, year, make, model, and mileage
- Optional NHTSA VIN decoding
- Trade allowance, ACV, payoff, equity, and gross
- Lease equity as cap reduction, cash back, or split
- Current-payment comparison
- Optional signature setting
- Manager notes and worksheet preview
- Customer quotes do not show estimated interest or total payments

### Important

This remains a development Alpha. Continue using Version 2.4.1 for live deals until the scenario engine, database schema, printing, and backup/restore process are fully tested.


## 3.0.0 Alpha 3 — Dealer Defaults & Quote Outputs

Build date: 2026-07-24

### Added

- Dealer Settings with default tax, fees, fee treatment, reserve share, salesperson list, and disclaimer
- Discount entry instead of selling price
- Calculated adjusted selling price
- Payment Roller solves for dealer discount
- Fee treatment: upfront, capitalized, or not applicable
- Lease due-upfront includes first payment, upfront fees, cash down, and tax on cash reduction
- Trade equity is not taxed
- Optional APR, money factor, residual, balloon, and fee-detail display
- Real customer quote page from the selected scenarios
- Printable customer quote
- Printable manager worksheet
- No total interest or total-of-payments display on the customer quote

This remains a development Alpha. Continue comparing calculations against Version 2.4.1 before using it for live customer deals.


## 3.0.0 Alpha 4 — Programs, Incentives & Lease Enhancements

Build date: 2026-07-24

### Added

- Automatic residual percentage adjustment by included mileage:
  - 7,500 miles: +4%
  - 10,000 miles: +3%
  - 12,000 miles: +2%
  - 15,000 miles: no adjustment
- In-service mileage residual deduction after the first 500 miles
- Custom mileage residual deduction
- Individual incentives with quote-type applicability
- Cash Purchase scenario template
- One-Pay Lease template
- One-Pay money-factor reduction field loaded from Program Center
- Monthly Program Center with:
  - Month/model history
  - Confirmed, carried-forward, management, and expired status
  - Copy-prior workflow
  - Lease, Finance, and BMW Select values
  - Program incentives
  - Program loading into scenarios

### Data safety

Alpha 4 program records are stored in browser local storage for development. They do not delete prior months automatically. Supabase program tables and tested backup/restore will be added before production use.


## 3.0.0 Alpha 5 — Clean Scenario Build

- Fixed three function-hoisting recursion errors introduced in Alpha 4.
- Default Lease, Finance, and BMW Select scenarios load again.
- Add Scenario, Cash Purchase, and One-Pay Lease work again.
- Removed the complete Version 2.4 legacy calculator and legacy results.
- Version 3 now uses only the new Deal Builder, Customer Quote, Program Center, and Manager Worksheet.
