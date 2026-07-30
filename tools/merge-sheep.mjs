// Merge the computed regional sheep index (data/derived/sheep-index.json) into
// data/sell-timing.json, replacing the old single-source 1989-98 Texas A&M
// feeder-lamb estimate (which its own publisher disclaimed) with three current
// USDA slaughter-lamb series. Idempotent. Gates every series on mean=100.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(ROOT, 'src', 'data', 'sell-timing.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const sheep = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'derived', 'sheep-index.json'), 'utf8'));

// Out with the disclaimed 1989-98 estimate.
delete data.sources['tamu-l5326'];
data.series = data.series.filter((s) => s.source !== 'tamu-l5326' && s.source !== 'sheep-mars');

data.sources['sheep-mars'] = {
  label: 'USDA AMS · regional sheep auctions (ENCAN-computed)',
  citation: 'USDA Agricultural Marketing Service, Market News sheep/goat auction reports 1899 (Centennial, Fort Collins CO), 1833 (Missouri Weekly Sheep/Goat Summary), 2014 (Producers, San Angelo TX), pulled via the MARS API.',
  url: 'https://mymarketnews.ams.usda.gov/viewReport/1833',
  region: 'Fort Collins CO · Missouri · San Angelo TX',
  period: '2019–2026',
  basis: 'USDA-AMS slaughter-lamb auction prices, Per Cwt (Hair Breeds + Wooled & Shorn, under 150 lb — cull ewes, bucks and goats excluded).',
  method: 'Ratio-to-12-month-moving-average seasonal index (ENCAN-computed). Slaughter-lamb timing is the sell signal for a lamb crop; it is the only sheep category with the depth to index (feeder lambs are too thin — ~1500 rows, 3–4 covered years).',
  verified: 'Every series averages to 100 by construction, from ~6 full years of monthly data per market. All three markets independently show the winter/early-spring high and mid-summer low of the Easter-driven lamb market — confirming, with current multi-source data, the pattern the old 1989-98 estimate could only hint at.',
  caveat: 'These are the nearest USDA-reported sheep auctions to Logan, KS — Fort Collins CO is closest; Missouri and San Angelo TX are the regional reference markets. The four local barns (Colby et al.) are not USDA-reported. Sheep are a thin, volatile market: swings are large and the summer low especially varies year to year.',
};

for (const s of sheep.series) {
  data.series.push({
    id: s.id, source: 'sheep-mars', region: s.region, species: 'sheep',
    sex: 'lamb', weightClass: 'Slaughter lamb', index: s.index, sd: s.sd,
  });
}

// Sheep is now covered (slaughter lambs); the stale gap line goes.
data.classes_not_yet_covered = data.classes_not_yet_covered.filter((c) => !/[Ss]heep|lamb/.test(c.label));
data.classes_not_yet_covered.push({
  label: 'Sheep — feeder lambs and finer weight/breed detail',
  why: 'The slaughter-lamb index covers the sell-timing signal. Feeder lambs (the buy side) are reported too thinly to index reliably (~1500 rows, 3–4 covered years across the regional markets).',
});

for (const s of data.series) {
  const mean = s.index.reduce((a, b) => a + b, 0) / 12;
  if (Math.abs(mean - 100) > 1) throw new Error(`FAIL ${s.id} mean ${mean.toFixed(2)}`);
}

fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`merged. series=${data.series.length}, sources=${Object.keys(data.sources).length}, sheep=${data.series.filter((s) => s.species === 'sheep').length}`);
