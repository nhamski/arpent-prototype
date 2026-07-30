import { AU_DAILY_DRY_MATTER_DEMAND, HARVEST_EFFICIENCY_TAKE_HALF } from './constants.js';

export function computeDepletion(entryStandingLbPerAcre, exitStandingLbPerAcre, paddockAcres) {
  if (entryStandingLbPerAcre < 0 || exitStandingLbPerAcre < 0) {
    throw new Error('standing forage cannot be negative');
  }
  if (paddockAcres <= 0) throw new Error('paddockAcres must be positive');

  const consumed = Math.max(entryStandingLbPerAcre - exitStandingLbPerAcre, 0);
  const utilization = entryStandingLbPerAcre > 0 ? consumed / entryStandingLbPerAcre : 0;
  const consumedTotal = consumed * paddockAcres;
  const auDays = Math.floor(consumedTotal / AU_DAILY_DRY_MATTER_DEMAND);
  const overTakeHalf = utilization > HARVEST_EFFICIENCY_TAKE_HALF;

  const notes = [];
  if (overTakeHalf) {
    notes.push(
      `Utilization ${(utilization * 100).toFixed(0)}% exceeds take-half (${(HARVEST_EFFICIENCY_TAKE_HALF * 100).toFixed(0)}%); the stand was grazed harder than the conservative limit — lengthen rest.`
    );
  }
  if (exitStandingLbPerAcre > entryStandingLbPerAcre) {
    notes.push('Exit forage exceeded entry (regrowth or measurement noise); consumption floored at zero.');
  }

  return {
    entryStandingLbPerAcre,
    exitStandingLbPerAcre,
    consumedLbPerAcre: consumed,
    utilizationFraction: utilization,
    paddockAcres,
    consumedTotalLb: consumedTotal,
    auDaysConsumed: auDays,
    overTakeHalf,
    notes,
  };
}
