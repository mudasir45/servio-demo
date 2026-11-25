// Seed data for the Servio demo store. Loaded into localStorage on first run.
export const COIN_PKR = 10; // 1 coin = PKR 10, so a 5-coin reveal = PKR 50

// Category tile tints, copied exactly from the prototype (TINTS, by category index).
export const TINTS = ['#EDE8DD', '#E3DDD0', '#EADFD6', '#DDE0D8', '#E8E0CC', '#E6DAD3', '#D9DEE3', '#EDE6DA', '#DFE3DC', '#E8DFD0'];

// Category groups: the 10 services live in 3 groups so the list stays
// scannable as more categories are added. Labels in all three UI languages.
export const GROUPS = [
  { id: 'bijli',    ro: 'Bijli aur AC',       ur: 'بجلی اور اے سی',   en: 'Electricity & AC' },
  { id: 'marammat', ro: 'Ghar ki Marammat',   ur: 'گھر کی مرمت',      en: 'Home Repair' },
  { id: 'mobilepc', ro: 'Mobile aur Computer', ur: 'موبائل اور کمپیوٹر', en: 'Mobile & Computer' },
];
export function groupLabel(id, lang) {
  const g = GROUPS.find((x) => x.id === id);
  if (!g) return id || '';
  return lang === 'ur' ? g.ur : lang === 'en' ? g.en : g.ro;
}

