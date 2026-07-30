// Parse Peel & Meyer, "Cattle Price Seasonality" (OSU / LMIC, 2002).
// Six regional tables, one methodology, one period (1991-2000) — which is what
// makes the regions genuinely comparable to each other. Indices are expressed
// as ratios (1.079) rather than points (107.9); standard deviations follow in
// parentheses on the next line.
// Gate: every series must average to 1.000, or the parse is wrong.
import fs from 'node:fs';

const HERE = 'C:/Users/Hamski/AppData/Local/Temp/claude/C--Users-Hamski-Claude-Code/2955a3e3-1e81-4e7f-96e6-087d97f696f9/scratchpad';
const lines = fs.readFileSync(`${HERE}/wyoming.txt`, 'utf8').split('\n');
const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let region = null, period = null;
const out = [];

for (let i = 0; i < lines.length; i++) {
  const t = lines[i].match(/Table \d+\.\s+(.+?)\s+Cattle Price Seasonal Indices,\s+(\S+)\s+Average/);
  if (t) { region = t[1].trim(); period = t[2].trim(); continue; }
  if (!region) continue;

  // "   400-500 LB 1.030 1.050 ..." — bare decimals, not parenthesised.
  const w = lines[i].match(/(\d00)-(\d00)\s+LB\s+(.+)/);
  if (!w) continue;
  const index = [...w[3].matchAll(/(?<!\()\b(\d\.\d{3})\b(?!\))/g)].map((m) => parseFloat(m[1]));
  if (index.length !== 12) { out.push({ region, weight: `${w[1]}-${w[2]}`, error: `got ${index.length} values` }); continue; }

  // The class name (STEERS) and its SDs sit on the following line.
  const next = lines[i + 1] ?? '';
  const sex = /HEIFER/i.test(next) ? 'heifer' : /STEER/i.test(next) ? 'steer' : 'unknown';
  const sd = [...next.matchAll(/\((\d\.\d{3})\)/g)].map((m) => parseFloat(m[1]));

  const mean = index.reduce((a, b) => a + b, 0) / 12;
  out.push({
    region, period, sex, weight: `${w[1]}-${w[2]}`,
    index: index.map((v) => +(v * 100).toFixed(1)),
    sd: sd.length === 12 ? sd.map((v) => +(v * 100).toFixed(1)) : null,
    mean: +mean.toFixed(4),
    ok: Math.abs(mean - 1) < 0.005,
    peak: M[index.indexOf(Math.max(...index))],
    low: M[index.indexOf(Math.min(...index))],
  });
}

console.log('region            period     sex     weight    mean    peak  low');
for (const r of out) {
  if (r.error) { console.log(`${r.region} ${r.weight} PARSE ERROR ${r.error}`); continue; }
  console.log(
    `${r.region.padEnd(17)} ${r.period.padEnd(10)} ${r.sex.padEnd(7)} ${r.weight.padEnd(9)} ${String(r.mean).padEnd(7)} ${r.peak.padEnd(5)} ${r.low}${r.ok ? '' : '  <-- REJECT'}`,
  );
}
fs.writeFileSync(`${HERE}/peel-parsed.json`, JSON.stringify(out, null, 1));
console.log('\nseries:', out.length, ' passing mean gate:', out.filter((r) => r.ok).length);
console.log('regions:', [...new Set(out.map((r) => r.region))].join(', '));
