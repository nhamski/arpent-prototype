// Pull Colby Livestock Auction weekly market reports from Nathaniel's published
// Google Sheet and compile them into data/colby/history.json.
//
// Colby is NOT USDA-reported, so this is the only machine-readable source for
// the operator's own local barn. Nathaniel maintains the sheet (one tab per
// sale week); this tool auto-discovers every dated tab from the published HTML,
// so new weeks are picked up without changing code.
//
// Colby reports price RANGES ($low–$high) per class and weight, Per Cwt for
// cattle/sheep/goats. We keep the range and its midpoint.
//
// Usage: node tools/pull-colby.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const PUB = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTFBVMdF0OZzI5b0ADDrz89yZkfOnh2TF--9bi3M2Rk0REkATMnMVdWOh9YHqqd0Dp-dXIzBM6cqOhE/pubhtml';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const fetchText = (url) => execFileSync('curl', ['-s', '--max-time', '40', '-A', 'Mozilla/5.0', url], { encoding: 'utf8', maxBuffer: 32 << 20 });

// Cattle/sheep/goat class labels that carry down across their weight rows.
const TYPES = ['STRS', 'HFRS', 'WT COWS', 'WT BULLS', 'SOWS', 'FEEDER PIGS', 'FAT HOGS',
  'EWES', 'RAMS', 'LAMBS', 'WETHERS', 'BILLIES', 'NANNIES', 'KID GOATS',
  'BABY CALVES', 'BRED COWS', 'BABY LAMBS', 'SHEEP FAMILIES', 'BREEDING EWES',
  'BABY KID GOATS', 'GOAT FAMILIES', 'LLAMA/ALPACA', 'LOOSE HORSES', 'DONKEY/MULES', 'PONIES'];
const isType = (s) => TYPES.includes(s);
const isWeight = (s) => /^\d+-\d+#$|^\d+\+#$/.test(s);
const money = (s) => { const m = String(s).match(/\$?([\d,]+(?:\.\d+)?)/); return m ? parseFloat(m[1].replace(/,/g, '')) : null; };

function parseSheet(html) {
  const rows = html.split(/<\/tr>/i).map((r) => [...r.matchAll(/<td[^>]*>(.*?)<\/td>/gis)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()));
  const out = [];
  let type = null;
  for (const cells of rows) {
    const c = cells.filter((x) => x !== '');
    if (!c.length) continue;
    let i = 0;
    let weight = null;
    if (isType(c[0])) { type = c[0]; i = 1; }
    if (c[i] && isWeight(c[i])) { weight = c[i]; i += 1; }
    if (!type) continue;
    // remaining cells may hold "$low - $high" (or a single price)
    const nums = c.slice(i).map(money).filter((v) => v != null);
    if (!nums.length) continue;
    const low = Math.min(...nums);
    const high = Math.max(...nums);
    out.push({ category: type, weight, low, high, mid: +((low + high) / 2).toFixed(2) });
  }
  return out;
}

// 1) discover every dated tab from the published HTML
const main = fetchText(PUB);
const tabs = [...main.matchAll(/name: "(\d{4}\.\d{1,2}\.\d{1,2})", pageUrl: "[^"]*?gid=(\d+)/g)]
  .map((m) => ({ date: m[1], gid: m[2] }));
console.log(`discovered ${tabs.length} weekly tabs`);

const iso = (d) => { const [y, m, dd] = d.split('.'); return `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`; };

// 2) pull + parse each week
const weeks = [];
for (const t of tabs) {
  try {
    const html = fetchText(`${PUB}/sheet?headers=false&gid=${t.gid}`);
    const prices = parseSheet(html);
    weeks.push({ weekEnding: iso(t.date), prices });
    process.stdout.write('.');
  } catch (e) { console.warn(`\n${t.date}: ${e.message}`); }
}
weeks.sort((a, b) => a.weekEnding.localeCompare(b.weekEnding));

