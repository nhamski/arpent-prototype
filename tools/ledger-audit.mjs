// Audit the prediction ledger against what the market actually did.
//
//   node tools/ledger-audit.mjs                       # what is due, and how it graded
//   node tools/ledger-audit.mjs --json                # same, machine-readable
//   node tools/ledger-audit.mjs --add call.json       # log new prediction(s), validated
//   node tools/ledger-audit.mjs --write --id <id> --root-cause "..." [--verdict partial]
//
// The realized figure is resolved from src/data/colby/history.json — the local
// barn's own weekly report — never typed in by hand. If the window has no
// matching rows the audit says so and grades nothing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePrediction, duePredictions, openPredictions, grade, recordOutcome, accuracy, realizedFromColby } from '../src/engine/ledger.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = path.join(ROOT, 'src', 'data', 'prediction-ledger.json');
const COLBY = path.join(ROOT, 'src', 'data', 'colby', 'history.json');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : null; };
const today = opt('today') ?? new Date().toISOString().slice(0, 10);

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v) => fs.writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`, 'utf8');

const ledger = readJson(LEDGER);
const colby = fs.existsSync(COLBY) ? readJson(COLBY) : { weeks: [] };

// --- log new predictions ------------------------------------------------
const addPath = opt('add');
if (addPath) {
  const incoming = [readJson(addPath)].flat();
  const ids = new Set(ledger.entries.map((e) => e.id));
  for (const entry of incoming) {
    const errors = validatePrediction(entry);
    if (errors.length) { console.error(`rejected ${entry.id ?? '(no id)'}:\n  ${errors.join('\n  ')}`); process.exit(1); }
    if (ids.has(entry.id)) { console.error(`rejected ${entry.id}: already in the ledger`); process.exit(1); }
    ids.add(entry.id);
  }
  const next = { ...ledger, entries: [...ledger.entries, ...incoming.map((e) => ({ outcome: null, assessment: null, ...e }))] };
  writeJson(LEDGER, next);
  console.log(`logged ${incoming.length} prediction(s) — ledger now holds ${next.entries.length}`);
  process.exit(0);
}

// --- resolve what is due ------------------------------------------------
const resolve = (entry) => {
  if (entry.market?.source !== 'colby') {
    return { available: false, reason: `no resolver for market source "${entry.market?.source}" — resolve by hand from src/data/market-history/` };
  }
  return realizedFromColby(colby.weeks, {
    category: entry.market.category,
    weight: entry.market.weight ?? null,
    from: entry.targetWindow.from,
    to: entry.targetWindow.to,
  });
};

const due = duePredictions(ledger, today).map((entry) => {
  const realized = resolve(entry);
  return { entry, realized, proposed: realized.available ? grade(entry, realized.realizedAvgMid) : null };
});

// --- record one grade ---------------------------------------------------
if (flag('write')) {
  const id = opt('id');
  const rootCause = opt('root-cause');
  if (!id || !rootCause) { console.error('--write needs --id <id> and --root-cause "why the spread behaved as it did"'); process.exit(1); }
  const row = due.find((d) => d.entry.id === id);
  if (!row) { console.error(`"${id}" is not due for audit on ${today} (or is already graded)`); process.exit(1); }
  if (!row.realized.available) { console.error(`cannot grade "${id}": ${row.realized.reason}`); process.exit(1); }

  const verdict = opt('verdict') ?? row.proposed.verdict;
  const next = recordOutcome(ledger, id, {
    outcome: {
      gradedOn: today,
      source: row.realized.source,
      window: [row.realized.from, row.realized.to],
      weeks: row.realized.weeks,
      realizedAvgMid: row.realized.realizedAvgMid,
      low: row.realized.low,
      high: row.realized.high,
      movePctFromBasis: row.proposed.movePct,
    },
    assessment: { verdict, rootCause, gradedOn: today },
  });
  writeJson(LEDGER, next);
  console.log(`${id}: ${verdict} (realized ${row.realized.realizedAvgMid}, basis ${row.proposed.basisValue}, ${row.proposed.movePct > 0 ? '+' : ''}${row.proposed.movePct}%)`);
  process.exit(0);
}

// --- report -------------------------------------------------------------
const report = {
  today,
  colbyThrough: colby.weeks?.at(-1)?.weekEnding ?? null,
  due: due.map((d) => ({ id: d.entry.id, class: d.entry.class, action: d.entry.action, window: d.entry.targetWindow, realized: d.realized, proposed: d.proposed })),
  open: openPredictions(ledger, today).map((e) => ({ id: e.id, class: e.class, action: e.action, settles: e.targetWindow.to })),
  accuracy: accuracy(ledger),
};

if (flag('json')) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

console.log(`Ledger audit — ${today} (Colby data through ${report.colbyThrough ?? 'n/a'})\n`);
if (!report.due.length) console.log('Due for audit: none.');
for (const d of report.due) {
  console.log(`DUE  ${d.id}`);
  console.log(`     ${d.action.toUpperCase()} ${d.class} · window ${d.window.from} → ${d.window.to}`);
  if (d.realized.available) {
    console.log(`     realized ${d.realized.realizedAvgMid} over ${d.realized.weeks} wk (${d.realized.low}–${d.realized.high}) vs basis ${d.proposed.basisValue} → ${d.proposed.movePct > 0 ? '+' : ''}${d.proposed.movePct}%`);
    console.log(`     proposed: ${d.proposed.verdict}  —  record with --write --id ${d.id} --root-cause "..."`);
  } else {
    console.log(`     unresolved: ${d.realized.reason}`);
  }
}
console.log(`\nOpen: ${report.open.length}${report.open.length ? ` (next settles ${report.open.map((o) => o.settles).sort()[0]})` : ''}`);
const a = report.accuracy;
console.log(`Graded: ${a.audited}${a.audited ? ` — ${a.accurate} accurate, ${a.partial} partial, ${a.inaccurate} inaccurate (${a.accuracyPct}%)` : ''}`);
