const STORE_KEY = 'arpent.analyses';
const MAX_PER_PASTURE = 100;

function loadAll() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAll(items) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); }
  catch { /* quota */ }
}

export function saveAnalysis(pastureId, data) {
  const entry = {
    id: `a-${Date.now()}`,
    pastureId,
    date: new Date().toISOString(),
    ...data,
  };
  const all = loadAll();
  all.unshift(entry);
  const counts = {};
  const filtered = all.filter((a) => {
    counts[a.pastureId] = (counts[a.pastureId] || 0) + 1;
    return counts[a.pastureId] <= MAX_PER_PASTURE;
  });
  saveAll(filtered);
  return entry;
}

export function getAnalyses(pastureId) {
  return loadAll().filter((a) => a.pastureId === pastureId);
}

export function getLatestAnalysis(pastureId) {
  return getAnalyses(pastureId)[0] || null;
}

export function deleteAnalysis(id) {
  saveAll(loadAll().filter((a) => a.id !== id));
}

export function getProductivityTrend(pastureId) {
  const analyses = getAnalyses(pastureId);
  if (!analyses.length) return [];
  const byMonth = {};
  for (const a of analyses) {
    const d = new Date(a.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(a.usableForageLbPerAcre || 0);
  }
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({
      month,
      count: vals.length,
      avgCapacity: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
    }));
}
