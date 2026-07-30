export const DEFAULT_COSTS = [
  { id: 'feed', label: 'Feed & mineral', val: 2400 },
  { id: 'pasture', label: 'Pasture rent', val: 1800 },
  { id: 'labor', label: 'Labor', val: 800 },
  { id: 'vet', label: 'Vet & supplies', val: 600 },
  { id: 'equip', label: 'Equipment', val: 400 },
  { id: 'ins', label: 'Insurance', val: 250 },
];

export const DEFAULT_PASTURES = [
  { id: 'p1', name: 'North 80', acres: 80, head: 45, species: 'cattle', condition: 'Good', grazeDays: 18, totalDays: 21, resting: false, notes: '' },
  { id: 'p2', name: 'South Creek', acres: 160, head: 0, species: 'cattle', condition: 'Fair', grazeDays: 12, totalDays: 35, resting: true, notes: '' },
  { id: 'p3', name: 'Highway', acres: 40, head: 22, species: 'cattle', condition: 'Good', grazeDays: 5, totalDays: 21, resting: false, notes: '' },
  { id: 'p4', name: 'East Pasture', acres: 120, head: 34, species: 'sheep', condition: 'Good', grazeDays: 8, totalDays: 14, resting: false, notes: '' },
];
