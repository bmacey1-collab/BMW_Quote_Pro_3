# Beta 7.5 — Split PDF Row Recovery

- Rebuilds program rows from the complete PDF text stream when PDF.js splits a table row across multiple y-coordinates.
- Keeps the original line parser as the first pass.
- Adds a generic model-code-to-next-model-code fallback pass.
- Adds explicit diagnostics for 26XG and 26XT when their codes exist in the PDF but parsing still fails.
- Existing July records are updated by month/model code; missing records are inserted.
