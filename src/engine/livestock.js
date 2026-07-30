import { SHEEP_ANIMAL_UNIT_EQUIVALENT } from './constants.js';

export function cattleToAU(head, auPerHead = 1.0) {
  if (head < 0) throw new Error('head cannot be negative');
  if (auPerHead <= 0) throw new Error('auPerHead must be positive');
  return head * auPerHead;
}

export function sheepToAU(head) {
  if (head < 0) throw new Error('head cannot be negative');
  return head * SHEEP_ANIMAL_UNIT_EQUIVALENT;
}
