# BMW Quote Pro Beta 7.2 Fix

## 2026 X5 40 incentive matching

The incentive picker previously required a literal substring match between the vehicle model and the imported BMW program model. A deal entered as `X5 40` did not match the PDF model name `X5 xDr40i` or `X5 sDr40i`.

Beta 7.2 now matches BMW models by:

- Model year
- BMW series, such as X5
- Trim number, such as 40
- Common drivetrain abbreviations, including xDrive/xDr and sDrive/sDr
- Common suffixes such as `i`, `e`, and `d`

This allows `2026 X5 40` to find the imported 2026 X5 xDrive40i and sDrive40i program incentives without incorrectly matching X5 M60i or X5 M.
