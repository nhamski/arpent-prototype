// Refresh src/data/cpi-u.json from the BLS public API (CPI-U, U.S. city
// average, all items, NSA — series CUUR0000SA0). No API key needed; the
// unregistered v1 endpoint allows 25 queries a day and a 10-year span per
// query, so this walks the range in chunks.
//
//   node tools/pull-cpi.mjs                 # fill in through last completed year
//   node tools/pull-cpi.mjs --from 2010     # rebuild from a given year
//
// Only COMPLETED calendar years (all 12 months published) are written, and
// `finalThrough` records the last of them. A part-year average is not an
// annual average, and the valuation metric must not be built on one.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'data', 'cpi-u.json');
const SERIES = 'CUUR0000SA0';

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };

const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { annual: {} };
const known = Object.keys(existing.annual ?? {}).map(Number);
const thisYear = new Date().getUTCFullYear();
const from = Number(opt('from') ?? (known.length ? Math.max(...known) : thisYear - 12));
const to = thisYear;

const monthly = {};
for (let start = from; start <= to; start += 10) {
  const end = Math.min(start + 9, to);
  const url = `https://api.bls.gov/publicAPI/v1/timeseries/data/${SERIES}?startyear=${start}&endyear=${end}`;
  const res = await fetch(url);
  if (!res.ok) { console.error(`BLS ${start}-${end} -> HTTP ${res.status}`); process.exit(1); }
  const body = await res.json();
  if (body.status !== 'REQUEST_SUCCEEDED') { console.error(`BLS: ${body.status} ${(body.message ?? []).join('; ')}`); process.exit(1); }
  for (const s of body.Results.series) {
    for (const d of s.data) {
      if (!/^M(0[1-9]|1[0-2])$/.test(d.period)) continue; // skip M13 (annual) and S01/S02
      (monthly[d.year] ??= {})[d.period] = Number(d.value);
    }
  }
}

const annual = { ...(existing.annual ?? {}) };
let finalThrough = existing.finalThrough ?? null;
for (const year of Object.keys(monthly).sort()) {
  const months = Object.values(monthly[year]);
  if (months.length < 12) { console.log(`${year}: ${months.length}/12 months published — skipped`); continue; }
  annual[year] = +(months.reduce((a, b) => a + b, 0) / 12).toFixed(3);
  finalThrough = Math.max(finalThrough ?? 0, Number(year));
}

const out = { ...existing, annual: Object.fromEntries(Object.keys(annual).sort().map((y) => [y, annual[y]])), finalThrough };
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
console.log(`wrote ${Object.keys(out.annual).length} annual CPI-U values, final through ${finalThrough}`);
