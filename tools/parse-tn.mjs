// Parse the seasonal index (S.I.) rows out of UT Extension D39.
// Layout, confirmed by eye:
//     <prices Feb..Dec, Avg, Low, High>
//     Average $<JanPrice>   <S.I. Feb..Dec, Avg, Low, High>
//                           <STD Feb..Dec, ...>
//        S.I. $<JanSI>
//       STD $<JanSTD>
// So: Jan comes off the "S.I." line; Feb..Dec sit two lines above it.
// Every series must average to 1.00 or the parse is wrong — that's the gate.
import fs from 'node:fs';

const HERE = 'C:/Users/Hamski/AppData/Local/Temp/claude/C--Users-Hamski-Claude-Code/2955a3e3-1e81-4e7f-96e6-087d97f696f9/scratchpad';
const lines = fs.readFileSync(`${HERE}/tennessee.txt`, 'utf8').split('\n');

const nums = (s) => [...s.matchAll(/\$(\d+\.\d+)/g)].map((m) => parseFloat(m[1]));

// Track the most recent class heading above each S.I. block.
let sex = null, weight = null, period = null;
const out = [];

for (let i = 0; i < lines.length; i++) {
  const L = lines[i];

  if (/Tennessee Steer Prices/.test(L)) sex = 'steer';
  else if (/Tennessee Heifer Prices/.test(L)) sex = 'heifer';
  else if (/Utility Cow|Choice Finished/.test(L)) sex = 'other';

  const w = L.match(/(\d00)-(\d00)\s*lbs\./);
  if (w) weight = `${w[1]}-${w[2]}`;

  const p = L.match(/(20\d\d-20\d\d)/);
  if (p) period = p[1];

  const si = L.match(/S\.I\.\s+\$(\d+\.\d+)/);
  if (!si) continue;

  const jan = parseFloat(si[1]);
  // That line reads: "Average $<JanPrice>  <S.I. Feb..Dec, Avg, Low, High>"
  // — 1 price + 14 index figures. Drop the price, keep Feb..Dec.
  const raw = nums(lines[i - 2] ?? '');
  if (raw.length !== 15) { out.push({ sex, weight, period, error: `expected 15 got ${raw.length}` }); continue; }
  const rest = raw.slice(1);

  const index = [jan, ...rest.slice(0, 11)].map((v) => +(v * 100).toFixed(1));
  const mean = index.reduce((a, b) => a + b, 0) / 12;
  out.push({ sex, weight, period, index, mean: +mean.toFixed(3), ok: Math.abs(mean - 100) < 1.0 });
}

const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
console.log('period      sex     weight     mean   peak   low    index');
for (const r of out) {
  if (r.error) { console.log(`${r.period}  ${r.sex}  ${r.weight}  PARSE ERROR: ${r.error}`); continue; }
  const peak = M[r.index.indexOf(Math.max(...r.index))];
  const low = M[r.index.indexOf(Math.min(...r.index))];
  const flag = r.ok ? '' : '   <-- MEAN NOT 100, REJECT';
  console.log(
    `${r.period}  ${String(r.sex).padEnd(7)} ${String(r.weight).padEnd(9)} ${String(r.mean).padEnd(6)} ${peak.padEnd(6)} ${low.padEnd(6)} [${r.index.join(', ')}]${flag}`,
  );
}
fs.writeFileSync(`${HERE}/tn-parsed.json`, JSON.stringify(out, null, 1));
console.log('\nseries parsed:', out.length, ' passing mean-100 gate:', out.filter((r) => r.ok).length);
