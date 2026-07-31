# BMW Quote Pro — Copilot Instructions

## Project purpose

BMW Quote Pro is a browser-based automotive desking and payment presentation application.

It is designed from the perspective of an experienced dealership sales manager and client advisor. The application must make it easier to:

- Structure automotive transactions accurately.
- Compare Lease, Retail Finance, BMW Select, Cash, and One-Pay Lease scenarios.
- Present understandable payment options to customers.
- Give managers a detailed and verifiable worksheet.
- Store dealership programs, rates, residuals, incentives, customers, and quotes.
- Reduce repetitive calculations and prevent deal-structure mistakes.

This is a real dealership workflow application, not a demonstration calculator.

## Product priorities

When making decisions, use this priority order:

1. Calculation accuracy
2. Preservation of existing data
3. Clear dealership workflow
4. Customer-facing clarity
5. Manager verification
6. Ease of use
7. Visual appearance
8. New features

Never sacrifice calculation accuracy or stored data for visual convenience.

## Application architecture

BMW Quote Pro is primarily a client-side browser application.

Important project areas include:

- `index.html` — application structure and interface
- `js/app.js` — primary application logic, calculations, state, and UI behavior
- `css/app.css` — application styling
- `css/print.css` — printed quotes and manager worksheets
- `supabase/` — database setup and shared-data support
- `docs/` — documentation, release history, and implementation notes
- `README.md` — project overview

The application uses browser storage for much of its local data and may use Supabase for shared or persistent data.

Do not introduce a framework, build system, package manager, or major architectural rewrite unless specifically requested.

## Core transaction types

The application supports or is intended to support:

- Lease
- Retail Finance
- BMW Select balloon financing
- Cash
- One-Pay Lease

Each transaction type has different calculation requirements. Do not assume that a rule applying to one transaction type automatically applies to another.

## Calculation safety rules

Calculations are business-critical.

Before changing any calculation:

1. Locate the complete existing calculation path.
2. Identify every input used by the calculation.
3. Identify every screen, quote, worksheet, saved record, and print view using the result.
4. Preserve existing behavior unless the issue specifically requests a change.
5. Explain the old and new formulas.
6. Test representative examples.
7. Check zero values, negative equity, positive equity, no trade, cash down, fees paid upfront, and fees financed.
8. Avoid silently rounding intermediate values.
9. Apply display rounding only where appropriate.
10. Never invent a tax, lease, finance, residual, incentive, or accounting rule.

If a business rule is unclear, stop and request clarification.

## Trade handling

Keep these concepts separate:

- Trade value
- Trade payoff
- Trade equity
- Trade allowance
- Taxable trade credit
- Cash back
- Cap-cost reduction
- Amount financed

Trade equity and trade tax credit are not the same thing.

A trade may reduce the amount financed without necessarily reducing the taxable amount.

The planned Trade Tax Credit control must affect the taxable amount only. It must not remove the trade equity from the transaction.

Do not automatically grant a sales-tax credit to every trade or every transaction type.

## Tax handling

Tax logic must be explicit and reviewable.

Do not hard-code an assumed tax treatment when a configurable option is required.

Keep these concepts separate:

- Tax rate
- Taxable vehicle amount
- Taxable fees
- Tax on cash down or cap-cost reduction
- Tax collected upfront
- Tax included in a monthly payment
- Trade tax credit
- Tax-exempt transaction

A zero tax rate must be accepted as a valid value when the transaction is tax exempt.

When modifying tax logic, provide a calculation breakdown that allows a manager to verify the taxable amount and resulting tax.

## Lease rules

Lease calculations may include:

- Adjusted capitalized cost
- Capitalized-cost reduction
- Residual value
- Money factor
- Depreciation charge
- Rent charge
- Monthly sales tax
- Acquisition fee
- Mileage adjustment
- Upfront charges
- One-pay calculation

Keep residual percentage and residual dollar value distinct.

Customer-facing quotes should normally show the residual value rather than emphasizing the residual percentage unless the user selects otherwise.

Do not treat a lease like a conventional retail loan.

## Retail Finance rules

Retail Finance calculations may include:

- Selling price
- Discounts
- Incentives
- Trade value
- Trade payoff
- Cash down
- Taxable amount
- Fees
- Amount financed
- APR
- Finance term
- Monthly payment
- Current-payment comparison

Do not display total interest on the customer quote unless specifically requested.

## BMW Select rules

BMW Select is balloon financing, not a lease.

Select calculations may include:

