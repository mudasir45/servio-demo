'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useServio, transact, setSession, getSession, resetDemoData, uid, notify, logActivity } from '../../lib/store';
import { TINTS } from '../../lib/seed';

const DEMO = [
  { name: 'Ayesha', role: 'Seeker', phone: '0300-1111111', note: 'Seeker — free' },
  { name: 'Rafiq Ahmed', role: 'Provider', phone: '0300-2222222', note: 'Electrician — 40 coins' },
  { name: 'Bilal Hussain', role: 'Provider', phone: '0300-3333333', note: 'Plumber — 3 coins only' },
  { name: 'Admin', role: 'Admin', phone: '0300-9999999', note: 'Admin — PIN 9999' },
];
const DEMO_OTP = '1234';

export default function LoginPage() {
  const router = useRouter();
  const db = useServio();
  const [tab, setTab] = useState('login'); // login | seeker | provider
  const [step, setStep] = useState('form'); // form | otp | pin | onboard
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [ob, setOb] = useState({ categories: [], areas: [], experience: '', price: '', availability: true });

  useEffect(() => {
    const s = getSession();
    if (s) router.replace(s.role === 'admin' ? '/admin' : s.role === 'provider' ? '/provider' : '/seeker');
  }, [router]);

  if (!db) return <main className="page"><p className="muted">Loading…</p></main>;

  const goHome = (user) => { setSession(user); router.replace(user.role === 'admin' ? '/admin' : user.role === 'provider' ? '/provider' : '/seeker'); };

  const startLogin = (ph) => {
    setError('');
    const p = (ph || phone).trim();
    const user = db.users.find((u) => u.phone === p);
    if (!user) { setError('No account on this number. Please sign up first.'); return; }
    if (user.status !== 'active') { setError('This account is suspended. Contact Servio.'); return; }
    setPhone(p); setPendingUser(user);
    setStep(user.role === 'admin' ? 'pin' : 'otp');
  };

  const startSignup = () => {
    setError('');
    if (!name.trim()) { setError('Please write your name.'); return; }
    if (!phone.trim()) { setError('Please write your phone number.'); return; }
    if (db.users.find((u) => u.phone === phone.trim())) { setError('This number already has an account. Please log in.'); return; }
    setStep('otp');
  };

  const verifyCode = () => {
    setError('');
    if (step === 'pin') {
      if (code !== '9999') { setError('Wrong PIN. Demo PIN is 9999.'); return; }
      goHome(pendingUser); return;
    }
    if (code !== DEMO_OTP) { setError('Wrong code. Demo OTP is 1234.'); return; }
    if (tab === 'login') { goHome(pendingUser); return; }
    if (tab === 'seeker') {
      const user = { id: 'u-' + uid(), name: name.trim(), phone: phone.trim(), role: 'seeker', status: 'active' };
      transact((d) => { d.users.push(user); logActivity(d, `New seeker signed up — ${user.name}`); },
        { toast: `New seeker: ${user.name}`, toastFor: db.users.filter((u) => u.role === 'admin').map((u) => u.id) });
      goHome(user); return;
    }
    // provider: collect onboarding next
    setStep('onboard');
  };

  const finishProviderSignup = () => {
    setError('');
    if (!ob.categories.length) { setError('Pick at least one kind of work.'); return; }
    if (!ob.areas.length) { setError('Pick at least one area.'); return; }
    const user = { id: 'u-' + uid(), name: name.trim(), phone: phone.trim(), role: 'provider', status: 'active' };
    transact((d) => {
      d.users.push(user);
      d.providers[user.id] = { categories: ob.categories, areas: ob.areas, experience: Number(ob.experience) || 0, price: Number(ob.price) || 0, availability: ob.availability, ratingAvg: 0, ratingCount: 0, bio: '' };
      d.wallets[user.id] = { balance: 40, txns: [{ id: uid(), type: 'starter', amount: 40, note: 'Starter coins', at: Date.now() }] };
      logActivity(d, `New provider signed up — ${user.name} (40 starter coins)`);
    }, { toast: `New provider: ${user.name}`, toastFor: db.users.filter((u) => u.role === 'admin').map((u) => u.id) });
    goHome(user);
  };

  const toggleList = (key, val) => setOb((o) => ({ ...o, [key]: o[key].includes(val) ? o[key].filter((x) => x !== val) : [...o[key], val] }));

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <div className="logo"><div className="logo-mark">S</div><b>Servio</b></div>
        </div>
      </header>
      <main className="page">
      <div className="voice-hero">
        <h1>Bol kar kaam <em>karwao</em></h1>
        <p>Bas bolo — Servio samajh jayega</p>
        <button className="bigmic" aria-label="Bol kar kaam post karein" onClick={() => document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' })}>🎙️</button>
        <div style={{ fontWeight: 800 }}>Mic dabao, bolo</div>
      </div>

      {step === 'form' && (
        <>
          <div className="pill-row" role="tablist" style={{ marginTop: 16 }}>
            <button className={`pill ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Log in</button>
            <button className={`pill ${tab === 'seeker' ? 'active' : ''}`} onClick={() => setTab('seeker')}>Seeker signup</button>
            <button className={`pill ${tab === 'provider' ? 'active' : ''}`} onClick={() => setTab('provider')}>Provider signup</button>
          </div>

          {tab === 'login' && (
            <div className="card" id="auth-card">
              <label>Phone number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300-0000000" inputMode="tel" />
              {error && <div className="warn">{error}</div>}
              <div style={{ height: 12 }} />
              <button className="btn" onClick={() => startLogin()}>Continue</button>
              <p className="small muted">Demo OTP is <b>1234</b>. Admin uses PIN <b>9999</b>.</p>
            </div>
          )}

          {tab !== 'login' && (
            <div className="card" id="auth-card">
              <label>Your name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Muhammad Ali" />
              <label>Phone number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300-0000000" inputMode="tel" />
              {error && <div className="warn">{error}</div>}
              <div style={{ height: 12 }} />
              <button className="btn" onClick={startSignup}>{tab === 'seeker' ? 'Sign up — it is free' : 'Continue'}</button>
              {tab === 'seeker' && <p className="small muted">That is all we ask. No email, no password.</p>}
            </div>
          )}

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
        </>
      )}

      {(step === 'otp' || step === 'pin') && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{step === 'pin' ? 'Admin PIN' : 'Enter code'}</h3>
          <p className="muted">{step === 'pin' ? 'Enter the admin PIN.' : `We sent a code to ${phone}. Demo code is 1234.`}</p>
          <input className="otp-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder={step === 'pin' ? '9999' : '1234'} inputMode="numeric" />
          {error && <div className="error-box" style={{ display: 'block' }}>{error}</div>}
          <div style={{ height: 12 }} />
          <button className="btn btn-amber" onClick={verifyCode}>✓ Verify</button>
          <button className="skip-link" style={{ display: 'block', margin: '8px auto 0', background: 'none', border: 0, color: 'var(--muted)', fontWeight: 700, fontSize: 16, minHeight: 48 }} onClick={() => { setStep('form'); setCode(''); setError(''); }}>← Back</button>
        </div>
      )}

      {step === 'onboard' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Your work profile</h3>
          <label>What work do you do? (tap all)</label>
          <div className="tile-grid">
            {db.categories.map((c, i) => c.active ? (
              <button key={c.id} className={`tile ${ob.categories.includes(c.id) ? 'sel' : ''}`} style={{ background: TINTS[i % TINTS.length] }} onClick={() => toggleList('categories', c.id)}>
                <span className="ic">{c.icon}</span><b>{c.en}</b>
              </button>
            ) : null)}
          </div>
          <label>Where do you work? (tap all)</label>
          {db.areas.filter((a) => a.active).map((a) => (
            <label key={a.name} className="check-row"><input type="checkbox" checked={ob.areas.includes(a.name)} onChange={() => toggleList('areas', a.name)} /> {a.name}</label>
          ))}
          <label>Years of experience</label>
          <input value={ob.experience} onChange={(e) => setOb({ ...ob, experience: e.target.value })} inputMode="numeric" placeholder="e.g. 5" />
          <label>Usual charge (PKR)</label>
          <input value={ob.price} onChange={(e) => setOb({ ...ob, price: e.target.value })} inputMode="numeric" placeholder="e.g. 1500" />
          <div className="field-row">
            <span className="fi">🟢</span>
            <div className="fv"><b>Available</b><small>I am available for work now</small></div>
            <label className="switch"><input type="checkbox" checked={ob.availability} onChange={(e) => setOb({ ...ob, availability: e.target.checked })} /><span className="track"></span></label>
          </div>
          {error && <div className="warn">{error}</div>}
          <div style={{ height: 10 }} />
          <button className="btn btn-amber" onClick={finishProviderSignup}>Go live — get 40 free coins</button>
        </div>
      )}

      <p className="center small" style={{ marginTop: 28 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); if (confirm('Reset all demo data back to the start?')) { resetDemoData(); window.location.reload(); } }}>Reset demo data</a>
      </p>
      </main>
    </>
  );
}
