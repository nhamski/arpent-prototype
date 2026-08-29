// Predictive tracking ledger — the accuracy audit.
//
// A marketing call that is never graded is an opinion. Every prediction is
// logged with the price it was made against, the window it is answerable in,
// and the exact market row that will settle it. When the window closes the
// entry is graded from data, not from memory.
//
// Pure functions only: files are read and written by tools/ledger-audit.mjs.

export const VERDICTS = ['accurate', 'partial', 'inaccurate'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validatePrediction(entry) {
  const errors = [];
  const req = (k, ok, msg) => { if (!ok) errors.push(`${k}: ${msg}`); };

  req('id', typeof entry.id === 'string' && entry.id.length > 0, 'required');
  req('logged', ISO.test(entry.logged ?? ''), 'required, YYYY-MM-DD');
  req('species', typeof entry.species === 'string' && entry.species.length > 0, 'required');
  req('class', typeof entry.class === 'string' && entry.class.length > 0, 'required');
  req('action', ['buy', 'sell', 'hold'].includes(entry.action), 'must be buy, sell, or hold');
  req('thesis', typeof entry.thesis === 'string' && entry.thesis.length > 0, 'required — why, in one line');
  req('targetWindow.from', ISO.test(entry.targetWindow?.from ?? ''), 'required, YYYY-MM-DD');
  req('targetWindow.to', ISO.test(entry.targetWindow?.to ?? ''), 'required, YYYY-MM-DD');
  if (ISO.test(entry.targetWindow?.from ?? '') && ISO.test(entry.targetWindow?.to ?? '')) {
    req('targetWindow', entry.targetWindow.from <= entry.targetWindow.to, 'from must not be after to');
  }
  req('expected.direction', ['up', 'down', 'flat'].includes(entry.expected?.direction), 'must be up, down, or flat');
  req('basis.asOf', ISO.test(entry.basis?.asOf ?? ''), 'required — the date the call was priced against');
  req('basis.value', typeof entry.basis?.value === 'number', 'required — the price the call was made against');
  req('basis.source', typeof entry.basis?.source === 'string' && entry.basis.source.length > 0, 'required — which report');
  req('market', entry.market && typeof entry.market.source === 'string', 'required — how the outcome will be resolved');

  const band = entry.expected?.band;
  if (band != null) {
    req('expected.band', Array.isArray(band) && band.length === 2 && band[0] <= band[1], 'must be [low, high]');
  }
  return errors;
}

export function openPredictions(ledger, today) {
  return ledger.entries.filter((e) => !e.assessment && e.targetWindow.to > today);
}

// Answerable now: the window has closed and nothing has graded it yet.
export function duePredictions(ledger, today) {
  return ledger.entries.filter((e) => !e.assessment && e.targetWindow.to <= today);
}

// Grade a realized number against what was predicted.
//   inside the stated band                     -> accurate
//   outside the band but moved the right way   -> partial
//   moved the wrong way (or moved when flat)   -> inaccurate
// `flatTolerancePct` is how much drift still counts as flat.
export function grade(entry, realizedValue, { flatTolerancePct = 3 } = {}) {
  const basis = entry.basis.value;
  const movePct = basis ? ((realizedValue - basis) / basis) * 100 : 0;
  const band = entry.expected.band;
  const inBand = band ? realizedValue >= band[0] && realizedValue <= band[1] : null;

  let directionRight;
  if (entry.expected.direction === 'up') directionRight = movePct > flatTolerancePct;
  else if (entry.expected.direction === 'down') directionRight = movePct < -flatTolerancePct;
  else directionRight = Math.abs(movePct) <= flatTolerancePct;

  let verdict;
  if (inBand === true) verdict = 'accurate';
  else if (inBand === false) verdict = directionRight ? 'partial' : 'inaccurate';
  else verdict = directionRight ? 'accurate' : 'inaccurate';

  return { verdict, movePct: +movePct.toFixed(1), inBand, realizedValue: +realizedValue.toFixed(2), basisValue: basis };
}

// Returns a NEW ledger — never mutates the one passed in.
export function recordOutcome(ledger, id, { outcome, assessment }) {
  const found = ledger.entries.some((e) => e.id === id);
  if (!found) throw new Error(`no prediction with id "${id}"`);
  if (!VERDICTS.includes(assessment?.verdict)) throw new Error(`verdict must be one of ${VERDICTS.join(', ')}`);
  if (!assessment.rootCause) throw new Error('rootCause is required — a grade without a reason teaches nothing');
  return {
    ...ledger,
    entries: ledger.entries.map((e) => (e.id === id ? { ...e, outcome, assessment } : e)),
  };
}

export function accuracy(ledger) {
  const graded = ledger.entries.filter((e) => e.assessment);
  const tally = (rows) => {
    const t = { audited: rows.length, accurate: 0, partial: 0, inaccurate: 0 };
    for (const r of rows) t[r.assessment.verdict] += 1;
    t.accuracyPct = rows.length ? +(((t.accurate + t.partial * 0.5) / rows.length) * 100).toFixed(1) : null;
    return t;
  };
  const bySpecies = {};
  for (const sp of [...new Set(graded.map((e) => e.species))]) {
    bySpecies[sp] = tally(graded.filter((e) => e.species === sp));
  }
  return { ...tally(graded), open: ledger.entries.length - graded.length, bySpecies };
}

// Resolve a realized price from the Colby weekly history: the average of the
// week midpoints for one class inside the target window. `weeks` is
// src/data/colby/history.json -> weeks.
export function realizedFromColby(weeks, { category, weight = null, from, to }) {
  const hits = [];
  for (const w of weeks) {
    if (w.weekEnding < from || w.weekEnding > to) continue;
    const p = (w.prices ?? []).find((x) => x.category === category && x.weight === weight);
    if (p) hits.push({ weekEnding: w.weekEnding, mid: p.mid, low: p.low, high: p.high });
  }
  if (!hits.length) return { available: false, reason: `no ${category}${weight ? ` ${weight}` : ''} rows between ${from} and ${to}`, weeks: 0 };
  const mid = hits.reduce((a, h) => a + h.mid, 0) / hits.length;
  return {
    available: true,
    source: 'Colby Livestock Auction weekly report',
    category,
    weight,
    from,
    to,
    weeks: hits.length,
    realizedAvgMid: +mid.toFixed(2),
    low: Math.min(...hits.map((h) => h.low)),
    high: Math.max(...hits.map((h) => h.high)),
    observations: hits,
  };
}
