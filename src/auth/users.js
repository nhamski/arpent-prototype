export const APPROVED_USERS = [
  { name: 'Brooke',            email: 'brookemehamel1@gmail.com',              requested: '2026-07-24', tier: 'pro' },
  { name: 'Zechariah Hamel',   email: 'zhamelranch@gmail.com',                requested: '2026-07-23', tier: 'pro' },
  { name: 'Tyler Lindell',     email: 'tylerlindelllincolnsae600@gmail.com',   requested: '2026-07-23', tier: 'pro' },
  { name: 'Rebecca Greenwood', email: 'jamese.beckyc@gmail.com',              requested: '2026-07-15', tier: 'pro' },
  { name: 'Melissa Lee',       email: 'missynghj4@gmail.com',                 requested: '2026-07-14', tier: 'pro' },
  { name: 'Katie Hamel',       email: 'katie14g@gmail.com',                   requested: '2026-07-13', tier: 'pro' },
  { name: 'Cody Roberts',      email: 'robertsranch94@gmail.com',             requested: '2026-07-13', tier: 'pro' },
  { name: 'Nathaniel',         email: 'novemberkilollc@gmail.com',            requested: '2026-07-13', tier: 'pro' },
];

export function isApprovedEmail(email) {
  return APPROVED_USERS.some(u => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserByEmail(email) {
  return APPROVED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}