// Each category: `group` (one of GROUPS), `words` (local search words —
// Roman Urdu, Urdu script and English synonyms a seeker might say or type),
// `popular` (rank among the most-used services, null = not popular), and
// `subs` — the specialities a provider can pick inside this category
// (platform-provided chips in local words, max 5 per category; deliberately
// NOT Fiverr-style gigs: one profile, one visit charge, no per-service price).
export const CATEGORIES = [
  { id: 'plumber',    en: 'Plumber',                  ro: 'Plumber',              ur: 'پلمبر',            icon: '💧', group: 'marammat', popular: 2,    words: ['nal', 'nalkay', 'pani', 'tap', 'pipe', 'bathroom', 'leak', 'plumbing', 'پلمبر', 'نل', 'پانی'],
    subs: [
      { id: 'tap', ro: 'Nal / Tap theek', en: 'Tap repair', ur: 'نل / ٹونٹی ٹھیک کرنا' },
      { id: 'bathroom', ro: 'Bathroom fitting', en: 'Bathroom fitting', ur: 'باتھ روم فٹنگ' },
      { id: 'leakage', ro: 'Leakage theek', en: 'Leakage repair', ur: 'لیکج ٹھیک کرنا' },
      { id: 'tank', ro: 'Pani ki Tanki', en: 'Water tank', ur: 'پانی کی ٹینکی' },
      { id: 'motor', ro: 'Motor / Pump', en: 'Motor / Pump', ur: 'موٹر / پمپ' },
      { id: 'pipeline', ro: 'Pipe Line', en: 'Pipe line', ur: 'پائپ لائن' },
      { id: 'seat', ro: 'Commode / Seat fitting', en: 'Commode / Seat fitting', ur: 'کموڈ / سیٹ فٹنگ' },
    ] },
  { id: 'electrician',en: 'Electrician',              ro: 'Bijli Wala',           ur: 'بجلی والا',        icon: '⚡', group: 'bijli',    popular: 1,    words: ['bijli', 'wiring', 'pankha', 'fan', 'switch', 'light', 'current', 'بجلی', 'پنکھا'],
    subs: [
      { id: 'wiring', ro: 'Ghar ki Wiring', en: 'House wiring', ur: 'گھر کی وائرنگ' },
      { id: 'fan', ro: 'Pankha / Fan', en: 'Fan', ur: 'پنکھا' },
      { id: 'ups', ro: 'UPS / Inverter', en: 'UPS / Inverter', ur: 'یو پی ایس / انورٹر' },
      { id: 'switchboard', ro: 'Switch Board', en: 'Switch board', ur: 'سوئچ بورڈ' },
      { id: 'shortcircuit', ro: 'Short Circuit', en: 'Short circuit', ur: 'شارٹ سرکٹ' },
      { id: 'lights', ro: 'Light Fitting', en: 'Light fitting', ur: 'لائٹ فٹنگ' },
      { id: 'dbbox', ro: 'Meter / DB Box', en: 'Meter / DB box', ur: 'میٹر / ڈی بی باکس' },
    ] },
  { id: 'ac',         en: 'AC Technician',            ro: 'AC Wala',              ur: 'اے سی والا',       icon: '❄️', group: 'bijli',    popular: 3,    words: ['cooling', 'gas', 'service', 'thanda', 'اے سی', 'کولنگ'],
    subs: [
      { id: 'service', ro: 'AC Service', en: 'AC service', ur: 'اے سی سروس' },
      { id: 'gas', ro: 'Gas Refill', en: 'Gas refill', ur: 'گیس بھرنا' },
      { id: 'install', ro: 'AC Lagwana', en: 'AC installation', ur: 'اے سی لگوانا' },
      { id: 'repair', ro: 'AC Repair', en: 'AC repair', ur: 'اے سی مرمت' },
      { id: 'shifting', ro: 'AC Shifting', en: 'AC shifting', ur: 'اے سی شفٹنگ' },
    ] },
  { id: 'carpenter',  en: 'Carpenter',                ro: 'Barhai',               ur: 'بڑھئی',            icon: '🪚', group: 'marammat', popular: null, words: ['lakri', 'darwaza', 'almari', 'barhai', 'furniture', 'بڑھئی', 'لکڑی', 'الماری'],
    subs: [
      { id: 'darwaza', ro: 'Darwaza', en: 'Doors', ur: 'دروازہ' },
      { id: 'almari', ro: 'Almari / Wardrobe', en: 'Wardrobe', ur: 'الماری / وارڈروب' },
      { id: 'furniture', ro: 'Furniture Repair', en: 'Furniture repair', ur: 'فرنیچر مرمت' },
      { id: 'kitchen', ro: 'Kitchen ka Kaam', en: 'Kitchen cabinets', ur: 'کچن کا کام' },
      { id: 'frame', ro: 'Bed / Sofa Frame', en: 'Bed / sofa frame', ur: 'بیڈ / صوفہ فریم' },
    ] },
  { id: 'painter',    en: 'Painter',                  ro: 'Painter',              ur: 'پینٹر',            icon: '🎨', group: 'marammat', popular: 4,    words: ['rang', 'safedi', 'paint', 'deewar', 'پینٹ', 'رنگ'],
    subs: [
      { id: 'safedi', ro: 'Safedi / Rang', en: 'House painting', ur: 'سفیدی / رنگ' },
      { id: 'weather', ro: 'Bahar ka Rang', en: 'Exterior / weather sheet', ur: 'باہر کا رنگ' },
      { id: 'texture', ro: 'Texture / Design', en: 'Texture / design', ur: 'ٹیکسچر / ڈیزائن' },
      { id: 'polish', ro: 'Furniture Polish', en: 'Furniture polish', ur: 'فرنیچر پالش' },
      { id: 'damp', ro: 'Seepage / Damp', en: 'Seepage / damp', ur: 'نمی / سیپیج' },
    ] },
  { id: 'geyser',     en: 'Geyser/Appliance Repair',  ro: 'Geyser / Appliance',   ur: 'گیزر / آلات مرمت', icon: '🔥', group: 'marammat', popular: null, words: ['garam pani', 'heater', 'appliance', 'گیزر'],
    subs: [
      { id: 'grepair', ro: 'Geyser Repair', en: 'Geyser repair', ur: 'گیزر مرمت' },
      { id: 'ginstall', ro: 'Geyser Lagwana', en: 'Geyser installation', ur: 'گیزر لگوانا' },
      { id: 'fridge', ro: 'Fridge Repair', en: 'Fridge repair', ur: 'فریج مرمت' },
      { id: 'washing', ro: 'Washing Machine', en: 'Washing machine', ur: 'واشنگ مشین' },
      { id: 'oven', ro: 'Chulha / Oven', en: 'Stove / oven', ur: 'چولہا / اوون' },
      { id: 'dispenser', ro: 'Water Dispenser', en: 'Water dispenser', ur: 'واٹر ڈسپنسر' },
    ] },
  { id: 'mobile',     en: 'Mobile Repair',            ro: 'Mobile Repair',        ur: 'موبائل مرمت',      icon: '📱', group: 'mobilepc', popular: null, words: ['phone', 'screen', 'battery', 'موبائل', 'فون'],
    subs: [
      { id: 'screen', ro: 'Screen Change', en: 'Screen change', ur: 'اسکرین تبدیل' },
      { id: 'battery', ro: 'Battery Change', en: 'Battery change', ur: 'بیٹری تبدیل' },
      { id: 'software', ro: 'Software / Flashing', en: 'Software / flashing', ur: 'سافٹ ویئر / فلیشنگ' },
      { id: 'charging', ro: 'Charging Port', en: 'Charging port', ur: 'چارجنگ پورٹ' },
      { id: 'water', ro: 'Pani mein Gira', en: 'Water damage', ur: 'پانی میں گرا' },
      { id: 'speaker', ro: 'Camera / Speaker', en: 'Camera / speaker', ur: 'کیمرہ / اسپیکر' },
    ] },
  { id: 'computer',   en: 'Computer/Laptop Repair',   ro: 'Computer / Laptop',    ur: 'کمپیوٹر / لیپ ٹاپ', icon: '💻', group: 'mobilepc', popular: null, words: ['laptop', 'pc', 'windows', 'کمپیوٹر', 'لیپ ٹاپ'],
    subs: [
      { id: 'windows', ro: 'Windows / Software', en: 'Windows / software', ur: 'ونڈوز / سافٹ ویئر' },
      { id: 'cscreen', ro: 'Laptop Screen', en: 'Laptop screen', ur: 'لیپ ٹاپ اسکرین' },
      { id: 'slow', ro: 'Slow / Virus Fix', en: 'Slow / virus fix', ur: 'سلو / وائرس ٹھیک' },
      { id: 'data', ro: 'Data Recovery', en: 'Data recovery', ur: 'ڈیٹا ریکوری' },
      { id: 'upgrade', ro: 'RAM / SSD Upgrade', en: 'RAM / SSD upgrade', ur: 'ریم / ایس ایس ڈی اپ گریڈ' },
      { id: 'printer', ro: 'Printer Setup', en: 'Printer setup', ur: 'پرنٹر سیٹ اپ' },
    ] },
  { id: 'cctv',       en: 'CCTV Installation',        ro: 'CCTV Lagwana',         ur: 'سی سی ٹی وی',      icon: '📷', group: 'bijli',    popular: null, words: ['camera', 'security', 'کیمرہ', 'سی سی ٹی وی'],
    subs: [
      { id: 'newinstall', ro: 'Nayi Installation', en: 'New installation', ur: 'نئی انسٹالیشن' },
      { id: 'camrepair', ro: 'Camera Repair', en: 'Camera repair', ur: 'کیمرہ مرمت' },
      { id: 'dvr', ro: 'DVR / NVR Setup', en: 'DVR / NVR setup', ur: 'ڈی وی آر / این وی آر سیٹ اپ' },
      { id: 'online', ro: 'Mobile par Live', en: 'Online viewing setup', ur: 'موبائل پر لائیو' },
      { id: 'maintenance', ro: 'Maintenance', en: 'Maintenance', ur: 'دیکھ بھال' },
    ] },
  { id: 'handyman',   en: 'Handyman/General Labour',  ro: 'Har Kaam Wala',        ur: 'ہر کام والا',      icon: '🧰', group: 'marammat', popular: null, words: ['mazdoor', 'har kaam', 'general', 'labour', 'مزدور', 'ہر کام'],
    subs: [
      { id: 'mazdoori', ro: 'Aam Mazdoori', en: 'General labour', ur: 'عام مزدوری' },
      { id: 'shifting2', ro: 'Shifting Madad', en: 'Shifting help', ur: 'شفٹنگ میں مدد' },
      { id: 'chhoti', ro: 'Chhoti Marammat', en: 'Small repairs', ur: 'چھوٹی مرمت' },
      { id: 'bagh', ro: 'Bagh ka Kaam', en: 'Garden work', ur: 'باغ کا کام' },
      { id: 'safai', ro: 'Safai Madad', en: 'Cleaning help', ur: 'صفائی میں مدد' },
    ] },
];

