const THRESHOLD = 2;

export function liveSignal(price, ksIndex, month) {
  const idx = ksIndex[month - 1];
  const expected = price.trailing12moAvg * (idx / 100);
  const deviationPct = expected ? (price.pricePerCwt - expected) / expected * 100 : 0;
  const direction = deviationPct > THRESHOLD ? 'above' : deviationPct < -THRESHOLD ? 'below' : 'inline';
  return {
    current: price.pricePerCwt,
    expected: +expected.toFixed(2),
    deviationPct: +deviationPct.toFixed(1),
    direction,
    headCount: price.headCount,
  };
}

export function signalLabel(sig) {
  if (sig.direction === 'inline') return 'in line with its seasonal-expected level';
  return `running ${Math.abs(sig.deviationPct).toFixed(1)}% ${sig.direction} its seasonal-expected level`;
}

export function liveSheepFor(liveSheep, seasonal, month) {
  return (liveSheep?.markets ?? []).map((m) => {
    const series = (seasonal?.series ?? []).find((s) => s.species === 'sheep' && s.region === m.region);
    if (!series) return null;
    return { region: m.region, weekEnding: m.weekEnding, ...liveSignal(m, series.index, month) };
  }).filter(Boolean);
}

export function liveFor(live, seasonal, sex, weightClass, month) {
  const price = (live?.prices ?? []).find((p) => p.sex === sex && p.weightClass === weightClass);
  if (!price) return null;
  const ksSeries = (seasonal?.series ?? []).find(
    (s) => s.region === 'Kansas' && s.sex === sex && s.weightClass === weightClass,
  );
  if (!ksSeries) return null;
  return {
    weekEnding: live.weekEnding,
    ...liveSignal(price, ksSeries.index, month),
  };
}
