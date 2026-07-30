const WSN_TALL = 200.0;
const WSN_MID = 175.0;
const WSN_SHORT = 150.0;
const CSN = 150.0;
const CSI = 150.0;
const CSI_LOW = 125.0;
const ALFALFA = 200.0;
const LEGUME = 150.0;

export const SPECIES_CATALOG = {
  big_bluestem:           { id: 'big_bluestem',           name: 'Big bluestem',           scientific: 'Andropogon gerardii',         season: 'warm', native: true,  density: WSN_TALL,  restDays: 45, drought: 'high',     seeding: ['no_till_drill', 'broadcast'] },
  little_bluestem:        { id: 'little_bluestem',        name: 'Little bluestem',        scientific: 'Schizachyrium scoparium',     season: 'warm', native: true,  density: WSN_MID,   restDays: 45, drought: 'high',     seeding: ['no_till_drill', 'broadcast'] },
  indiangrass:            { id: 'indiangrass',            name: 'Indiangrass',            scientific: 'Sorghastrum nutans',          season: 'warm', native: true,  density: WSN_TALL,  restDays: 45, drought: 'moderate', seeding: ['no_till_drill', 'broadcast'] },
  switchgrass:            { id: 'switchgrass',            name: 'Switchgrass',            scientific: 'Panicum virgatum',            season: 'warm', native: true,  density: WSN_TALL,  restDays: 45, drought: 'moderate', seeding: ['no_till_drill', 'broadcast', 'hydroseed'] },
  sideoats_grama:         { id: 'sideoats_grama',         name: 'Sideoats grama',         scientific: 'Bouteloua curtipendula',      season: 'warm', native: true,  density: WSN_MID,   restDays: 35, drought: 'high',     seeding: ['no_till_drill', 'broadcast'] },
  blue_grama:             { id: 'blue_grama',             name: 'Blue grama',             scientific: 'Bouteloua gracilis',          season: 'warm', native: true,  density: WSN_SHORT, restDays: 30, drought: 'high',     seeding: ['no_till_drill', 'broadcast'] },
  buffalograss:           { id: 'buffalograss',           name: 'Buffalograss',           scientific: 'Bouteloua dactyloides',       season: 'warm', native: true,  density: WSN_SHORT, restDays: 30, drought: 'high',     seeding: ['no_till_drill', 'broadcast'] },
  western_wheatgrass:     { id: 'western_wheatgrass',     name: 'Western wheatgrass',     scientific: 'Pascopyrum smithii',          season: 'cool', native: true,  density: CSN,       restDays: 35, drought: 'high',     seeding: ['no_till_drill', 'broadcast'] },
  green_needlegrass:      { id: 'green_needlegrass',      name: 'Green needlegrass',      scientific: 'Nassella viridula',           season: 'cool', native: true,  density: CSN,       restDays: 35, drought: 'moderate', seeding: ['no_till_drill', 'broadcast'] },
  smooth_brome:           { id: 'smooth_brome',           name: 'Smooth brome',           scientific: 'Bromus inermis',              season: 'cool', native: false, density: CSI,       restDays: 30, drought: 'moderate', seeding: ['no_till_drill', 'broadcast'] },
  crested_wheatgrass:     { id: 'crested_wheatgrass',     name: 'Crested wheatgrass',     scientific: 'Agropyron cristatum',         season: 'cool', native: false, density: CSI,       restDays: 30, drought: 'high',     seeding: ['no_till_drill', 'broadcast'] },
  tall_fescue:            { id: 'tall_fescue',            name: 'Tall fescue',            scientific: 'Schedonorus arundinaceus',    season: 'cool', native: false, density: CSI,       restDays: 25, drought: 'moderate', seeding: ['no_till_drill', 'broadcast', 'hydroseed'] },
  kentucky_bluegrass:     { id: 'kentucky_bluegrass',     name: 'Kentucky bluegrass',     scientific: 'Poa pratensis',               season: 'cool', native: false, density: CSI_LOW,   restDays: 25, drought: 'low',      seeding: ['no_till_drill', 'broadcast', 'hydroseed'] },
  orchardgrass:           { id: 'orchardgrass',           name: 'Orchardgrass',           scientific: 'Dactylis glomerata',          season: 'cool', native: false, density: CSI,       restDays: 25, drought: 'moderate', seeding: ['no_till_drill', 'broadcast'] },
  timothy:                { id: 'timothy',                name: 'Timothy',                scientific: 'Phleum pratense',             season: 'cool', native: false, density: CSI,       restDays: 25, drought: 'low',      seeding: ['no_till_drill', 'broadcast'] },
  perennial_ryegrass:     { id: 'perennial_ryegrass',     name: 'Perennial ryegrass',     scientific: 'Lolium perenne',              season: 'cool', native: false, density: CSI,       restDays: 20, drought: 'low',      seeding: ['no_till_drill', 'broadcast', 'hydroseed'] },
  intermediate_wheatgrass:{ id: 'intermediate_wheatgrass',name: 'Intermediate wheatgrass',scientific: 'Thinopyrum intermedium',      season: 'cool', native: false, density: CSI,       restDays: 30, drought: 'high',     seeding: ['no_till_drill', 'broadcast'] },
  sand_bluestem:          { id: 'sand_bluestem',          name: 'Sand bluestem',          scientific: 'Andropogon hallii',           season: 'warm', native: true,  density: WSN_TALL,  restDays: 45, drought: 'high',     seeding: ['no_till_drill', 'broadcast'] },
  prairie_sandreed:       { id: 'prairie_sandreed',       name: 'Prairie sandreed',       scientific: 'Calamovilfa longifolia',      season: 'warm', native: true,  density: WSN_MID,   restDays: 40, drought: 'high',     seeding: ['no_till_drill', 'broadcast'] },
  canada_wildrye:         { id: 'canada_wildrye',         name: 'Canada wildrye',         scientific: 'Elymus canadensis',           season: 'cool', native: true,  density: CSN,       restDays: 35, drought: 'moderate', seeding: ['no_till_drill', 'broadcast'] },
  alfalfa:                { id: 'alfalfa',                name: 'Alfalfa',                scientific: 'Medicago sativa',             season: 'cool', native: false, density: ALFALFA,    restDays: 32, drought: 'high',     seeding: ['no_till_drill', 'broadcast'] },
  red_clover:             { id: 'red_clover',             name: 'Red clover',             scientific: 'Trifolium pratense',          season: 'cool', native: false, density: LEGUME,     restDays: 28, drought: 'moderate', seeding: ['no_till_drill', 'broadcast'] },
  white_clover:           { id: 'white_clover',           name: 'White clover',           scientific: 'Trifolium repens',            season: 'cool', native: false, density: LEGUME,     restDays: 25, drought: 'low',      seeding: ['no_till_drill', 'broadcast'] },
  birdsfoot_trefoil:      { id: 'birdsfoot_trefoil',      name: 'Birdsfoot trefoil',      scientific: 'Lotus corniculatus',          season: 'cool', native: false, density: LEGUME,     restDays: 30, drought: 'moderate', seeding: ['no_till_drill', 'broadcast'] },
  purple_prairie_clover:  { id: 'purple_prairie_clover',  name: 'Purple prairie clover',  scientific: 'Dalea purpurea',              season: 'warm', native: true,  density: LEGUME,     restDays: 35, drought: 'high',     seeding: ['no_till_drill', 'broadcast'] },
};

const byScientificName = Object.fromEntries(
  Object.values(SPECIES_CATALOG).map(s => [s.scientific.toLowerCase(), s.id])
);

export function speciesIdForScientificName(name) {
  return byScientificName[name.trim().toLowerCase()] ?? null;
}

export function getSpecies(id) {
  const s = SPECIES_CATALOG[id];
  if (!s) throw new Error(`Unknown species_id "${id}". Known: ${Object.keys(SPECIES_CATALOG).sort().join(', ')}`);
  return s;
}