// ---- sub-services (specialities) ----
export function subLabel(s, lang) {
  if (!s) return '';
  return lang === 'ur' ? s.ur : lang === 'en' ? s.en : s.ro;
}
export function findSub(cat, subId) {
  return ((cat && cat.subs) || []).find((s) => s.id === subId) || null;
}
/** Max-N speciality selection, same shape as toggleService — the "max 5
 *  specialities per category" rule lives here so every picker shares it. */
export function toggleSub(selected, id, max = 5) {
  const list = selected || [];
  if (list.includes(id)) return { selected: list.filter((x) => x !== id), limited: false };
  if (list.length >= max) return { selected: list, limited: true };
  return { selected: [...list, id], limited: false };
}
/** Keep only the specialities of the categories the provider still offers,
 *  capped at 5 each — applied whenever a profile is saved. */
export function pruneSpecs(work, specs) {
  const out = {};
  (work || []).forEach((cid) => {
    const arr = ((specs || {})[cid] || []).slice(0, 5);
    if (arr.length) out[cid] = arr;
  });
  return out;
}

// ---- category search ----
// Filler words people say around the real word ("mujhe nal WALA chahiye") —
// ignored so the content word decides the match.
const SEARCH_STOP = new Set(['mujhe', 'chahiye', 'wala', 'wali', 'ka', 'ki', 'ke', 'hai', 'ho', 'kar', 'karo', 'theek', 'aur', 'mein', 'mai', 'koi', 'bhi', 'a', 'an', 'the', 'i', 'need', 'want']);
/** Score categories against a free-text query (any language — names in
 *  en/ro/ur plus the local `words` are all matched). Sub-service labels
 *  (ro/en/ur) are searchable too, so "leakage" finds Plumber and "screen"
 *  finds Mobile/Computer. Returns [{cat, score, matchedSub}] best first,
 *  score > 0 only — matchedSub is the speciality whose label matched a
 *  query token (for the tile subtitle), or null. Exact word hit = 3,
 *  name hit = 2, prefix = 1. */
