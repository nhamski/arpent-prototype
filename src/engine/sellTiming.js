export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const HIGH = 'Seasonal High';
export const LOW = 'Seasonal Low';

const argMax = (a) => a.indexOf(Math.max(...a));
const argMin = (a) => a.indexOf(Math.min(...a));

export const peakMonth = (s) => argMax(s.index) + 1;
export const lowMonth = (s) => argMin(s.index) + 1;
export const indexIn = (s, month) => s.index[month - 1];
export const swing = (s) => Math.max(...s.index) - Math.min(...s.index);

const WINDOW_SIZES = [1, 2, 3];

function bestWindow(months, size) {
  let best = null;
  for (let start = 0; start < 12; start++) {
    const win = Array.from({ length: size }, (_, k) => (start + k) % 12);
    const count = months.filter((m) => win.includes(m)).length;
    if (!best || count > best.count) best = { start, size, count, win };
  }
  return best;
}

const enough = (count, of) => of >= 2 && count >= 2 && count >= Math.ceil(of / 2);

const windowName = (win) => (win.length === 1
  ? MONTHS[win[0]]
  : `${MONTHS[win[0]]}–${MONTHS[win[win.length - 1]]}`);

function tightestWindow(months) {
  const perSize = WINDOW_SIZES.map((size) => bestWindow(months, size));
  const maxCount = Math.max(...perSize.map((w) => w.count));
  return perSize.find((w) => w.count === maxCount);
}

function vote(seriesList, pick) {
  const months = seriesList.map((s) => pick(s) - 1);
  const of = seriesList.length;
  const distinct = [...new Set(months)].sort((a, b) => a - b);
  const majority = Math.ceil(of / 2);
  const w1 = tightestWindow(months);

  const restCluster = (win) => {
    const rest = months.filter((m) => !win.includes(m));
    return rest.length >= 2 ? tightestWindow(rest) : null;
  };
  const pack = (wins, primary, secondWin) => ({
    agreed: true,
    bimodal: wins.length > 1,
    wins,
    win: primary.win,
    name: windowName(primary.win),
    count: primary.count,
    size: primary.size,
    of,
    months: distinct.map((m) => m + 1),
    second: secondWin ? { win: secondWin.win, count: secondWin.count, name: windowName(secondWin.win), of } : null,
  });

  if (w1 && enough(w1.count, of)) {
    const w2 = restCluster(w1.win);
    return pack([w1.win], w1, w2 && w2.count >= 2 ? w2 : null);
  }
  if (w1 && w1.count >= 2) {
    const w2 = restCluster(w1.win);
    if (w2 && w2.count >= 2 && w1.count + w2.count >= majority) {
      const [a, b] = [w1, w2].sort((x, y) => x.win[0] - y.win[0]);
      return pack([a.win, b.win], a, b);
    }
  }
  return {
    agreed: false, bimodal: false, wins: [], win: [], name: null,
    count: w1?.count ?? 0, size: null, of, months: distinct.map((m) => m + 1), second: null,
  };
}

export function consensusFor(seriesList, month) {
  const high = vote(seriesList, peakMonth);
  const low = vote(seriesList, lowMonth);
  const valuesThisMonth = seriesList.map((s) => indexIn(s, month));
  const inWindowVals = high.wins.flat().flatMap((m) => seriesList.map((s) => s.index[m]));

  return {
    count: seriesList.length,
    regions: [...new Set(seriesList.map((s) => s.region))],
    high,
    low,
    thisMonth: {
      min: Math.min(...valuesThisMonth),
      max: Math.max(...valuesThisMonth),
      aboveAverage: valuesThisMonth.filter((v) => v >= 100).length,
    },
    highRange: inWindowVals.length
      ? { min: Math.min(...inWindowVals), max: Math.max(...inWindowVals) }
      : null,
    swing: { min: Math.min(...seriesList.map(swing)), max: Math.max(...seriesList.map(swing)) },
    lowConfidence: seriesList.some((s) => s.lowConfidence),
    reason: seriesList.length < 2 ? 'single-source' : high.agreed ? null : 'sources-disagree',
    dualPeak: !!high.second,
  };
}

export const inWindow = (v, month) => v.agreed && v.wins.some((w) => w.includes(month - 1));

const keyOf = (s) => `${s.species}|${s.sex}|${s.weightClass}`;

export function timingFor(data, month) {
  const groups = new Map();
  for (const s of data.series ?? []) {
    if (!groups.has(keyOf(s))) groups.set(keyOf(s), []);
    groups.get(keyOf(s)).push(s);
  }

  const classes = [...groups.entries()].map(([key, list]) => {
    const [species, sex, weightClass] = key.split('|');
    const c = consensusFor(list, month);
    return {
      key, species, sex, weightClass,
      label: sex === 'lamb' ? weightClass : `${weightClass} ${sex === 'steer' ? 'Steers' : 'Heifers'}`,
      series: list.map((s) => ({
        ...s, peak: MON[peakMonth(s) - 1], low: MON[lowMonth(s) - 1],
        valueThisMonth: indexIn(s, month), sourceInfo: data.sources?.[s.source] ?? null,
      })),
      consensus: c,
      standing: inWindow(c.high, month) ? 'high'
        : inWindow(c.low, month) ? 'low'
          : c.thisMonth.min >= 100 ? 'above'
            : c.thisMonth.max < 100 ? 'below' : 'mixed',
    };
  });

  const order = { steer: 0, heifer: 1, lamb: 2 };
  classes.sort((a, b) => (order[a.sex] - order[b.sex]) || a.weightClass.localeCompare(b.weightClass));

  return {
    month,
    monthName: MONTHS[month - 1],
    classes,
    steers: classes.filter((c) => c.sex === 'steer'),
    heifers: classes.filter((c) => c.sex === 'heifer'),
    sheep: classes.filter((c) => c.species === 'sheep'),
    atHigh: classes.filter((c) => c.standing === 'high' && !c.consensus.lowConfidence),
    atLow: classes.filter((c) => c.standing === 'low' && !c.consensus.lowConfidence),
    noPattern: classes.filter((c) => !c.consensus.high.agreed),
    notCovered: data.classes_not_yet_covered ?? [],
    hasLiveData: Object.values(data.live_columns_added_by_daily_job ?? {}).some((v) => v !== null),
    sourcesUsed: [...new Set((data.series ?? []).map((s) => s.source))].map((id) => data.sources[id]),
    seriesCount: (data.series ?? []).length,
    regionCount: new Set((data.series ?? []).map((s) => s.region)).size,
  };
}

export function standingLabel(standing) {
  if (standing === 'high') return HIGH;
  if (standing === 'low') return LOW;
  if (standing === 'above') return 'Above average';
  if (standing === 'below') return 'Below average';
  return 'Mid-range';
}
