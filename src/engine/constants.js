export const HARVEST_EFFICIENCY_TAKE_HALF = 0.50;
export const ANIMAL_UNIT_WEIGHT = 1000.0;
export const AU_DAILY_INTAKE_FRACTION = 0.026;
export const AU_DAILY_DRY_MATTER_DEMAND = ANIMAL_UNIT_WEIGHT * AU_DAILY_INTAKE_FRACTION; // 26 lb/day
export const SHEEP_ANIMAL_UNIT_EQUIVALENT = 0.20;

export const REFERENCE_OBJECT_LENGTHS_INCHES = {
  forage_stick: 36.0,
  tape_measure_1ft: 12.0,
  fence_post_tpost_6ft: 72.0,
};

export const DROUGHT_CATEGORY_REDUCTION = {
  NONE: 0.00,
  D0: 0.05,
  D1: 0.10,
  D2: 0.15,
  D3: 0.25,
  D4: 0.40,
};

export const USDM_CATEGORY_COVERAGE_THRESHOLD = 0.10;
export const FREE_TIER_MONTHLY_ID_QUOTA = 10;
export const PRO_MANUAL_DROUGHT_REDUCTION_MAX = 0.60;
