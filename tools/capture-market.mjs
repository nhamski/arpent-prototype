// Weekly market-data accrual for ENCAN.
//
// GOAL (per Nathaniel, 2026-07-17): capture current auction reports every week
// and store them, so that over time we accrue our own multi-year history — the
// same way the published seasonal indices were built. A single week is not a
// seasonal signal; a hundred weeks is the start of one.
//
// DESIGN: store the RAW report text first, parse second. If the parser is
// imperfect today or a report's layout drifts, the raw capture is never lost
// and can be re-parsed later. The raw text is the source of truth; the JSON is
// a convenience built from it.
//
// SOURCES: USDA AMS Market News reports are public domain (US government work),
// fetched from their always-current URLs with no API key. These cover the
// nearest USDA-reported Kansas markets to Logan — Dodge City, Pratt, and the
// combined Kansas summary. The four barns Nathaniel named (Colby, WaKeeney,
// Plainville, Hays) are NOT USDA-reported and publish only current-week data
// behind JS widgets; those are captured separately (tools/capture-barns note).
//
// Run: node tools/capture-market.mjs   (idempotent — skips weeks already saved)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const STORE = path.join(ROOT, 'src', 'data', 'market-history');

// USDA AMS reports: the always-current PDF (no date in URL, no key). slug = the
// AMS report number. These are the nearest USDA-reported markets to Logan, KS.
const SOURCES = [
  { id: 'usda-ks-summary', slug: '1895', label: 'Kansas Weekly Cattle Auction Summary (Dodge City, Pratt, Salina)' },
  { id: 'usda-dodge-city', slug: '1889', label: 'Dodge City, KS — Livestock Auction Weighted Average' },
  { id: 'usda-pratt', slug: '1891', label: 'Winter Livestock, Pratt, KS — Weighted Average' },
];

const url = (slug) => `https://www.ams.usda.gov/mnreports/ams_${slug}.pdf`;

function fetchPdfText(slug) {
  const tmp = path.join(STORE, `.tmp_${slug}.pdf`);
  execFileSync('curl', ['-s', '--max-time', '40', '-A', 'Mozilla/5.0', '-o', tmp, url(slug)]);
  if (!fs.existsSync(tmp) || fs.statSync(tmp).size < 1000) throw new Error(`fetch failed for ${slug}`);
  const text = execFileSync('pdftotext', ['-layout', tmp, '-'], { encoding: 'utf8', maxBuffer: 8 << 20 });
  fs.unlinkSync(tmp);
  return text;
}

// Two formats seen:
//   weekly summary: "Report for 7/5/2026 - 7/11/2026" (a week range)
//   daily auction:  "Report for 7/15/2026 - Final"    (a single sale day)
// Key the file on the ending/sale date either way.
function reportWeek(text) {
  const range = text.match(/Report for\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (range) {
    const [, , , , em, ed, ey] = range;
    return { iso: `${ey}-${String(em).padStart(2, '0')}-${String(ed).padStart(2, '0')}`, range: `${range[1]}/${range[2]}/${range[3]} - ${range[4]}/${range[5]}/${range[6]}` };
  }
  const single = text.match(/Report for\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*Final/i);
  if (single) {
    const [, m, d, y] = single;
    return { iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, range: `${m}/${d}/${y}` };
  }
  return null;
}

// Best-effort parse. The price RANGE is the reliable positional field; the
// weighted "Avg Price" column bleeds across lines in the text dump, so we do
// not trust its position — the raw text is kept for a better parse later.
function parseRows(text) {
  const out = [];
  let section = null;
  for (const line of text.split('\n')) {
    const sec = line.match(/^([A-Z][A-Z /()]+?)\s*-\s*(.+?)\s*\(Per Cwt/);
    if (sec) { section = `${sec[1].trim()} ${sec[2].trim()}`; continue; }
    if (!section) continue;
    // head  wtRange  avgWt  priceRange     e.g. "78  508-547  535  475.00-515.00"
    const m = line.match(/^\s*(\d+)\s+(\d{2,4}(?:-\d{2,4})?)\s+(\d{2,4})\s+(\d+\.\d{2}(?:-\d+\.\d{2})?)/);
    if (!m) continue;
    out.push({ section, head: +m[1], wtRange: m[2], avgWt: +m[3], priceRange: m[4] });
  }
  return out;
}

fs.mkdirSync(STORE, { recursive: true });
let saved = 0; let skipped = 0;
const captured = [];

for (const src of SOURCES) {
  try {
    const text = fetchPdfText(src.slug);
    const week = reportWeek(text);
    if (!week) { console.warn(`[${src.id}] no report week found — skipping`); continue; }

    const dir = path.join(STORE, src.id);
    fs.mkdirSync(dir, { recursive: true });
    const rawFile = path.join(dir, `${week.iso}.txt`);
    if (fs.existsSync(rawFile)) { console.log(`[${src.id}] ${week.iso} already captured`); skipped++; continue; }

    fs.writeFileSync(rawFile, text, 'utf8');
    const rows = parseRows(text);
    fs.writeFileSync(
      path.join(dir, `${week.iso}.json`),
      `${JSON.stringify({ source: src.id, label: src.label, week: week.range, weekEnding: week.iso, capturedFrom: url(src.slug), rows }, null, 2)}\n`,
      'utf8',
    );
    console.log(`[${src.id}] captured ${week.iso} — ${rows.length} priced rows`);
    captured.push({ id: src.id, week: week.iso, rows: rows.length });
    saved++;
  } catch (e) {
    console.error(`[${src.id}] ${e.message}`);
  }
}

// A running index so a human (or the next tool) can see coverage at a glance.
// Computed from what's on disk, not just this run, so it stays accurate even
// when a run captures nothing new.
const coverage = {};
let latest = null;
for (const src of SOURCES) {
  const dir = path.join(STORE, src.id);
  const weeks = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).map((f) => f.replace('.txt', '')).sort() : [];
  coverage[src.id] = { weeks: weeks.length, earliest: weeks[0] ?? null, latest: weeks.at(-1) ?? null };
  if (weeks.at(-1) && (!latest || weeks.at(-1) > latest)) latest = weeks.at(-1);
}
const manifest = { updated: latest, sources: coverage, note: 'Raw text is the source of truth; JSON is a best-effort parse. See README.' };
fs.writeFileSync(path.join(STORE, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`\ncaptured ${saved}, skipped ${skipped}`);
if (!saved && !skipped) process.exitCode = 1; // total failure — surface it
