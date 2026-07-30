// Merge the computed Kansas index (data/derived/kansas-mars-index.json) into
// data/sell-timing.json as a new source. Idempotent: re-running replaces the
// Kansas source and series rather than duplicating. Gates every series on
// mean=100 before writing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(ROOT, 'src', 'data', 'sell-timing.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const ks = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'derived', 'kansas-mars-index.json'), 'utf8'));

data.sources['ks-mars-1895'] = {
  label: 'USDA AMS · Kansas Weekly Summary (ENCAN-computed)',
  citation: 'USDA Agricultural Marketing Service, Market News report AMS_1895 "Kansas Weekly Cattle Auction Summary" (Dodge City, Pratt, Salina), pulled via the MARS API.',
  url: 'https://mymarketnews.ams.usda.gov/viewReport/1895',
  region: 'Kansas (Dodge City, Pratt, Salina)',
  period: ks.span.replace('to', '–'),
  basis: 'USDA-AMS Kansas auction prices, Feeder Cattle, Medium/Large 1, Per Cwt. Steers and heifers, all five weight classes.',
  method: 'Ratio-to-12-month-moving-average seasonal index (ENCAN-computed, not transcribed from a publication). The MA removes the 2020–2025 price trend so the seasonal component is isolated; a plain per-year index over this window is dominated by the bull market and mislocates the peaks.',
  verified: 'Every series averages to 100 by construction. Computed from ~7 years of weekly weighted-average prices (report 1895) via tools/build-kansas-index.mjs. This is the ONLY source that is the operator’s own ground and the only one covering all five weight classes for both sexes.',
  caveat: 'The nearest USDA-reported markets to Logan, but Dodge City / Pratt / Salina, not the operator’s four local barns (Colby, WaKeeney, Plainville, Hays — not USDA-reported). Computed by ENCAN rather than a published index, and its 2019–2026 window is shorter and more turbulent than the older transcribed sources.',
};

// Drop any prior Kansas series, then add the fresh set.
data.series = data.series.filter((s) => s.source !== 'ks-mars-1895');
for (const s of ks.series) {
  data.series.push({
    id: s.id, source: 'ks-mars-1895', region: 'Kansas', species: 'cattle',
    sex: s.sex, weightClass: s.weightClass, index: s.index, sd: s.sd,
  });
}

// Kansas now covers 800-900 (both sexes) and the operator's own state, so those
// "not covered" entries are stale. Sheep coverage is unchanged.
data.classes_not_yet_covered = data.classes_not_yet_covered.filter(
  (c) => !/800-900|Kansas/.test(c.label),
);
data.classes_not_yet_covered.push({
  label: 'The four local barns — Colby, WaKeeney, Plainville, Hays',
  why: 'Not USDA-reported and no published history. Kansas coverage here is the USDA Dodge City / Pratt / Salina summary — the nearest reported markets. The local barns are being accrued forward weekly (data/market-history) for a future local index.',
});

// Gate: nothing enters unless it is a real index.
for (const s of data.series) {
  const mean = s.index.reduce((a, b) => a + b, 0) / 12;
  if (Math.abs(mean - 100) > 1) throw new Error(`FAIL ${s.id} mean ${mean.toFixed(2)}`);
}

fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
const regions = new Set(data.series.map((s) => s.region)).size;
console.log(`merged. series=${data.series.length}, sources=${Object.keys(data.sources).length}, regions=${regions}`);
