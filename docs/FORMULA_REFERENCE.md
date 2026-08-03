# BMW Quote Pro Formula Reference

This document defines every financial calculation used by BMW Quote Pro.

The formulas in this document are the official business rules for the application.

If code differs from this document, the discrepancy should be reviewed before changes are accepted.

---

# General Rules

## Currency

Internal calculations should maintain full precision.

Only displayed values should normally be rounded to two decimals unless otherwise required.

---

## Tax

Tax calculations must always identify:

- Taxable Amount
- Tax Rate
- Sales Tax

Tax calculations must never be hidden inside unrelated formulas.

---

## Trade

Trade calculations must distinguish:

- Trade Value
- Trade Payoff
- Trade Equity
- Trade Tax Credit
- Cash Back
- Cap Reduction

These values are not interchangeable.

---

# Vehicle Pricing

## MSRP

Manufacturer Suggested Retail Price

Input by user.

---

## Dealer Discount

Dealer reduction from MSRP.

---

## Incentives

Manufacturer programs.

Dealer discounts and incentives remain separate values even when displayed together.

---

## Adjusted Selling Price

Adjusted Selling Price

= MSRP

− Dealer Discount

− Incentives

---

# Trade

## Trade Equity

Trade Equity

= Trade Value

− Trade Payoff

---

## Net Trade Effect

Net Trade Effect depends on:

- Equity Method
- Cash Back
- Cap Reduction

Never assume all trade equity becomes a down payment.

---

# Tax

## Taxable Amount

Default

Taxable Amount

= Selling Price

− Trade Tax Credit

+ Taxable Fees

When Trade Tax Credit is disabled:

Taxable Amount

= Selling Price

+ Taxable Fees

Trade Equity still affects financing.

Trade Tax Credit affects taxation only.

---

## Sales Tax

Sales Tax

= Taxable Amount

× Tax Rate

---

# Retail Finance

## Amount Financed

Amount Financed

=

Selling Price

+ Tax

+ Fees

− Cash Down

− Trade Equity Applied

---

## Monthly Payment

Calculated using:

- APR
- Amount Financed
- Term

---

# BMW Select

## Balloon Amount

Balloon Amount

= MSRP

× Balloon Percentage

(or adjusted amount depending on selected business rule)

---

## Amount Financed

Amount Financed

=

Selling Price

+ Tax

+ Fees

− Cash Down

− Trade Equity Applied

---

## Monthly Payment

Uses:

APR

Term

Balloon Amount

Amount Financed

---

# Lease

## Gross Capitalized Cost

Vehicle Price

+ Capitalized Fees

---

## Adjusted Capitalized Cost

Gross Capitalized Cost

− Cap Reduction

---

## Residual Value

Residual Value

=

MSRP

× Residual %

plus or minus mileage adjustments

---

## Depreciation

=

Adjusted Cap Cost

− Residual

-----------------------

Lease Term

---

## Rent Charge

=

(Adjusted Cap Cost

+

Residual)

×

Money Factor

---

## Base Payment

=

Depreciation

+

Rent Charge

---

## Monthly Tax

Depends on state tax rules.

---

## Monthly Lease Payment

=

Base Payment

+

Applicable Monthly Tax

---

# Customer Quote

Customer Quote displays information.

Customer Quote does not calculate values.

Every displayed value must originate from the calculation engine.

---

# Manager Worksheet

Manager Worksheet displays calculation details.

Manager Worksheet does not perform calculations.

Its purpose is verification.

---

# Printing

Printed documents must use the same calculation results as the screen.

Print layouts must never independently calculate financial values.

---

# Source of Truth

Financial values should be calculated once.

Customer Quote

Manager Worksheet

Printing

Saved Deals

Dashboard

Reports

All consume the same calculation results.

No screen should independently recreate financial calculations.

---

# Future Expansion

Additional sections will be added for:

Commercial Lease

Fleet

Multiple Trades

Negative Equity Rollovers

State-specific tax rules

Finance reserve

Dealer profit reporting

Bank-specific calculations

One-Pay Lease

## BMW Select

Status: VERIFIED

Last Verified Against BMW:
2026-08-02

Notes:
Massachusetts leased trades may not receive a tax credit.

## One-Pay Lease

Status: NEEDS VERIFICATION

## Eligible Trade Tax Credit

Eligible Trade Tax Credit is the portion of the trade allowance permitted to reduce the taxable amount.

When `Apply Trade Tax Credit` is enabled:

Eligible Trade Tax Credit = Trade Allowance

When disabled:

Eligible Trade Tax Credit = 0

This setting affects taxation only.

It does not alter:

- Trade value
- Trade payoff
- Trade equity
- Cash back
- Cap-cost reduction
- Net amount financed

## Taxable Amount

Taxable Amount =
Selling Price
- Eligible Trade Tax Credit
+ Taxable Fees

Taxable Amount must not be less than zero unless a verified business rule explicitly allows it.