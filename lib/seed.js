// Seed data for the Servio demo store. Loaded into localStorage on first run.
export const COIN_PKR = 10; // 1 coin = PKR 10, so a 5-coin reveal = PKR 50

// Category tile tints, copied exactly from the prototype (TINTS, by category index).
export const TINTS = ['#EDE8DD', '#E3DDD0', '#EADFD6', '#DDE0D8', '#E8E0CC', '#E6DAD3', '#D9DEE3', '#EDE6DA', '#DFE3DC', '#E8DFD0'];

export const CATEGORIES = [
  { id: 'plumber',    en: 'Plumber',                  ro: 'Plumber',              ur: 'پلمبر',            icon: '💧' },
  { id: 'electrician',en: 'Electrician',              ro: 'Bijli Wala',           ur: 'بجلی والا',        icon: '⚡' },
  { id: 'ac',         en: 'AC Technician',            ro: 'AC Wala',              ur: 'اے سی والا',       icon: '❄️' },
  { id: 'carpenter',  en: 'Carpenter',                ro: 'Barhai',               ur: 'بڑھئی',            icon: '🪚' },
  { id: 'painter',    en: 'Painter',                  ro: 'Painter',              ur: 'پینٹر',            icon: '🎨' },
  { id: 'geyser',     en: 'Geyser/Appliance Repair',  ro: 'Geyser / Appliance',   ur: 'گیزر / آلات مرمت', icon: '🔥' },
  { id: 'mobile',     en: 'Mobile Repair',            ro: 'Mobile Repair',        ur: 'موبائل مرمت',      icon: '📱' },
  { id: 'computer',   en: 'Computer/Laptop Repair',   ro: 'Computer / Laptop',    ur: 'کمپیوٹر / لیپ ٹاپ', icon: '💻' },
  { id: 'cctv',       en: 'CCTV Installation',        ro: 'CCTV Lagwana',         ur: 'سی سی ٹی وی',      icon: '📷' },
  { id: 'handyman',   en: 'Handyman/General Labour',  ro: 'Har Kaam Wala',        ur: 'ہر کام والا',      icon: '🧰' },
];

export const AREAS = ['Depalpur', 'Haveli Lakha', 'Hujra Shah Muqeem', 'Basirpur', 'Okara City', 'Okara Cantt'];

