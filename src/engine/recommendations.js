import { SPECIES_CATALOG } from './species.js';

const TOLERANCE_POINTS = { low: 0, moderate: 1, high: 2 };
const SEVERITY_WEIGHT = { NONE: 1, D0: 1, D1: 2, D2: 2, D3: 3, D4: 3 };

export function recommendSpecies({
  droughtCategory = 'NONE',
  preferNative = true,
  desiredSeason = null,
} = {}, limit = 5) {
  if (limit < 1) throw new Error('limit must be at least 1');

  const severityWeight = SEVERITY_WEIGHT[droughtCategory] ?? 1;
  const scored = [];

  for (const species of Object.values(SPECIES_CATALOG)) {
    let score = 0;
    if (preferNative && species.native) score += 3;
    if (desiredSeason === null) {
      score += 1;
    } else if (species.season === desiredSeason) {
      score += 2;
    }
    score += (TOLERANCE_POINTS[species.drought] ?? 0) * severityWeight;

    const parts = [species.native ? 'native' : 'introduced (non-native)'];
    parts.push(`${species.season}-season`);
    parts.push(`${species.drought} drought tolerance`);
    if (['D2', 'D3', 'D4'].includes(droughtCategory)) parts.push('weighted for current drought');

    scored.push({
      speciesId: species.id,
      commonName: species.name,
      native: species.native,
      growthSeason: species.season,
      droughtTolerance: species.drought,
      preferredSeedingMethod: species.seeding[0],
      score,
      rationale: parts.join('; '),
    });
  }

  scored.sort((a, b) => b.score - a.score || (a.native === b.native ? 0 : a.native ? -1 : 1) || a.commonName.localeCompare(b.commonName));
  return scored.slice(0, limit);
}