- Selling price
- Discounts
- Incentives
- Trade
- Cash down
- Tax
- Fees
- Amount financed
- APR
- Term
- Balloon percentage
- Balloon dollar amount
- Monthly payment
- Final balloon payment

Keep the balloon percentage and balloon dollar amount distinct.

Do not use a lease money factor or lease depreciation formula for BMW Select.

## Incentives and discounts

Keep these concepts distinguishable:

- Dealer discount
- Manufacturer incentive
- Customer cash
- Loyalty incentive
- Conquest incentive
- Program-specific incentive
- Combined discount and incentive display

An option may allow incentives to be visually combined with the discount, but the underlying records should remain identifiable whenever possible.

Do not duplicate an incentive when loading, selecting, saving, or printing a deal.

## Customer Quote

The Customer Quote should be:

- Easy for a customer to understand.
- Visually clean.
- Focused on vehicle, payment, term, money due, and important transaction details.
- Free from unnecessary internal dealership information.
- Suitable for printing or saving as a PDF.
- Able to compare selected scenarios when requested.

Do not expose internal profit, reserve, confidential notes, or manager-only information on the Customer Quote.

## Manager Worksheet

The Manager Worksheet should be detailed and verifiable.

It may include:

- Customer and salesperson information
- Vehicle information
- Selling price and discount
- Incentives
- Trade details
- Fees
- Taxes
- Cash due
- Amount financed
- APR or money factor
- Residual or balloon
- Payment
- Calculation verification
- Notes
- Accepted scenario

The Manager Worksheet may show information that should not appear on the Customer Quote.

## Data protection

Existing customer, quote, program, dealership, and configuration data must be protected.

When changing saved-data structures:

- Maintain backward compatibility when practical.
- Use defaults for missing older fields.
- Do not erase browser storage.
- Do not rename storage keys casually.
- Do not delete Supabase columns or tables without an explicit migration plan.
- Do not overwrite saved records merely because a new field is absent.
- Document any schema or storage change.

## Coding standards

Prefer:

- Clear function and variable names.
- Small, focused changes.
- Reuse of existing helpers.
- Guard clauses and validation.
- Comments explaining dealership-specific business rules.
- Consistent formatting with the surrounding code.
- Minimal dependencies.
- Browser-compatible JavaScript.

Avoid:

- Large unrelated rewrites.
- Duplicate calculation logic.
- Inline business formulas scattered across event handlers.
- Unexplained constants.
- Silent error handling.
- Destructive database changes.
- Changing working behavior outside the requested issue.
- Fabricating missing business requirements.

When practical, move shared calculations into reusable functions so the screen, saved quote, Customer Quote, and Manager Worksheet use the same source of truth.

## UI behavior

Changes should work on desktop and mobile.

Preserve:

- Existing transaction cards
- Scenario selection
- Print behavior
- Saved quote behavior
- Program Center behavior
- Required-field validation
- Current color identity for transaction types

Transaction colors currently follow the general product identity:

- Lease — BMW blue
- Retail Finance — green
- BMW Select — orange

Payment text must remain readable against its background.

## Printing

Always review both:

- Customer Quote printing
- Manager Worksheet printing

Avoid unexpected second pages, clipped sections, hidden totals, or printed controls.

Interactive buttons and editing controls should normally be hidden in print layouts.

Do not assume that a screen layout will automatically print correctly.

## Versioning and documentation

The active development branch may contain an unreleased version.

When an issue specifically requests a version update:

- Update the visible application version consistently.
- Update `README.md` when appropriate.
- Update the changelog or release notes.
- Do not leave conflicting version numbers in different files.

Do not change the version number for every minor edit unless requested.

## Git and issue workflow

Development should occur on a feature or beta branch, not directly on `main`.

For each issue:

1. Read the issue carefully.
2. Inspect relevant code before editing.
3. State the proposed implementation.
4. Make only the required changes.
5. Report every modified file.
6. Explain calculation or data changes.
7. Provide manual testing steps.
8. Identify unresolved questions or risks.
9. Allow the user to review changes before committing.

Do not merge into `main` automatically.

Do not create a release automatically.

Do not push destructive changes without explicit approval.

## Agent behavior

Before editing code, summarize:

- What the issue requests
- Which files appear relevant
- Which calculations or stored data may be affected
- Any unclear requirements

After editing, summarize:

- Files changed
- Behavior changed
- Behavior intentionally preserved
- Testing completed
- Testing still needed
- Risks or assumptions

When uncertain, ask a focused question instead of guessing.

The owner of this project understands dealership operations and has final authority over all product and calculation decisions.