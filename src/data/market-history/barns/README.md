# Individual barn captures

Drop-in home for the four barns Nathaniel named — **Colby, WaKeeney, Plainville,
Hays** — none of which is USDA-reported (see `../README.md`).

These publish only the current week, behind JavaScript widgets, so they can't be
captured by the plain `curl` + `pdftotext` weekly job. When a capture is made —
manually, or later by a headless-browser step — store it here as:

```
barns/<barn>/<YYYY-MM-DD>.txt    raw rendered report text (source of truth)
barns/<barn>/<YYYY-MM-DD>.json   { source, label, weekEnding, capturedFrom, rows: [{section, head, wtRange, avgWt, priceRange}] }
```

Same schema as the USDA captures, so a future aggregation can treat every source
uniformly. Until then this directory is intentionally empty except this note.
