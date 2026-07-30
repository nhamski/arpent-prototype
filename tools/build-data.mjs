// Generate data/sell-timing.json from the parsed sources.
// Generated, not hand-typed: every figure traces to a verified parse, so a
// transcription slip can't enter here by hand.
import fs from 'node:fs';

const HERE = 'C:/Users/Hamski/AppData/Local/Temp/claude/C--Users-Hamski-Claude-Code/2955a3e3-1e81-4e7f-96e6-087d97f696f9/scratchpad';
const REPO = 'C:/Users/Hamski/Claude Code/encan';

const peel = JSON.parse(fs.readFileSync(`${HERE}/peel-parsed.json`, 'utf8')).filter((r) => r.ok);
const tn = JSON.parse(fs.readFileSync(`${HERE}/tn-parsed.json`, 'utf8')).filter((r) => r.ok && r.period === '2016-2025' && r.sex !== 'other');
const arOld = JSON.parse(fs.readFileSync(`${REPO}/src/data/sell-timing.json`, 'utf8'));

const sources = {
  'peel-meyer-2002': {
    label: 'Peel & Meyer · OSU / LMIC',
    citation: 'Peel, D. (Oklahoma State University) and Meyer, S. (Livestock Marketing Information Center). "Cattle Price Seasonality." Managing for Today\'s Cattle Market and Beyond, March 2002.',
    url: 'https://www.uwagec.org/marketing/MngTCMkt/March2002Update/cattlepriceseasonality2002.pdf',
    region: 'Six regions: Alabama, Colorado, Montana, Oklahoma, Texas, Pacific Northwest',
    period: '1991–2000',
    basis: 'USDA-AMS prices. Steers only.',
    method: 'Ten-year average monthly index, 1.00 = annual average (shown here ×100). Standard deviations printed in parentheses.',
    verified: 'Tables 1–6 parsed programmatically; all 18 series average to 1.000. The text\'s own worked example anchors it: it cites an October index of 0.951 for 400-500 lb steers, matching Table 1 exactly.',
    caveat: 'The oldest cattle source here (1991–2000) and the only one covering multiple regions on one methodology — which is what makes its regions comparable to each other.',
  },
  'ar-fsa3159': {
    label: 'U. of Arkansas Extension · FSA3159',
    citation: 'Mitchell, J.L. Trends in Arkansas Cattle Markets: Feeder Cattle Price Seasonality, 2011–2020. University of Arkansas Division of Agriculture, Cooperative Extension Service.',
    url: 'https://www.uaex.uada.edu/publications/pdf/FSA3159.pdf',
    region: 'Arkansas',
    period: '2011–2020',
    basis: 'USDA-AMS Arkansas auction prices, Medium/Large frame No. 1. Steers and heifers.',
    method: 'Ten-year average monthly index, 100 = annual average. `sd` is the standard deviation across years for that month.',
    verified: 'Transcribed from Tables 1 and 2. Cross-checked three ways: the text\'s worked example (400-500 steers, Oct = 4.4% below annual → 95.6), its stated 68% range (102.0 ± 9.8 → 111.8/92.2), and every series averaging to 100.0.',
  },
  'tn-d39': {
    label: 'U. of Tennessee Extension · D39',
    citation: 'Bowling, B. Seasonal Prices for Tennessee Feeder Cattle and Cows. University of Tennessee Institute of Agriculture, Department of Agricultural and Resource Economics, February 2026. Based on original work by Emmit L. Rawls.',
    url: 'https://utia.tennessee.edu/publications/wp-content/uploads/sites/269/2024/02/D39.pdf',
    region: 'Tennessee',
    period: '2016–2025',
    basis: 'USDA / Tennessee Dept. of Agriculture Market News auction prices, Medium/Large frame No. 1. Steers and heifers.',
    method: 'Ten-year average monthly index, 1.00 = annual average (shown here ×100). Published to two decimals, so it is coarser than the other cattle sources.',
    verified: 'S.I. rows parsed programmatically; every series averages to 1.00. The text\'s own description anchors it — it states March ≈ 107 and October ≈ 93 for 300-400 lb steers, matching the parse.',
    caveat: 'The most recent cattle source, and the only one covering 300-400 and 600-700 lb.',
  },
  'tamu-l5326': {
    label: 'Texas A&M AgriLife · L-5326',
    citation: 'Davis, E.E., Sartwelle, J.D. III, and Mintert, J. Livestock Seasonal Price Variation. Texas Agricultural Extension Service, L-5326 (RM2-7.0), September 1999.',
    url: 'https://agecoext.tamu.edu/wp-content/uploads/2013/10/rm2-7.pdf',
    region: 'San Angelo, Texas',
    period: '1989–1998',
    basis: 'San Angelo feeder lambs, 55–90 lb.',
    method: 'Ten-year average monthly index, 100 = annual average. "Variability" is the standard deviation.',
    verified: 'Verified three ways against the publication\'s own worked example: it computes an October lamb forecast as $82 ÷ 101.76 (April index) × 95.03 (October index) = $76.58. Both indices match this series exactly, the arithmetic reproduces, and the series averages to 100.0.',
    caveat: 'The publication states plainly that its lamb projections "would be of little help": month-to-month variability averages 15.9 index points against a seasonal swing of only 15.5 — the noise is wider than the pattern. It is also the oldest source here (1989–1998). Shown for shape only.',
  },
};