export function seedDB() {
  const now = Date.now();
  return {
    version: 1,
    users: [
      { id: 'u-ayesha', name: 'Ayesha', phone: '0300-1111111', role: 'seeker', status: 'active' },
      { id: 'u-imran', name: 'Imran (Shop)', phone: '0300-4444444', role: 'seeker', status: 'active' },
      { id: 'u-rafiq', name: 'Rafiq Ahmed', phone: '0300-2222222', role: 'provider', status: 'active' },
      { id: 'u-bilal', name: 'Bilal Hussain', phone: '0300-3333333', role: 'provider', status: 'active' },
      { id: 'u-shahid', name: 'Shahid Mehmood', phone: '0300-5555555', role: 'provider', status: 'active' },
      { id: 'u-usman', name: 'Usman Ali', phone: '0300-6666666', role: 'provider', status: 'active' },
      { id: 'u-admin', name: 'Admin', phone: '0300-9999999', role: 'admin', status: 'active', pin: '9999' },
    ],
    providers: {
      'u-rafiq':  { categories: ['electrician'], areas: ['Depalpur', 'Basirpur'], experience: 8, price: 1500, availability: true, ratingAvg: 4.8, ratingCount: 21, bio: 'Fan, wiring, UPS aur switch board ka kaam.' },
      'u-bilal':  { categories: ['plumber'], areas: ['Depalpur', 'Haveli Lakha'], experience: 5, price: 1000, availability: true, ratingAvg: 4.6, ratingCount: 14, bio: 'Tap, pipe aur bathroom fitting.' },
      'u-shahid': { categories: ['carpenter'], areas: ['Okara City', 'Okara Cantt'], experience: 10, price: 2000, availability: true, ratingAvg: 4.9, ratingCount: 30, bio: 'Darwaza, almari aur furniture repair.' },
      'u-usman':  { categories: ['ac'], areas: ['Okara City', 'Depalpur'], experience: 6, price: 2500, availability: false, ratingAvg: 4.5, ratingCount: 11, bio: 'AC service, gas refill aur installation.' },
    },
    wallets: {
      'u-rafiq':  { balance: 40, txns: [{ id: 't-r1', type: 'starter', amount: 40, note: 'Starter coins', at: now - 86400000 }] },
      'u-bilal':  { balance: 3,  txns: [{ id: 't-b1', type: 'starter', amount: 40, note: 'Starter coins', at: now - 86400000 }, { id: 't-b2', type: 'reveal', amount: -37, note: 'Numbers shown (demo history)', at: now - 3600000 }] },
      'u-shahid': { balance: 25, txns: [{ id: 't-s1', type: 'starter', amount: 40, note: 'Starter coins', at: now - 86400000 }, { id: 't-s2', type: 'reveal', amount: -15, note: 'Numbers shown', at: now - 7200000 }] },
      'u-usman':  { balance: 18, txns: [{ id: 't-u1', type: 'starter', amount: 40, note: 'Starter coins', at: now - 86400000 }, { id: 't-u2', type: 'reveal', amount: -22, note: 'Numbers shown (demo history)', at: now - 7200000 }] },
    },
    categories: CATEGORIES.map((c) => ({ ...c, active: true })),
    areas: AREAS.map((name) => ({ name, active: true })),
    jobs: [
      { id: 'job-1', seekerId: 'u-ayesha', categoryId: 'electrician', description: 'Ceiling fan is making noise and running very slow. Need it fixed today.', area: 'Depalpur', urgency: 'Today', status: 'open', revealCount: 0, at: now - 1800000 },
      { id: 'job-2', seekerId: 'u-imran', categoryId: 'plumber', description: 'Shop washroom tap is leaking continuously, water is wasted.', area: 'Okara City', urgency: 'Today', status: 'open', revealCount: 0, at: now - 3600000 },
      { id: 'job-3', seekerId: 'u-ayesha', categoryId: 'ac', description: 'Split AC cooling is weak, maybe gas is low. Service needed this week.', area: 'Depalpur', urgency: 'This week', status: 'open', revealCount: 0, at: now - 7200000 },
    ],
    bids: [
      { id: 'bid-1', jobId: 'job-1', providerId: 'u-rafiq', priceType: 'fixed', price: 1500, priceTo: null, visitCharge: null, message: 'Main aaj sham tak aa sakta hoon, fan check karke theek kar dunga.', status: 'active', at: now - 900000 },
      { id: 'bid-2', jobId: 'job-2', providerId: 'u-bilal', priceType: 'range', price: 800, priceTo: 1200, visitCharge: null, message: 'Tap change ho sakta hai, pehle dekhna hoga.', status: 'active', at: now - 1800000 },
      // Held bid: message contains a phone number, waiting in admin "Numbers check".
      { id: 'bid-3', jobId: 'job-3', providerId: 'u-usman', priceType: 'visit', price: null, priceTo: null, visitCharge: 500, message: 'Mujhe direct call kar lein 0300-6666666 main aa jaunga.', status: 'held', at: now - 5400000 },
    ],
    reveals: [
      // One historic reveal that has a pending refund claim for the admin demo.
      { id: 'rev-0', jobId: 'job-2', seekerId: 'u-imran', providerId: 'u-shahid', coins: 5, at: now - 90000000, refunded: false },
    ],
    reviews: [],
    topups: [
      { id: 'top-1', providerId: 'u-shahid', coins: 20, pkr: 200, method: 'JazzCash', ref: 'TXN-DEMO-1', status: 'pending', at: now - 2700000 },
    ],
    refunds: [
      { id: 'ref-1', revealId: 'rev-0', providerId: 'u-shahid', reason: 'no-answer', status: 'pending', at: now - 80000000 },
    ],
    notifications: [],
    activity: [
      { id: 'act-1', text: 'Demo data loaded — 4 providers, 3 jobs live.', at: now - 3600000 },
    ],
    lastEvent: null,
  };
}
