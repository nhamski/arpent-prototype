# Market history — weekly accrual

This directory accrues live auction reports **week by week**, so that over time
ENCAN builds its own multi-year price history for the region. A single week is
not a seasonal signal; a few hundred weeks is the start of one — the same way
the published seasonal indices in `data/sell-timing.json` were built (someone
collected years of USDA reports).

**Nothing here feeds the app yet.** It is a growing archive for future use:
once there are ~2–3 years of weeks, these can be aggregated into a genuinely
local Kansas seasonal index (per-year detrended, mean-100 gated, like the rest).

## Design: raw first, parse second

Each capture stores **two files per report**:

- `<source>/<YYYY-MM-DD>.txt` — the raw `pdftotext -layout` output. **This is
  the source of truth.** Small, human-readable, and re-parseable forever.
- `<source>/<YYYY-MM-DD>.json` — a best-effort parse into `{section, head,
  wtRange, avgWt, priceRange}` rows.

If the JSON parser is imperfect today, or a report's layout drifts, the raw
text is never lost — a better parser can re-read the whole archive later. Never
delete the `.txt` files.

The `priceRange` field is reliable. The weighted **average** price column bleeds
across lines in the text dump, so it is intentionally *not* trusted positionally
yet; recovering it cleanly is a job for the keyed MARS API (JSON, exact fields).

## Sources

### USDA (automated, public domain)

USDA AMS Market News reports — US government works, free to redistribute, no API
key. Captured weekly by `tools/capture-market.mjs` via each report's
always-current URL. These are the **nearest USDA-reported markets to Logan, KS**:

| Folder | Report | Markets |
|---|---|---|
| `usda-ks-summary` | AMS 1895 | Kansas weekly summary — Dodge City, Pratt, Salina |
| `usda-dodge-city` | AMS 1889 | Dodge City, KS |
| `usda-pratt` | AMS 1891 | Winter Livestock, Pratt, KS |

### The four named barns (Colby, WaKeeney, Plainville, Hays) — NOT automated

These are **not USDA-reported**, so no clean public feed exists. Verified
2026-07-17: Colby and WaKeeney publish only the *current* week on their own
sites, behind lazy-loaded JavaScript widgets with no data endpoint; Plainville
and Hays publish nothing findable. Capturing them reliably would need a headless
browser, and re-publishing a private barn's data raises an IP question for a
commercial product. If captured (manually or later via headless infra), drop
files under `barns/<barn>/<YYYY-MM-DD>.{txt,json}` following the same schema.

## Backfill

The weekly capture only grows *forward*. To get the ~7 years of USDA Kansas
history that already exists, use the **MARS API with a free key** (see
`encan-app` memory) — one keyed pull returns it all as clean JSON, no scraping.
