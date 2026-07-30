// Build the live current-price snapshot for lambs, from the three regional
// USDA sheep auction reports that back the sheep seasonal index.
//
// Same shape as build-live.mjs (cattle/Kansas): each market's latest weekly
// weighted-average slaughter-lamb price plus a trailing-12-month average, so
// the app can say whether lambs are running above or below what the season
// predicts. Markets are kept SEPARATE, never averaged — they're different
// places and they disagree, which is the finding.
//
// Usage: node tools/build-live-sheep.mjs <1899.json> <1833.json> <2014.json>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const files = process.argv.slice(2);
if (files.length !== 3 || !files.every((f) => fs.existsSync(f))) {
  console.error('usage: node tools/build-live-sheep.mjs <fortcollins-1899.json> <missouri-1833.json> <sanangelo-2014.json>');
  process.exit(1);
}
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = [
  { file: files[0], region: 'Fort Collins, CO', slug: 1899 },
  { file: files[1], region: 'Missouri', slug: 1833 },
  { file: files[2], region: 'San Angelo, TX', slug: 2014 },
];

// Same slice as the seasonal index, so live and baseline describe one thing.
const LAMB_CLASSES = new Set(['Hair Breeds', 'Wooled & Shorn']);
const ymd = (mdy) => { const [m, d, y] = mdy.split('/'); return { y: +y, m: +m, d: +d, key: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` }; };

const markets = [];
for (const src of SOURCES) {
  const arr = JSON.parse(fs.readFileSync(src.file, 'utf8')).results;
  const rows = arr.filter((r) => r.commodity === 'Slaughter Sheep/Lambs'
    && LAMB_CLASSES.has(r.class) && r.price_unit === 'Per Cwt'
    && r.avg_price > 0 && r.head_count > 0 && r.avg_weight > 0 && r.avg_weight < 150);
  if (!rows.length) { console.warn(`skip ${src.region}: no priced lamb rows`); continue; }

  const dates = rows.map((r) => ymd(r.report_end_date)).sort((a, b) => a.key.localeCompare(b.key));
  const latest = dates.at(-1);
  const cutoff = new Date(Date.UTC(latest.y, latest.m - 1, latest.d));
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);

  const wavg = (rr) => {
    const h = rr.reduce((a, r) => a + r.head_count, 0);
    return h ? rr.reduce((a, r) => a + r.avg_price * r.head_count, 0) / h : null;
  };
  const latestRows = rows.filter((r) => ymd(r.report_end_date).key === latest.key);
  const trailRows = rows.filter((r) => {
    const d = ymd(r.report_end_date);
    return new Date(Date.UTC(d.y, d.m - 1, d.d)) >= cutoff;
  });
  const current = wavg(latestRows);
  if (current == null) { console.warn(`skip ${src.region}: no trade in the latest week`); continue; }

  markets.push({
    region: src.region,
    slug: src.slug,
    weekEnding: latest.key,
    pricePerCwt: +current.toFixed(2),
    headCount: latestRows.reduce((a, r) => a + r.head_count, 0),
    trailing12moAvg: +(wavg(trailRows) ?? current).toFixed(2),
  });
}

const dir = path.join(ROOT, 'src', 'data', 'live');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'sheep-latest.json'), `${JSON.stringify({
  source: 'USDA AMS sheep/goat auction reports 1899 (Fort Collins CO), 1833 (Missouri), 2014 (San Angelo TX)',
  category: 'Slaughter lambs, Per Cwt (Hair Breeds + Wooled & Shorn, under 150 lb)',
  note: 'Latest weekly weighted-average price per market, with a trailing-12-month average for the seasonal comparison. Markets are kept separate — never averaged. Public domain (USDA).',
  markets,
}, null, 2)}\n`, 'utf8');
console.log(`wrote ${markets.length} lamb markets: ${markets.map((m) => `${m.region} $${m.pricePerCwt} (wk ${m.weekEnding})`).join(' · ')}`);
