# Beta 7.7 — Fixed-window PDF row recovery

- Added a third PDF parsing pass that takes a fixed-width text window after every BMW model code.
- This avoids valid rows being cut short by page headers, footnotes, or PDF artifacts that resemble model codes.
- Specifically intended to recover 26XG while preserving the generic importer behavior.
- Existing month/model-code records remain deduplicated before save.
