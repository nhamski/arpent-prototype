import { AU_DAILY_DRY_MATTER_DEMAND } from './constants.js';
import { getSpecies } from './species.js';

const DEFAULT_TARGET_RESIDENCY_DAYS = 5;

const WINTER_DORMANT_MULTIPLIER = 2.0;
const SHOULDER_MULTIPLIER = 1.25;
const PEAK_MULTIPLIER = 1.0;

export function seasonFromMonth(month) {
  if (month < 1 || month > 12) throw new Error(`month must be 1-12, got ${month}`);
  if ([12, 1, 2].includes(month)) return 'winter';
  if ([3, 4, 5].includes(month)) return 'spring';
  if ([6, 7, 8].includes(month)) return 'summer';
  return 'fall';
}

export function seasonRestMultiplier(growthSeason, season) {
  if (season === 'winter') return WINTER_DORMANT_MULTIPLIER;
  if (growthSeason === 'warm') {
    return season === 'summer' ? PEAK_MULTIPLIER : SHOULDER_MULTIPLIER;
  }
  return season === 'summer' ? SHOULDER_MULTIPLIER : PEAK_MULTIPLIER;
}

export function requiredRestDays(speciesIds, season) {
  if (!speciesIds.length) throw new Error('speciesIds is empty');
  let worst = 0;
  for (const sid of speciesIds) {
    const species = getSpecies(sid);
    const adjusted = species.restDays * seasonRestMultiplier(species.season, season);
    worst = Math.max(worst, adjusted);
  }
  return Math.ceil(worst);
}

export function planRotation({
  usableForageLbPerAcre,
  pastureAcres,
  herdAnimalUnits,
  speciesIds,
  season,
  targetResidencyDays = DEFAULT_TARGET_RESIDENCY_DAYS,
}) {
  if (pastureAcres <= 0) throw new Error('pastureAcres must be positive');
  if (herdAnimalUnits <= 0) throw new Error('herdAnimalUnits must be positive');
  if (usableForageLbPerAcre < 0) throw new Error('usableForageLbPerAcre cannot be negative');
  if (targetResidencyDays < 1) throw new Error('targetResidencyDays must be at least 1');

  const reqRest = requiredRestDays(speciesIds, season);
  const numPaddocks = Math.ceil(reqRest / targetResidencyDays) + 1;
  const paddockAcres = pastureAcres / numPaddocks;

  const paddockUsableLb = usableForageLbPerAcre * paddockAcres;
  const paddockAUDays = paddockUsableLb / AU_DAILY_DRY_MATTER_DEMAND;

  const forageResidencyLimit = Math.floor(paddockAUDays / herdAnimalUnits);
  const forageFeasible = forageResidencyLimit >= targetResidencyDays;

  const residency = Math.min(targetResidencyDays, Math.max(forageResidencyLimit, 0));
  const restAchieved = (numPaddocks - 1) * residency;
  const restMet = restAchieved >= reqRest && residency >= 1;

  const denom = AU_DAILY_DRY_MATTER_DEMAND * targetResidencyDays;
  const recommendedMaxHerdAU = Math.floor(paddockUsableLb / denom);

  const totalAUDays = Math.floor(
    (usableForageLbPerAcre * pastureAcres) / AU_DAILY_DRY_MATTER_DEMAND
  );
  const grazingDaysAvailable = Math.floor(totalAUDays / herdAnimalUnits);

  const notes = [];
  if (!forageFeasible) {
    notes.push(
      `OVERSTOCKED for the target residency: each paddock cannot feed the herd for ${targetResidencyDays} day(s). Reduce herd to about ${recommendedMaxHerdAU} AU, add acreage, or shorten the season.`
    );
  }
  if (residency < 1) {
    notes.push(
      'Forage cannot support this herd for even one day on a paddock of this size — do not turn out; destock or supplement.'
    );
  }
  if (!restMet && forageFeasible) {
    notes.push(
      'Rest requirement not met at the forage-limited residency; consider more paddocks or a longer rest interval.'
    );
  }

  return {
    numPaddocks,
    paddockAcres,
    residencyDaysPerPaddock: residency,
    restPeriodDays: restAchieved,
    requiredRestDays: reqRest,
    restRequirementMet: restMet,
    cycleLengthDays: numPaddocks * residency,
    forageFeasible,
    recommendedMaxHerdAU,
    totalGrazingDaysAvailable: grazingDaysAvailable,
    notes,
  };
}
