# BMW Quote Pro 3.0 Beta 7.8

## Program Center improvements

- Added **Duplicate** to every saved program.
- Renamed **Copy Prior** to **Duplicate Latest**.
- Added **Copy Month** to duplicate an entire program month. Matching month/model-code records are updated instead of duplicated. Effective and expiration dates are cleared for review.
- Added **Bulk Update Rates** for residual, money factor, APR, balloon, terms, and one-pay reduction, with optional model/code filtering.
- Added **Bulk Update Incentive** to add, update, or remove an incentive across a month, with optional model/code filtering.
- Program code is now required before saving.
- Blank incentive program codes automatically inherit the parent program code.
- Manual saves update an existing month/model-code record rather than creating a duplicate.

## Supabase reliability

- Repeat imports and copied programs now resolve the existing Supabase record by `user_id + program_month + model_code` before saving.
- This prevents the duplicate-key error caused by different local and Supabase UUIDs.
- Incentives are reattached to the canonical Supabase program ID.

## Recommended monthly workflow

1. Use **Copy Month** to copy the prior month into the new month.
2. Update effective and expiration dates.
3. Use **Bulk Update Rates** for changes shared by many models.
4. Use **Bulk Update Incentive** for broad incentive changes.
5. Edit individual programs only where BMW made model-specific changes.
6. Use PDF import as a cross-check or faster starting point.
