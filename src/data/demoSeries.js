const L = [0, 88, 94, 100, 106, 112];

function toIndex(levels) { return levels.map((l) => L[l]); }
function jitter(base, seed) { return base.map((v, i) => v + ((i + seed) % 3 - 1) * 2); }

function series(source, region, species, sex, wc, levels) {
  return { source, region, species, sex, weightClass: wc, index: toIndex(levels) };
}

export const DEMO_SERIES = [
  series('lm_ct102', 'Kansas',   'cattle', 'steer',  '300-400#', [3,4,5,4,3,2,1,1,1,2,3,3]),
  series('lm_ct102', 'Oklahoma', 'cattle', 'steer',  '300-400#', [3,4,5,4,3,2,1,1,1,2,3,3]),
  series('lm_ct102', 'Kansas',   'cattle', 'steer',  '500-600#', [3,4,5,5,4,3,2,1,1,2,3,3]),
  series('lm_ct102', 'Oklahoma', 'cattle', 'steer',  '500-600#', [3,4,5,5,4,3,2,1,1,2,3,3]),
  series('lm_ct102', 'Kansas',   'cattle', 'steer',  '600-700#', [3,3,4,5,4,3,2,1,1,2,3,3]),
  series('lm_ct102', 'Oklahoma', 'cattle', 'steer',  '600-700#', [3,3,4,5,4,3,2,1,1,2,3,3]),
  series('lm_ct102', 'Kansas',   'cattle', 'steer',  '700-800#', [3,3,4,5,5,3,2,1,1,2,3,3]),
  series('lm_ct102', 'Oklahoma', 'cattle', 'steer',  '700-800#', [3,3,4,5,5,3,2,1,1,2,3,3]),

  series('lm_ct102', 'Kansas',   'cattle', 'heifer', '300-400#', [3,4,5,4,3,2,1,1,1,2,3,3]),
  series('lm_ct102', 'Oklahoma', 'cattle', 'heifer', '300-400#', [3,4,5,4,3,2,1,1,1,2,3,3]),
  series('lm_ct102', 'Kansas',   'cattle', 'heifer', '400-500#', [3,4,5,4,3,2,1,1,1,2,3,3]),
  series('lm_ct102', 'Oklahoma', 'cattle', 'heifer', '400-500#', [3,4,5,4,3,2,1,1,1,2,3,3]),

  series('lm_lk600', 'Kansas',   'sheep',  'lamb',   'Fdr Lambs 60-90#',  [2,2,1,1,1,1,2,3,4,5,4,3]),
  series('lm_lk600', 'Colorado', 'sheep',  'lamb',   'Fdr Lambs 60-90#',  [2,2,1,1,1,1,2,3,4,5,4,3]),
  series('lm_lk600', 'Kansas',   'sheep',  'lamb',   'Slaughter Lambs',   [3,3,4,4,5,4,3,2,1,1,2,3]),
  series('lm_lk600', 'Colorado', 'sheep',  'lamb',   'Slaughter Lambs',   [3,3,4,4,5,4,3,2,1,1,2,3]),
  series('lm_lk600', 'Kansas',   'sheep',  'lamb',   'Cull Ewes',         [2,3,4,5,5,5,4,3,2,1,1,1]),
  series('lm_lk600', 'Colorado', 'sheep',  'lamb',   'Cull Ewes',         [2,3,4,5,5,5,4,3,2,1,1,1]),
];

export const DEMO_SOURCES = {
  lm_ct102: { id: 'lm_ct102', name: 'USDA MARS LM_CT102 Weekly Feeder Cattle', frequency: 'weekly' },
  lm_lk600: { id: 'lm_lk600', name: 'USDA MARS LM_LK600 Weekly Sheep', frequency: 'weekly' },
};

export const DEMO_DATA = {
  series: DEMO_SERIES,
  sources: DEMO_SOURCES,
};
