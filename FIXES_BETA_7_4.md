# BMW Quote Pro 3.0 Beta 7.4

## 2026 X5 xDrive40i import fix

The July PDF contains the 2026 X5 xDrive40i model code `26XG`, but PDF.js can place stray page-number or watermark text before that row. The previous importer only accepted rows whose first characters were the BMW model code, so a line such as `20 26XG X5 xDr40i ...` was silently skipped.

Beta 7.4 now searches each extracted line for a valid BMW model-code row and removes any leading PDF artifacts before parsing it. This also protects other models from the same issue.

Because `26XG` was never saved, July programs must be imported again after deploying this build. Existing rows are updated by month and model code rather than duplicated.
