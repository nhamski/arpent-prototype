import { REFERENCE_OBJECT_LENGTHS_INCHES } from './constants.js';

export function referenceFromPreset(preset, pixelLength) {
  const real = REFERENCE_OBJECT_LENGTHS_INCHES[preset];
  if (!real) throw new Error(`Unknown reference preset "${preset}"`);
  if (pixelLength <= 0) throw new Error('pixelLength must be positive');
  return { realLengthInches: real, pixelLength };
}

export function pixelsPerInch(ref) {
  return ref.pixelLength / ref.realLengthInches;
}

export function realLengthInches(measuredPixels, ref) {
  if (measuredPixels < 0) throw new Error('measuredPixels cannot be negative');
  return measuredPixels / pixelsPerInch(ref);
}

export function realAreaSqInches(measuredPixelArea, ref) {
  if (measuredPixelArea < 0) throw new Error('measuredPixelArea cannot be negative');
  const ppi = pixelsPerInch(ref);
  return measuredPixelArea / (ppi * ppi);
}

export function sqInchesToSqFeet(areaSqInches) {
  return areaSqInches / 144.0;
}