const dir = path.join(ROOT, 'src', 'data', 'colby');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'history.json'), `${JSON.stringify({
  source: 'Colby Livestock Auction Company LLC — weekly market report (operator-maintained Google Sheet)',
  note: 'Colby is not USDA-reported; this is the operator\'s own local barn. Prices are $/cwt ranges (except per-head classes); mid is the range midpoint.',
  weeks,
}, null, 2)}\n`, 'utf8');

// Compact latest-lamb snapshot for the app (the operator's own barn, this week),
// with the year-ago price and change for each class.
const latestLamb = [...weeks].reverse().find((w) => w.prices.some((p) => p.category === 'LAMBS'));
if (latestLamb) {
  const days = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);
  const target = new Date(latestLamb.weekEnding); target.setFullYear(target.getFullYear() - 1);
  const targetISO = target.toISOString().slice(0, 10);

  // Closest week to one year ago that actually priced this category+weight.
  const yearAgo = (cat, weight) => {
    const cands = weeks
      .map((w) => ({ w, p: w.prices.find((x) => x.category === cat && (weight ? x.weight === weight : true)) }))
      .filter((x) => x.p && days(x.w.weekEnding, targetISO) <= 45)
      .sort((a, b) => days(a.w.weekEnding, targetISO) - days(b.w.weekEnding, targetISO));
    return cands[0] ? { mid: cands[0].p.mid, weekEnding: cands[0].w.weekEnding } : null;
  };
  const pick = (cat, weight) => latestLamb.prices.find((p) => p.category === cat && (weight ? p.weight === weight : true));
  const withYoY = (cat, weight) => {
    const p = pick(cat, weight);
    if (!p) return null;
    const ya = yearAgo(cat, weight);
    const row = { low: p.low, high: p.high, mid: p.mid };
    if (weight) row.weight = weight;
    if (ya) { row.yearAgoMid = ya.mid; row.changePct = +(((p.mid - ya.mid) / ya.mid) * 100).toFixed(1); }
    return row;
  };

  // Trailing 12 calendar months of the slaughter-weight (100+#) lamb price —
  // one weight class so the trend is apples-to-apples, monthly average of the
  // week mids. A single class avoids the weight-mix distorting $/cwt.
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const SLAUGHTER = '100+#';
  const end = new Date(latestLamb.weekEnding);
  const months = [];
  for (let i = 11; i >= 0; i -= 1) {
    const dt = new Date(end.getFullYear(), end.getMonth() - i, 1);
    months.push({ ym: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`, label: MON[dt.getMonth()] });
  }
  const monthMids = {};
  for (const w of weeks) {
    const ym = w.weekEnding.slice(0, 7);
    const p = w.prices.find((x) => x.category === 'LAMBS' && x.weight === SLAUGHTER);
    if (p) (monthMids[ym] ??= []).push(p.mid);
  }
  const twelveMonth = months.map((m) => ({
    label: m.label,
    avg: monthMids[m.ym] ? +(monthMids[m.ym].reduce((a, b) => a + b, 0) / monthMids[m.ym].length).toFixed(2) : null,
  }));

  fs.writeFileSync(path.join(dir, 'latest-lambs.json'), `${JSON.stringify({
    source: 'Colby Livestock Auction — operator-maintained weekly report',
    weekEnding: latestLamb.weekEnding,
    yearAgoTarget: targetISO,
    unit: '$/cwt (range)',
    lambs: ['20-39#', '40-59#', '60-79#', '80-99#', '100+#'].map((w) => withYoY('LAMBS', w)).filter(Boolean),
    ewes: withYoY('EWES'),
    rams: withYoY('RAMS'),
    slaughter12mo: { weight: SLAUGHTER, months: twelveMonth },
  }, null, 2)}\n`, 'utf8');
}

const lambWeeks = weeks.filter((w) => w.prices.some((p) => p.category === 'LAMBS'));
console.log(`\nwrote ${weeks.length} weeks (${weeks[0]?.weekEnding} → ${weeks.at(-1)?.weekEnding}); ${lambWeeks.length} have LAMBS`);
