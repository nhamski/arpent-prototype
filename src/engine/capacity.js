import {
  AU_DAILY_DRY_MATTER_DEMAND,
  HARVEST_EFFICIENCY_TAKE_HALF,
  SHEEP_ANIMAL_UNIT_EQUIVALENT,
} from './constants.js';
import { getSpecies } from './species.js';

export function computeCapacity(measured, {
  harvestEfficiency = HARVEST_EFFICIENCY_TAKE_HALF,
  droughtReduction = 0,
} = {}) {
  if (!measured.length) throw new Error('measured species list is empty');
  if (harvestEfficiency <= 0 || harvestEfficiency > HARVEST_EFFICIENCY_TAKE_HALF) {
    throw new Error(`harvestEfficiency must be in (0, ${HARVEST_EFFICIENCY_TAKE_HALF}]`);
  }
  if (droughtReduction < 0 || droughtReduction >= 1) {
    throw new Error(`droughtReduction must be in [0, 1)`);
  }

  const totalShare = measured.reduce((a, m) => a + m.share, 0);
  if (totalShare > 1.0 + 1e-6) throw new Error(`composition shares sum to ${totalShare} (> 1.0)`);

  const contributions = [];
  let standing = 0;

  for (const m of measured) {
    const species = getSpecies(m.speciesId);
    const density = species.density;
    const contribution = m.share * m.meanHeightInches * density;
    standing += contribution;
    contributions.push({
      speciesId: m.speciesId,
      share: m.share,
      meanHeightInches: m.meanHeightInches,
      densityLbPerAcreInch: density,
      standingLbPerAcre: contribution,
    });
  }

  const available = standing * harvestEfficiency;
  const droughtAdjusted = available * (1.0 - droughtReduction);
  const usable = Math.floor(droughtAdjusted);

  const sheepDailyDemand = SHEEP_ANIMAL_UNIT_EQUIVALENT * AU_DAILY_DRY_MATTER_DEMAND;

  return {
    standingForageLbPerAcre: standing,
    availableForageLbPerAcre: available,
    droughtReductionApplied: droughtReduction,
    usableForageLbPerAcre: usable,
    capacityThousandLbPerAcre: usable / 1000.0,
    cattleAUDaysPerAcre: Math.floor(usable / AU_DAILY_DRY_MATTER_DEMAND),
    sheepDaysPerAcre: Math.floor(usable / sheepDailyDemand),
    harvestEfficiency,
    contributions,
  };
}

export function standingForage(measured) {
  let total = 0;
  for (const m of measured) {
    total += m.share * m.meanHeightInches * getSpecies(m.speciesId).density;
  }
  return total;
}
