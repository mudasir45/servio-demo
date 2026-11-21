'use client';

// Three UI languages: Roman Urdu (default), Urdu (RTL), English.
// Labels are the prototype's short labels (e.g. "Kaam ki list", "Aage", "Skip").
export const LANGS = [
  { id: 'ur', label: 'اردو' },
  { id: 'ro', label: 'Roman' },
  { id: 'en', label: 'EN' },
];

const D = {
  // Bottom nav — exactly the prototype's five items
  navHome:    { ur: 'گھر', ro: 'Home', en: 'Home' },
  navJobs:    { ur: 'جابز', ro: 'Jobs', en: 'Jobs' },
  navVoice:   { ur: 'بولو', ro: 'Bolo', en: 'Say it' },
  navWallet:  { ur: 'والٹ', ro: 'Wallet', en: 'Wallet' },
  navKarigar: { ur: 'کاریگر', ro: 'Karigar', en: 'Karigar' },
  // Common actions
  back:     { ur: 'واپس', ro: 'Wapas', en: 'Back' },
  next:     { ur: 'آگے', ro: 'Aage', en: 'Next' },
  skip:     { ur: 'چھوڑ دیں', ro: 'Skip', en: 'Skip' },
  logout:   { ur: 'لاگ آؤٹ', ro: 'Log out', en: 'Log out' },
  alerts:   { ur: 'الرٹس', ro: 'Alerts', en: 'Alerts' },
  coins:    { ur: 'کوائنز', ro: 'coins', en: 'coins' },
  // Provider jobs list (prototype jobs view)
  jobsTitle: { ur: '📋 کام کی لسٹ', ro: '📋 Kaam ki list', en: '📋 Job list' },
  newJob:    { ur: '+ نیا', ro: '+ Naya', en: '+ New' },
  all:       { ur: 'سارے', ro: 'Saare', en: 'All' },
  urgent:    { ur: '🔴 ارجنٹ', ro: '🔴 Urgent', en: '🔴 Urgent' },
  mine:      { ur: 'میرے جابز', ro: 'Mere jobs', en: 'My jobs' },
  voiceNote: { ur: '🎙️ سیکر کی آواز', ro: '🎙️ Seeker ki voice note', en: '🎙️ Seeker voice note' },
  number:    { ur: '📞 نمبر', ro: '📞 Number', en: '📞 Number' },
  bidFree:   { ur: '💬 بِڈ — فری', ro: '💬 Bid — FREE', en: '💬 Bid — FREE' },
  closed3:   { ur: '🔒 بند — 3 نمبر دکھائے گئے', ro: '🔒 Closed — 3 numbers shown', en: '🔒 Closed — 3 numbers shown' },
  alreadyShown: { ur: '✓ پہلے دکھایا گیا', ro: '✓ Pehle dikhaya gaya', en: '✓ Already shown' },
  bidSent:   { ur: '✅ بِڈ چلی گئی — ✏️ تبدیل', ro: '✅ Bid sent — ✏️ Edit', en: '✅ Bid sent — ✏️ Edit' },
  // Bid screen
  bidTitle:  { ur: '💬 بِڈ بھیجیں', ro: '💬 Bid bhejein', en: '💬 Send a bid' },
  free:      { ur: 'فری', ro: 'FREE', en: 'FREE' },
  priceHow:  { ur: 'پرائس کس طرح؟', ro: 'Price kis tarah?', en: 'How will you price it?' },
  fixed:     { ur: '🎯 فکسڈ', ro: '🎯 Fixed', en: '🎯 Fixed' },
  range:     { ur: '↔️ رینج', ro: '↔️ Range', en: '↔️ Range' },
  visitFirst:{ ur: '👀 پہلے وزٹ', ro: '👀 Pehle visit', en: '👀 Visit first' },
  howMuch:   { ur: 'کتنے پیسے؟', ro: 'Kitne paisay?', en: 'How much?' },
  visitCharge:{ ur: 'وزٹ چارج', ro: 'Visit charge', en: 'Visit charge' },
  freeVisit: { ur: 'فری وزٹ', ro: 'Free visit', en: 'Free visit' },
  message:   { ur: 'میسج (بول یا لکھ)', ro: 'Message (bol ya likh)', en: 'Message (say or type)' },
  review:    { ur: 'ریویو', ro: 'REVIEW', en: 'REVIEW' },
  sendBid:   { ur: '📩 بِڈ بھیجیں — فری', ro: '📩 Bid Bhejein — FREE', en: '📩 Send Bid — FREE' },
  updateBid: { ur: '✏️ بِڈ اپڈیٹ کریں — فری', ro: '✏️ Bid Update Karein — FREE', en: '✏️ Update Bid — FREE' },
  // Wallet
  walletTitle:{ ur: '🪙 والٹ', ro: '🪙 Wallet', en: '🪙 Wallet' },
  buyCoins:  { ur: 'کوائنز لیں', ro: 'Coins lein', en: 'Get coins' },
  history:   { ur: 'ہسٹری', ro: 'History', en: 'History' },
  topUp:     { ur: '🪙 کوائنز ٹاپ اپ', ro: '🪙 Coins top-up', en: '🪙 Coins top-up' },
  sendTo:    { ur: 'پر بھیجیں 0300-XXXXXXX', ro: 'par bhejein 0300-XXXXXXX', en: 'Send to 0300-XXXXXXX' },
  receipt:   { ur: '📷 رسید کی فوٹو بھیجیں', ro: '📷 Receipt photo bhejein', en: '📷 Send receipt photo' },
  receiptOk: { ur: '✅ رسید مل گئی', ro: '✅ Receipt mil gayi', en: '✅ Receipt received' },
  addCoins:  { ur: '✓ کوائنز ایڈ کریں', ro: '✓ Coins Add Karein', en: '✓ Add Coins' },
  popular:   { ur: '⭐ مشہور', ro: '⭐ Popular', en: '⭐ Popular' },
  // Profile / onboarding
  myProfile: { ur: '🧰 میری پروفائل', ro: '🧰 Meri Profile', en: '🧰 My Profile' },
  goLive:    { ur: '✓ پروفائل لائیو کریں', ro: '✓ Profile Live Karein', en: '✓ Go Live' },
  photos:    { ur: '📷 کام کی فوٹوز', ro: '📷 Kaam ki photos', en: '📷 Work photos' },
  available: { ur: 'دستیاب', ro: 'Available', en: 'Available' },
  availOn:   { ur: 'آن — کام مل سکتا ہے', ro: 'ON — kaam mil sakta hai', en: 'ON — work can come' },
  availOff:  { ur: 'آف — بند ہے', ro: 'OFF — band hai', en: 'OFF — off' },
  holdHint:  { ur: 'مائیک دبا کر رکھیں، بولیں، چھوڑ دیں', ro: 'Mic daba kar rakho, bolo, chhor do', en: 'Hold the mic, speak, release' },
  profileDone:{ ur: '✓ ہو گیا', ro: '✓ Done', en: '✓ Done' },
  seeProfile:{ ur: '✓ پروفائل دیکھیں', ro: '✓ Profile Dekhein', en: '✓ See Profile' },
  liveTitle: { ur: 'پروفائل لائیو ہو گئی!', ro: 'Profile LIVE ho gayi!', en: 'Profile is LIVE!' },
  liveSub:   { ur: 'فری کوائنز والٹ میں آ گئے۔ اب کام مل سکتا ہے۔', ro: 'FREE coins wallet mein aa gaye. Ab kaam mil sakta hai.', en: 'FREE coins are in your wallet. Work can now reach you.' },
  seeJobs:   { ur: '📋 کام دیکھیں', ro: '📋 Kaam Dekhein', en: '📋 See jobs' },
  seeWallet: { ur: '🪙 والٹ دیکھیں', ro: '🪙 Wallet Dekhein', en: '🪙 See wallet' },
  // Seeker
  whatWork:  { ur: 'کیا کام ہے؟', ro: 'Kya kaam hai?', en: 'What work do you need?' },
  seeKarigar:{ ur: '🧰 کاریگر دیکھیں', ro: '🧰 Karigar dekhein', en: '🧰 See karigars' },
  myPosted:  { ur: 'میری پوسٹ کی جابز', ro: 'Meri posted jobs', en: 'My posted jobs' },
  bidsWait:  { ur: '⏳ بِڈز کا انتظار', ro: '⏳ Bids ka intezar', en: '⏳ Waiting for bids' },
  seeBids:   { ur: 'بِڈز دیکھیں', ro: 'Bids Dekhein', en: 'See Bids' },
  showNumber:{ ur: '📞 نمبر دکھائیں', ro: '📞 Show number', en: '📞 Show number' },
  // Reveal-by-request flow (seeker asks, provider accepts, coins move on accept)
  reqNumber: { ur: '📞 نمبر کی درخواست کریں', ro: '📞 Number Request Karein', en: '📞 Request number' },
  reqWaiting:{ ur: '⏳ درخواست بھیج دی — جواب کا انتظار', ro: '⏳ Request bheji gayi — provider ke jawab ka intezar', en: '⏳ Request sent — waiting for the provider' },
  reqDeclined:{ ur: 'درخواست قبول نہیں ہوئی', ro: 'Request accept nahi hui', en: 'Request was not accepted' },
  reqAgain:  { ur: 'دوبارہ درخواست کریں', ro: 'Dobara Request Karein', en: 'Request again' },
  reqTitle:  { ur: '📞 نمبر کی درخواستیں', ro: '📞 Number Requests', en: '📞 Number requests' },
  accept:    { ur: '✓ قبول کریں', ro: '✓ Accept', en: '✓ Accept' },
  reject:    { ur: '✕ انکار', ro: '✕ Reject', en: '✕ Reject' },
  postFree:  { ur: '🚀 جاب پوسٹ کریں — فری', ro: '🚀 Job Post Karein — FREE', en: '🚀 Post Job — FREE' },
  settings:  { ur: '⚙️ سیٹنگز', ro: '⚙️ Settings', en: '⚙️ Settings' },
  karigarTitle:{ ur: '🧰 کاریگر', ro: '🧰 Karigar', en: '🧰 Karigars' },
  profileTitle:{ ur: '🧰 پروفائل', ro: '🧰 Profile', en: '🧰 Profile' },
  contact:   { ur: '📞 رابطہ — نمبر دیکھیں', ro: '📞 Contact — Number Dekhein', en: '📞 Contact — See number' },
  // Category picker (search + popular + groups) and chat onboarding
  searchPh:  { ur: 'کام تلاش کریں…', ro: 'Kaam search karein…', en: 'Search work…' },
  popularSec:{ ur: '⭐ زیادہ مشہور', ro: '⭐ Zyada Mashhoor', en: '⭐ Most popular' },
  noCat:     { ur: 'یہ کام نہیں ملا — جاب پوسٹ کر دیں، ہم کاریگر ڈھونڈیں گے', ro: 'Ye kaam nahi mila — Job post kar dein, hum karigar dhoondenge', en: 'Not found — post a job and we will find a karigar' },
  sawal:     { ur: 'سوال', ro: 'Sawal', en: 'Question' },
  donePick:  { ur: '✓ ہو گیا', ro: 'Ho gaya ✓', en: 'Done ✓' },
  typeMsg:   { ur: 'میسج لکھیں…', ro: 'Message likhein…', en: 'Type a message…' },
  pickAbove: { ur: 'اوپر دیے آپشنز میں سے چنیں 👆', ro: 'Upar diye options mein se chunein 👆', en: 'Pick from the options above 👆' },
  noProviderForCat: { ur: 'اس کام کا کاریگر ابھی نہیں — جاب پوسٹ کریں، کاریگر خود بِڈ کرے گا', ro: 'Is kaam ka karigar abhi nahi — Job post karein, karigar khud bid karega', en: 'No karigar for this work yet — post a job and karigars will bid' },
  // Legacy keys kept for the admin page / older components
  home:      { en: 'Home', ro: 'Home', ur: 'ہوم' },
  postJob:   { en: 'Post a Job', ro: 'Kaam Post Karein', ur: 'کام پوسٹ کریں' },
  myJobs:    { en: 'My Jobs', ro: 'Mere Kaam', ur: 'میرے کام' },
  providers: { en: 'Providers', ro: 'Karigar', ur: 'کاریگر' },
  jobs:      { en: 'Jobs', ro: 'Jobs', ur: 'جابز' },
  myBids:    { en: 'My Bids', ro: 'Meri Bids', ur: 'میری بِڈز' },
  wallet:    { en: 'Wallet', ro: 'Wallet', ur: 'والٹ' },
  profile:   { en: 'Profile', ro: 'Profile', ur: 'پروفائل' },
  busy:      { en: 'Busy', ro: 'Busy hai', ur: 'مصروف ہے' },
};

