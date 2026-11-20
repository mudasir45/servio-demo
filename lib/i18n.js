// Small dictionary for the main labels. Urdu sets the app container to RTL.
export const LANGS = [
  { id: 'ro', label: 'Roman Urdu' },
  { id: 'ur', label: 'اردو' },
  { id: 'en', label: 'English' },
];

const D = {
  home:      { en: 'Home', ro: 'Home', ur: 'ہوم' },
  postJob:   { en: 'Post a Job', ro: 'Kaam Post Karein', ur: 'کام پوسٹ کریں' },
  myJobs:    { en: 'My Jobs', ro: 'Mere Kaam', ur: 'میرے کام' },
  providers: { en: 'Providers', ro: 'Karigar', ur: 'کاریگر' },
  alerts:    { en: 'Alerts', ro: 'Alerts', ur: 'اطلاعات' },
  jobs:      { en: 'Jobs for You', ro: 'Aap ke Kaam', ur: 'آپ کے کام' },
  myBids:    { en: 'My Bids & Leads', ro: 'Meri Bids aur Leads', ur: 'میری بولیاں اور لیڈز' },
  wallet:    { en: 'Wallet', ro: 'Wallet', ur: 'والٹ' },
  profile:   { en: 'Profile', ro: 'Profile', ur: 'پروفائل' },
  logout:    { en: 'Log out', ro: 'Log out', ur: 'لاگ آؤٹ' },
  showNumber:{ en: 'Show Number', ro: 'Number Dikhayein', ur: 'نمبر دکھائیں' },
  sendBid:   { en: 'Send Bid', ro: 'Bid Bhejein', ur: 'بولی بھیجیں' },
  coins:     { en: 'coins', ro: 'coins', ur: 'سکے' },
  available: { en: 'Available', ro: 'Available hai', ur: 'دستیاب ہے' },
  busy:      { en: 'Busy', ro: 'Busy hai', ur: 'مصروف ہے' },
};

export function t(lang, key) {
  return (D[key] && (D[key][lang] || D[key].en)) || key;
}

export function getLang() {
  if (typeof window === 'undefined') return 'ro';
  return window.localStorage.getItem('servio-lang') || 'ro';
}
export function setLang(l) {
  if (typeof window !== 'undefined') window.localStorage.setItem('servio-lang', l);
}
