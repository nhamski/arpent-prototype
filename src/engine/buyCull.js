export function buildBuyCullReport(rotationPlan, currentHerdAU, { auPerHead = null, plannedGrazingDays = null } = {}) {
  if (currentHerdAU < 0) throw new Error('currentHerdAU cannot be negative');
  if (auPerHead !== null && auPerHead <= 0) throw new Error('auPerHead must be positive');

  const recommendedMax = rotationPlan.recommendedMaxHerdAU;
  const changeAU = recommendedMax - currentHerdAU;
  const notes = [];
  let changeHead = null;
  let decision;

  if (changeAU < 0) {
    decision = 'cull';
    if (auPerHead !== null) changeHead = -Math.ceil(Math.abs(changeAU) / auPerHead);
  } else if (changeAU === 0) {
    decision = 'hold';
  } else {
    decision = 'room_to_add';
    if (auPerHead !== null) changeHead = Math.floor(changeAU / auPerHead);
  }

  if (!rotationPlan.forageFeasible) {
    notes.push('Rotation is not forage-feasible at the target residency — treat the cull recommendation as a floor, not a ceiling.');
  }
  if (plannedGrazingDays !== null && rotationPlan.totalGrazingDaysAvailable < plannedGrazingDays) {
    notes.push(`Only ${rotationPlan.totalGrazingDaysAvailable} grazing days available vs ${plannedGrazingDays} planned — expect a forage shortfall; destock or shorten the grazing period.`);
  }

  return {
    decision,
    currentHerdAU,
    recommendedMaxHerdAU: recommendedMax,
    recommendedChangeAU: changeAU,
    recommendedChangeHead: changeHead,
    forageFeasible: rotationPlan.forageFeasible,
    totalGrazingDaysAvailable: rotationPlan.totalGrazingDaysAvailable,
    notes,
  };
}