export function searchCategories(categories, query) {
  const toks = String(query || '').toLowerCase().split(/\s+/).filter((tok) => tok && !SEARCH_STOP.has(tok));
  if (!toks.length) return [];
  return (categories || []).map((cat) => {
    const nameToks = [cat.en, cat.ro, cat.ur].join(' ').toLowerCase().split(/\s+/);
    const words = (cat.words || []).map((w) => String(w).toLowerCase());
    const wordToks = words.flatMap((w) => w.split(/\s+/));
    const subs = cat.subs || [];
    const subToksOf = (s) => [s.ro, s.en, s.ur].join(' ').toLowerCase().split(/\s+/).filter(Boolean);
    const subToks = subs.flatMap(subToksOf);
    let score = 0;
    let matchedSub = null;
    toks.forEach((tok) => {
      if (words.includes(tok) || wordToks.includes(tok)) score += 3;
      else if (nameToks.includes(tok)) score += 2;
      else if (tok.length >= 3 && (wordToks.some((w) => w.startsWith(tok)) || nameToks.some((w) => w.startsWith(tok)) || subToks.some((w) => w.startsWith(tok)))) score += 1;
      const hit = subs.find((s) => subToksOf(s).includes(tok));
      if (hit) { score += 3; if (!matchedSub) matchedSub = hit; }
    });
    return { cat, score, matchedSub };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}
export function catMatches(cat, query) {
  return searchCategories([cat], query).length > 0;
}

/** Pure max-N service selection, shared by the step editor and the chat
 *  onboarding so the "max 3 services" rule lives in exactly one place.
 *  Returns { selected, limited } — limited=true when a new pick was refused. */
export function toggleService(selected, id, max = 3) {
  const list = selected || [];
  if (list.includes(id)) return { selected: list.filter((x) => x !== id), limited: false };
  if (list.length >= max) return { selected: list, limited: true };
  return { selected: [...list, id], limited: false };
}

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
      'u-rafiq':  { categories: ['electrician'], specialities: { electrician: ['fan', 'wiring', 'switchboard'] }, areas: ['Depalpur', 'Basirpur'], experience: 8, price: 1500, availability: true, ratingAvg: 4.8, ratingCount: 21, bio: 'Fan, wiring, UPS aur switch board ka kaam.' },
      'u-bilal':  { categories: ['plumber'], specialities: { plumber: ['tap', 'bathroom', 'leakage'] }, areas: ['Depalpur', 'Haveli Lakha'], experience: 5, price: 1000, availability: true, ratingAvg: 4.6, ratingCount: 14, bio: 'Tap, pipe aur bathroom fitting.' },
      'u-shahid': { categories: ['carpenter'], specialities: { carpenter: ['darwaza', 'almari', 'furniture'] }, areas: ['Okara City', 'Okara Cantt'], experience: 10, price: 2000, availability: true, ratingAvg: 4.9, ratingCount: 30, bio: 'Darwaza, almari aur furniture repair.' },
      'u-usman':  { categories: ['ac'], specialities: { ac: ['service', 'gas', 'repair'] }, areas: ['Okara City', 'Depalpur'], experience: 6, price: 2500, availability: false, ratingAvg: 4.5, ratingCount: 11, bio: 'AC service, gas refill aur installation.' },
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
      { id: 'job-1', seekerId: 'u-ayesha', categoryId: 'electrician', subId: 'fan', description: 'Ceiling fan is making noise and running very slow. Need it fixed today.', area: 'Depalpur', urgency: 'Today', status: 'open', revealCount: 0, at: now - 1800000 },
      { id: 'job-2', seekerId: 'u-imran', categoryId: 'plumber', subId: 'leakage', description: 'Shop washroom tap is leaking continuously, water is wasted.', area: 'Okara City', urgency: 'Today', status: 'open', revealCount: 0, at: now - 3600000 },
      { id: 'job-3', seekerId: 'u-ayesha', categoryId: 'ac', subId: 'gas', description: 'Split AC cooling is weak, maybe gas is low. Service needed this week.', area: 'Depalpur', urgency: 'This week', status: 'open', revealCount: 0, at: now - 7200000 },
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
    // Seeker -> provider number requests. Coins move only when the provider
    // accepts (store.acceptRevealRequest). Empty at seed; created in the app.
    revealRequests: [],
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