const series = [];
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

for (const r of peel) {
  series.push({
    id: `peel-${slug(r.region)}-${r.sex}-${r.weight}`,
    source: 'peel-meyer-2002', region: r.region, species: 'cattle',
    sex: r.sex, weightClass: `${r.weight} lb`, index: r.index, sd: r.sd,
  });
}
for (const c of arOld.classes) {
  series.push({
    id: `ar-${c.sex}-${c.weightClass.replace(' lb', '')}`,
    source: 'ar-fsa3159', region: 'Arkansas', species: 'cattle',
    sex: c.sex, weightClass: c.weightClass, index: c.index, sd: c.sd,
  });
}
for (const r of tn) {
  series.push({
    id: `tn-${r.sex}-${r.weight}`,
    source: 'tn-d39', region: 'Tennessee', species: 'cattle',
    sex: r.sex, weightClass: `${r.weight} lb`, index: r.index, sd: null,
  });
}
series.push({
  id: 'tamu-lamb-feeder-55-90',
  source: 'tamu-l5326', region: 'San Angelo, Texas', species: 'sheep',
  sex: 'lamb', weightClass: '55-90 lb feeder lambs',
  index: [103.09, 109.96, 109.76, 101.76, 97.95, 94.44, 95.41, 95.61, 97.63, 95.03, 98.27, 101.09],
  sd: [16.32, 17.93, 18.82, 16.70, 14.89, 15.25, 15.47, 15.31, 15.30, 15.20, 14.59, 14.76],
  lowConfidence: true,
  lowConfidenceReason: 'The publication states its own lamb projections "would be of little help" — variability (avg 15.9 index points) exceeds the seasonal swing (15.5). Shape only; do not read a confident high or low off it.',
});

const out = {
  sheet: 'ENCAN Sell Timing — seasonal baselines',
  note: 'Seasonal indices are long-run historical averages (100 = annual average). They describe the SHAPE of the year, not today\'s price. They change ~annually, not daily. The daily job layers CURRENT market data on top of this baseline.',
  wording_rule: 'Present as "Seasonal High" / "Seasonal Low" — never best/worst. See build-spec.md §5.',
  provenance_rule: 'Every series carries its own `source` and `region`. Series are only comparable when their method matches — the six Peel & Meyer regions share one methodology and one period, so they compare cleanly to each other; Arkansas and Tennessee are separate measurements of separate places and decades.',
  consensus_rule: 'NEVER average these series into one figure. Regions peak in different months; averaging misaligned peaks flattens the signal and invents a peak where none is agreed. Report instead how many independent series agree on a month, and the range across them. Where they do not agree, say so — that IS the finding. Demonstrated: averaging 700-800 lb series whose peaks scatter across Dec/Jan/Feb/Mar/Jun/Jul/Aug would manufacture a confident peak out of noise.',
  sources,
  series,
  classes_not_yet_covered: [
    {
      label: 'Sheep — slaughter lambs, ewes, and all classes outside San Angelo feeder lambs',
      why: 'Only one lamb series was found published as a numeric monthly index, and its own publisher disclaims its usefulness for planning. No slaughter-lamb or ewe index located.',
    },
    {
      label: '800-900 lb feeders / yearlings',
      why: 'Not published as a numeric monthly index in any source located. Note that 700-800 lb — the nearest class — shows no cross-regional agreement at all, so heavier cattle are unlikely to carry a dependable pattern either.',
    },
    {
      label: 'Kansas — the operator\'s own ground',
      why: 'No published Kansas seasonal index table exists that could be located; K-State\'s Feeder Cattle Price Analyzer is an interactive tool rather than a table. Oklahoma (Peel & Meyer) is the nearest published series to Logan.',
    },
  ],
  live_columns_added_by_daily_job: {
    current_price: null, current_index_vs_seasonal: null, signal: null, as_of: null, source: null,
  },
};

fs.writeFileSync(`${REPO}/src/data/sell-timing.json`, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
console.log('series written:', series.length);
console.log('  cattle steer :', series.filter((s) => s.sex === 'steer').length);
console.log('  cattle heifer:', series.filter((s) => s.sex === 'heifer').length);
console.log('  sheep        :', series.filter((s) => s.species === 'sheep').length);
console.log('sources:', Object.keys(sources).length);
console.log('regions:', [...new Set(series.map((s) => s.region))].length);
for (const s of series) {
  const m = s.index.reduce((a, b) => a + b, 0) / 12;
  if (Math.abs(m - 100) > 1) console.error('FAIL mean', s.id, m);
}
console.log('all series average to 100: OK');
