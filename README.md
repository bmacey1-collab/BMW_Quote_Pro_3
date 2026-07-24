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
