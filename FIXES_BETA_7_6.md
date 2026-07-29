# Beta 7.6 — BMW Model-Code Boundary Fix

## Root cause
The split-row fallback treated any four-character token beginning with two digits as a BMW model code. That included ordinary year values such as `2026` and some numeric table fragments. Those false boundaries cut the reconstructed row before the residual/rate columns, so `26XG` and `26XT` were still skipped.

## Fix
BMW row boundaries now require the third character to be a letter, matching codes such as `26XG`, `26XT`, and `25XO`, while excluding `2026`. The fix is applied consistently to wrapped-line merging, candidate detection, row parsing, and full-text reconstruction.

## Test
Re-import July 2026 and confirm the review table includes `26XG` and `26XT` before saving.