export function t(lang, key) {
  const e = D[key];
  if (!e) return key;
  return e[lang] || e.ro || key;
}

// The prototype's own I18N dictionary, mirrored verbatim (keys: ur / roman / en).
// Access with p(lang, key) — lang 'ro' maps to the prototype's 'roman'.
const P = {
  ur:{heroTitle:'بول کر کام کروائیں',heroSub:'بس بولو — Servio سمجھ جائے گا',tapMic:'مائیک دبائیں، بولو',seekerTitle:'کام کروانا ہے',providerTitle:'میں کاریگر ہوں',phoneLabel:'موبائل نمبر',sendOtp:'OTP بھیجیں',otpTitle:'OTP لکھیں',verify:'آگے بڑھیں',catTitle:'کیا کام ہے؟',back:'واپس',voiceTitle:'بول کر بولو',aiGot:'AI نے سمجھا',aiThinking:'AI سوچ رہا ہے…',orType:'یا لکھ کر دیں',useText:'یہ استعمال کریں',fCatL:'کام',fLocL:'علاقہ',fWhenL:'کب؟',fBudgetL:'بجٹ',fDescL:'مسئلہ',postBtn:'جاب پوسٹ کریں — مفت',fuQ:'کام کہاں ہے؟',fuSub:'ایک سوال — پھر جاب لائیو',coinRule:'1 نمبر = 5 سکے (50 روپے)',revealTitle:'نمبر دیکھنا ہے؟',costL:'لاگت',afterL:'بعد میں بچے گا',yesNum:'ہاں، نمبر دیں',slotsL:'جگہ بچی',close:'بند کریں',tFixed:'فکس قیمت',tFixedS:'ایک ہی ریٹ',tRange:'قیمت کی حد',tRangeS:'کم سے زیادہ تک',tVisit:'پہلے وزٹ',tVisitS:'پہلے دیکھ کر ریٹ',toL:'زیادہ سے زیادہ'},
  roman:{heroTitle:'Bol kar kaam karwao',heroSub:'Bas bolo — Servio samajh jayega',tapMic:'Mic dabao, bolo',seekerTitle:'Kaam karwana hai',providerTitle:'Main karigar hoon',phoneLabel:'Mobile number',sendOtp:'OTP Bhejein →',otpTitle:'OTP likhein',verify:'Aage barhein',catTitle:'Kya kaam hai?',back:'Wapas',voiceTitle:'Bol kar bolo',aiGot:'AI ne samjha',aiThinking:'AI soch raha hai…',orType:'Ya likh kar dein',useText:'Yeh use karein',fCatL:'Kaam',fLocL:'Ilaka',fWhenL:'Kab?',fBudgetL:'Budget',fDescL:'Masla',postBtn:'Job Post Karein — FREE',fuQ:'Kaam kahan hai?',fuSub:'Ek sawal — phir job live',coinRule:'1 number = 5 coins (PKR 50)',revealTitle:'Number dekhna hai?',costL:'Cost',afterL:'Baad mein bachega',yesNum:'Haan, number dein',slotsL:'Jagah bachi',close:'Band karein',tFixed:'Fixed price',tFixedS:'Ek hi rate',tRange:'Price range',tRangeS:'Kam se zyada tak',tVisit:'Visit first',tVisitS:'Pehle dekh kar rate',toL:'Zyada se zyada'},
  en:{heroTitle:'Say it. Get it done.',heroSub:'Just speak — Servio understands',tapMic:'Tap the mic, speak',seekerTitle:'I need work done',providerTitle:'I am a karigar',phoneLabel:'Mobile number',sendOtp:'Send OTP →',otpTitle:'Enter OTP',verify:'Continue',catTitle:'What do you need?',back:'Back',voiceTitle:'Speak your job',aiGot:'AI understood',aiThinking:'AI is thinking…',orType:'Or type it',useText:'Use this',fCatL:'Work',fLocL:'Area',fWhenL:'When?',fBudgetL:'Budget',fDescL:'Problem',postBtn:'Post Job — FREE',fuQ:'Where is the work?',fuSub:'One question — then job goes live',coinRule:'1 number = 5 coins (PKR 50)',revealTitle:'See the number?',costL:'Cost',afterL:'Left after',yesNum:'Yes, show number',slotsL:'Slots left',close:'Close',tFixed:'Fixed price',tFixedS:'One single rate',tRange:'Price range',tRangeS:'Low to high',tVisit:'Visit first',tVisitS:'See it, then quote',toL:'Up to'},
};
export function p(lang, key) {
  const d = P[lang === 'ro' ? 'roman' : lang] || P.roman;
  return d[key] || P.roman[key] || key;
}

const KEY = 'servio-lang';
export function getLang() {
  if (typeof window === 'undefined') return 'ro';
  return window.localStorage.getItem(KEY) || 'ro';
}
export function setLang(l) {
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY, l);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = l === 'ur' ? 'ur' : 'en';
    document.documentElement.dir = l === 'ur' ? 'rtl' : 'ltr';
  }
}
