'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useServio, transact, setSession, getSession, resetDemoData, uid, logActivity } from '../../lib/store';
import { TINTS } from '../../lib/seed';
import { t, p, setLang } from '../../lib/i18n';
import { useLang } from '../../components/AppHeader';
import BottomNav from '../../components/BottomNav';
import { ObStep, ProfileCard, OBQ, expToYears, chargesToPrice } from '../../components/Onboarding';
import { Celebrate } from '../../components/ui';

const DEMO = [
  { name: 'Ayesha', role: 'Seeker', phone: '0300-1111111', note: 'Seeker — free' },
  { name: 'Rafiq Ahmed', role: 'Provider', phone: '0300-2222222', note: 'Electrician — 40 coins' },
  { name: 'Bilal Hussain', role: 'Provider', phone: '0300-3333333', note: 'Plumber — 3 coins only' },
  { name: 'Admin', role: 'Admin', phone: '0300-9999999', note: 'Admin — PIN 9999' },
];
const DEMO_OTP = '1234';
const LANG_BTNS = [
  { id: 'ur', label: 'اردو' },
  { id: 'ro', label: 'Roman' },
  { id: 'en', label: 'EN' },
];

// Four-box code entry, like the prototype's .otp-row / .pin-row.
function CodeBoxes({ digits, setDigits, label }) {
  const refs = useRef([]);
  const set = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = [...digits]; next[i] = d; setDigits(next);
    if (d && i < 3) refs.current[i + 1]?.focus();
  };
  return (
    <div className={label === 'PIN' ? 'pin-row' : 'otp-row'}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          maxLength={1}
          value={d}
          inputMode="numeric"
          aria-label={`${label} ${i + 1}`}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus(); }}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const db = useServio();
  const lang = useLang();
  const [tab, setTab] = useState('login'); // login | seeker | provider
  const [step, setStep] = useState('form'); // form | onboard | profile | celebrate
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [otpOpen, setOtpOpen] = useState(false); // OTP box inside the entry card (prototype pattern)
  const [pinOpen, setPinOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['1', '2', '3', '4']);
  const [pinDigits, setPinDigits] = useState(['9', '9', '9', '9']);
  const [otpError, setOtpError] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [toast, setToast] = useState('');
  // Provider voice onboarding state (prototype `profile` + `ob`)
  const [obProfile, setObProfile] = useState({ name: '', work: [], areas: [], exp: '', charges: '', avail: true });
  const [obStep, setObStep] = useState(0);
  const [obReturnTo, setObReturnTo] = useState(null);
  const [photos, setPhotos] = useState(0);
  const [newUser, setNewUser] = useState(null);

  useEffect(() => {
    const s = getSession();
    if (s) router.replace(s.role === 'admin' ? '/admin' : s.role === 'provider' ? '/provider' : '/seeker');
  }, [router]);

  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 2800); return () => clearTimeout(id); }, [toast]);

  if (!db) return <main className="page"><p className="muted">Loading…</p></main>;

  const adminIds = db.users.filter((u) => u.role === 'admin').map((u) => u.id);
  const goHome = (user, openTab) => {
    setSession(user);
    try { if (openTab) localStorage.setItem('servio-open-tab', openTab); } catch {}
    router.replace(user.role === 'admin' ? '/admin' : user.role === 'provider' ? '/provider' : '/seeker');
  };

  const startLogin = (ph) => {
    setError(''); setOtpError(false); setPinError(false);
    const p = (ph || phone).trim();
    const user = db.users.find((u) => u.phone === p);
    if (!user) { setError('No account on this number. Please sign up first.'); return; }
    if (user.status !== 'active') { setError('This account is suspended. Contact Servio.'); return; }
    setPhone(p); setPendingUser(user);
    if (user.role === 'admin') { setPinOpen(true); setOtpOpen(false); }
    else { setOtpOpen(true); setPinOpen(false); }
    setTimeout(() => document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const startSignup = () => {
    setError(''); setOtpError(false);
    if (!name.trim()) { setError('Please write your name.'); return; }
    if (!phone.trim()) { setError('Please write your phone number.'); return; }
    if (db.users.find((u) => u.phone === phone.trim())) { setError('This number already has an account. Please log in.'); return; }
    setOtpOpen(true); setPinOpen(false);
  };

  const verifyOtp = () => {
    if (otpDigits.join('') !== DEMO_OTP) { setOtpError(true); return; }
    setOtpError(false);
    if (tab === 'login') { goHome(pendingUser); return; }
    if (tab === 'seeker') {
      const user = { id: 'u-' + uid(), name: name.trim(), phone: phone.trim(), role: 'seeker', status: 'active' };
      transact((d) => { d.users.push(user); logActivity(d, `New seeker signed up — ${user.name}`); },
        { toast: `New seeker: ${user.name}`, toastFor: adminIds });
      goHome(user); return;
    }
    // Provider: run the prototype's 6-step voice onboarding next.
    setObProfile({ name: name.trim(), work: [], areas: [], exp: '', charges: '', avail: true });
    setObStep(0); setObReturnTo(null); setPhotos(0);
    setStep('onboard');
    window.scrollTo({ top: 0 });
  };

  const verifyPin = () => {
    if (pinDigits.join('') !== '9999') { setPinError(true); return; }
    setPinError(false);
    goHome(pendingUser);
  };

  // Profile-card confirm: creates the provider in the shared store with
  // 40 starter coins (same store-write shape as before), then celebrate.
  const finishProviderSignup = () => {
    if (!obProfile.name.trim()) { setToast('Pehle naam aur kaam bolo 🎙️'); setObStep(0); setObReturnTo(null); setStep('onboard'); return; }
    if (!obProfile.work.length) { setToast('Pehle naam aur kaam bolo 🎙️'); setObStep(1); setObReturnTo(null); setStep('onboard'); return; }
    const user = { id: 'u-' + uid(), name: obProfile.name.trim(), phone: phone.trim(), role: 'provider', status: 'active' };
    transact((d) => {
      d.users.push(user);
      d.providers[user.id] = {
        categories: obProfile.work, areas: obProfile.areas,
        experience: expToYears(obProfile.exp), price: chargesToPrice(obProfile.charges),
        availability: obProfile.avail, ratingAvg: 0, ratingCount: 0, bio: '',
      };
      d.wallets[user.id] = { balance: 40, txns: [{ id: uid(), type: 'starter', amount: 40, note: 'Starter coins', at: Date.now() }] };
      logActivity(d, `New provider signed up — ${user.name} (40 starter coins)`);
    }, { toast: `New provider: ${user.name}`, toastFor: adminIds });
    setNewUser(user);
    setStep('celebrate');
    window.scrollTo({ top: 0 });
  };

  const obPatch = (patch) => setObProfile((pr) => ({ ...pr, ...patch }));
  const obNext = () => {
    if (obReturnTo === 'profile') { setObReturnTo(null); setStep('profile'); return; }
    if (obStep < 5) setObStep(obStep + 1);
    else { setStep('profile'); setToast('✅ Profile tayyar hai — check karein'); }
    window.scrollTo({ top: 0 });
  };
  const obBack = () => {
    if (obReturnTo === 'profile') { setObReturnTo(null); setStep('profile'); return; }
    if (obStep > 0) setObStep(obStep - 1);
    else setStep('form');
  };
  const rerecord = (key) => {
    const i = OBQ.findIndex((q) => q.key === key);
    if (i < 0) return;
    setObStep(i); setObReturnTo('profile'); setStep('onboard');
    setToast('🎙️ Dobara bolo ya badal do');
    window.scrollTo({ top: 0 });
  };

  const pickRole = (r) => { setTab(r); setOtpOpen(false); setPinOpen(false); setError(''); };
  const changeLang = (l) => { setLang(l); window.dispatchEvent(new CustomEvent('servio-lang')); };
  const navItems = [
    { key: 'home', icon: '🏠', label: t(lang, 'navHome') },
    { key: 'jobs', icon: '📋', label: t(lang, 'navJobs') },
    { key: 'voice', icon: '🎙️', label: t(lang, 'navVoice'), center: true },
    { key: 'wallet', icon: '🪙', label: t(lang, 'navWallet') },
    { key: 'karigar', icon: '🧰', label: t(lang, 'navKarigar') },
  ];
  const navNudge = () => { setToast('Pehle login / signup karein'); document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  const inOnboarding = step === 'onboard' || step === 'profile' || step === 'celebrate';

  return (
    <div dir={lang === 'ur' ? 'rtl' : 'ltr'}>
      <header className="topbar">
        <div className="topbar-in">
          <div className="logo"><div className="logo-mark">S</div><b>Servio</b></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {inOnboarding && <span className="coin-pill" aria-label="Wallet">🪙 40</span>}
            <div className="lang-switch" role="group" aria-label="Language">
              {LANG_BTNS.map((l) => (
                <button key={l.id} className={lang === l.id ? 'active' : ''} onClick={() => changeLang(l.id)}>{l.label}</button>
              ))}
            </div>
          </div>
        </div>
      </header>
      {toast && <div className="toast-wrap" aria-live="polite"><div className="toast">{toast}</div></div>}
      <main className="page">
        {step === 'form' && (
          <>
            <div className="voice-hero">
              <h1>{lang === 'en' ? <>Say it. <em>Get it done.</em></> : lang === 'ur' ? p(lang, 'heroTitle') : <>Bol kar kaam <em>karwao</em></>}</h1>
              <p>{p(lang, 'heroSub')}</p>
              <button className="bigmic" aria-label="Bol kar kaam post karein" onClick={navNudge}>🎙️</button>
              <div style={{ fontWeight: 800 }}>{p(lang, 'tapMic')}</div>
            </div>

            <div className="role-grid">
              <button className={`role-card ${tab === 'seeker' ? 'selected' : ''}`} onClick={() => pickRole('seeker')}><span className="icon">🏠</span><b>{p(lang, 'seekerTitle')}</b></button>
              <button className={`role-card ${tab === 'provider' ? 'selected' : ''}`} onClick={() => pickRole('provider')}><span className="icon">🧰</span><b>{p(lang, 'providerTitle')}</b></button>
            </div>
            <div className="pill-row" style={{ marginTop: 12, justifyContent: 'center' }}>
              <button className={`pill ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setOtpOpen(false); setPinOpen(false); setError(''); }}>Log in</button>
              <button className={`pill ${tab !== 'login' ? 'active' : ''}`} onClick={() => pickRole(tab === 'login' ? 'seeker' : tab)}>Sign up</button>
            </div>

            <div className="card" id="auth-card" style={{ marginTop: 16 }}>
              {tab !== 'login' && (
                <>
                  <label style={{ marginTop: 0 }}>Aap ka naam?</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam likhein…" />
                </>
              )}
              <label style={tab !== 'login' ? undefined : { marginTop: 0 }}>{p(lang, 'phoneLabel')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ maxWidth: 92 }} aria-label="Country code"><option>+92</option></select>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03XX-XXXXXXX" inputMode="tel" />
              </div>
              {error && <div className="warn">{error}</div>}
              {!otpOpen && !pinOpen && (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => (tab === 'login' ? startLogin() : startSignup())}>{p(lang, 'sendOtp')}</button>
              )}
              {otpOpen && (
                <div>
                  <p style={{ textAlign: 'center', margin: '16px 0 0' }}><b>{p(lang, 'otpTitle')}</b> &nbsp;<span className="chip">Demo: 1234</span></p>
                  <CodeBoxes digits={otpDigits} setDigits={(d) => { setOtpDigits(d); setOtpError(false); }} label="OTP" />
                  {otpError && (
                    <div className="error-box" style={{ display: 'block' }}>❌ Ghalat code — dobara try karein
                      <button className="btn btn-ghost" style={{ marginTop: 8, width: '100%' }} onClick={() => { setOtpDigits(['1', '2', '3', '4']); setOtpError(false); }}>↻ Retry</button>
                    </div>
                  )}
                  <button className="btn btn-amber" onClick={verifyOtp}>✓ {p(lang, 'verify')}</button>
                  <button className="skip-link" onClick={() => { setOtpDigits(['0', '0', '0', '0']); setOtpError(true); }}>Demo: ghalat code try karein</button>
                </div>
              )}
              {pinOpen && (
                <div>
                  <h3 style={{ textAlign: 'center', margin: '16px 0 0' }}>🔐 Admin PIN</h3>
                  <p className="muted" style={{ textAlign: 'center', margin: '4px 0 0' }}>Demo PIN: <b>9999</b></p>
                  <CodeBoxes digits={pinDigits} setDigits={(d) => { setPinDigits(d); setPinError(false); }} label="PIN" />
                  {pinError && <div className="error-box" style={{ display: 'block' }}>❌ Ghalat PIN</div>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10 }}>
                    <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setPinOpen(false)}>✕</button>
                    <button className="btn btn-primary" onClick={verifyPin}>✓ Admin kholein</button>
                  </div>
                </div>
              )}
            </div>

            <div className="section-head"><h2>Demo accounts — tap one</h2></div>
            <div className="demo-grid" style={{ marginTop: 0 }}>
              {DEMO.map((d) => (
                <button key={d.phone} className="demo-card" onClick={() => { setTab('login'); startLogin(d.phone); }}>
                  <span className="icon">{d.role === 'Seeker' ? '🏠' : d.role === 'Admin' ? '🛡️' : '🧰'}</span>
                  <b>{d.name}</b><span className="chip">{d.role}</span>
                  <div className="small muted" style={{ marginTop: 6 }}><span dir="ltr">{d.phone}</span><br />{d.note}</div>
                </button>
              ))}
            </div>

            <div className="section-head"><h2>{p(lang, 'catTitle')}</h2></div>
            <div className="cat-grid">
              {db.categories.map((c, i) => c.active ? (
                <button key={c.id} className="cat" style={{ background: TINTS[i % TINTS.length] }} onClick={navNudge}>
                  <span className="ic">{c.icon}</span><b>{lang === 'ur' ? c.ur : lang === 'ro' ? c.ro : c.en}</b>
                </button>
              ) : null)}
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={navNudge}>{t(lang, 'seeKarigar')} →</button>
            <div className="footer-link">
              <button onClick={() => { if (confirm('Reset all demo data back to the start?')) { resetDemoData(); window.location.reload(); } }}>Reset demo data</button>
            </div>
          </>
        )}

        {step === 'onboard' && (
          <ObStep
            step={obStep}
            profile={obProfile}
            onChange={obPatch}
            lang={lang}
            categories={db.categories.filter((c) => c.active)}
            areas={db.areas.filter((a) => a.active).map((a) => a.name)}
            onBack={obBack}
            onNext={obNext}
            onSkip={obNext}
            returnTo={obReturnTo}
          />
        )}

        {step === 'profile' && (
          <>
            <button className="backlink" onClick={() => { setObStep(5); setObReturnTo(null); setStep('onboard'); }}>← {p(lang, 'back')}</button>
            <h1>{t(lang, 'myProfile')}</h1>
            <ProfileCard
              profile={obProfile}
              lang={lang}
              categories={db.categories}
              onRerecord={rerecord}
              onAvail={(v) => obPatch({ avail: v })}
              photos={photos}
              onPhotos={setPhotos}
            />
            <div className="sticky-action"><button className="btn btn-primary" onClick={finishProviderSignup}>{t(lang, 'goLive')}</button></div>
          </>
        )}

        {step === 'celebrate' && newUser && (
          <Celebrate
            title={t(lang, 'liveTitle')}
            big="🪙 40"
            sub={t(lang, 'liveSub')}
            btn1={{ label: t(lang, 'seeJobs'), onClick: () => goHome(newUser, 'jobs') }}
            btn2={{ label: t(lang, 'seeWallet'), onClick: () => goHome(newUser, 'wallet') }}
          />
        )}
      </main>
      <BottomNav items={navItems} active="home" onGo={navNudge} />
    </div>
  );
}
