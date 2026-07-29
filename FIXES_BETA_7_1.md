# BMW Quote Pro 3.0 Beta 7.1 fixes

- Fixed the PDF Import Review crash: `source is not defined`.
- Fixed the same undefined reference in the Program Picker cards.
- Fixed residual validation before saving imported programs.
- Fixed residual review status updates after manually editing a residual.
- Preserved the valid cloned `source` object used when applying a program to a scenario.

## Test sequence
1. Open Program Center.
2. Choose Import BMW Program PDF.
3. Select the BMW program PDF.
4. Confirm the review table opens.
5. Correct or deselect any row marked Residual missing.
6. Save Imported Programs.
7. Open Deal Builder and use Apply BMW Program.
