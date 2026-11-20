'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader, { useGuard, useLang, useGoto } from '../../components/AppHeader';
import BottomNav from '../../components/BottomNav';
import { ObStep, ProfileCard, OBQ, expToYears, yearsToExp, chargesToPrice, priceToCharges } from '../../components/Onboarding';
import { Dots, ListenBtn, Celebrate, ScreeningModal, priceText, priceTypeLabel, stars } from '../../components/ui';
import { useServio, transact, uid, notify, notifyAdmins, logActivity, findPhone, stripPhone, userName, catName, setSession, clearSession } from '../../lib/store';
import { COIN_PKR } from '../../lib/seed';
import { t, p } from '../../lib/i18n';

// Display-only derivations (the store has no distance/budget fields; the
// prototype's demo data showed them, so they are derived deterministically).
const DISTS = ['0.8 km', '1.4 km', '4.2 km', '3.1 km'];
const BUDGETS = { plumber: 'PKR 1,500–2,500', ac: 'PKR 2,000–3,500', electrician: 'PKR 3,000–5,000', carpenter: 'PKR 1,000–1,800' };
const WHEN_RO = { Now: 'Abhi', Today: 'Aaj hi', 'This week': 'Is hafte' };
const REASONS = [['wrong-number', '📵 Wrong number'], ['no-answer', '🔕 No answer'], ['spam', '🚫 Spam']];

export default function ProviderPage() {
  const router = useRouter();
  const session = useGuard('provider');
  const db = useServio();
  const lang = useLang();
  const [tab, setTab] = useState('jobs');
  const [filter, setFilter] = useState('all');
  const [playingId, setPlayingId] = useState(null);
  const playTimer = useRef(null);
  const [toast, setToast] = useState('');
  const [success, setSuccess] = useState(null); // {title, sub, btn1}
  // Bid screen state
  const [bidJob, setBidJob] = useState(null);
  const [bidForm, setBidForm] = useState({ priceType: 'fixed', price: '2000', priceTo: '3000', visitCharge: 0, message: '' });
  const [screen, setScreen] = useState(null); // {found, cleaned}
  // Coin reveal + report
  const [coinJob, setCoinJob] = useState(null);
  const [reportRec, setReportRec] = useState(null);
  const [reason, setReason] = useState('');
  // Wallet top-up modal
  const [pack, setPack] = useState(null); // {coins, pkr}
  const [tuMethod, setTuMethod] = useState('JazzCash');
  const [receipt, setReceipt] = useState(false);
  const [tuRef, setTuRef] = useState('');
  // Profile photos + re-record editing
  const [photos, setPhotos] = useState(1);
  const [editStep, setEditStep] = useState(0);
  const [editProfile, setEditProfile] = useState(null);

  const me = session ? session.userId : null;
  const profile = db && me ? db.providers[me] : null;
  const wallet = db && me ? db.wallets[me] : null;

  useGoto(setTab);
  useEffect(() => {
    try {
      const open = localStorage.getItem('servio-open-tab');
      if (open) { localStorage.removeItem('servio-open-tab'); if (open === 'wallet') setTab('wallet'); }
    } catch {}
  }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 2800); return () => clearTimeout(id); }, [toast]);
  useEffect(() => { if (tab === 'alerts') markAllRead(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const feedAll = useMemo(() => {
    if (!db || !profile) return [];
    return db.jobs.filter((j) => j.status === 'open' && (profile.categories || []).includes(j.categoryId));
  }, [db, profile]);
  const myBids = useMemo(() => (db && me ? db.bids.filter((b) => b.providerId === me) : []), [db, me]);
  const unread = db && me ? db.notifications.filter((n) => n.userId === me && !n.read).length : 0;

  if (!session || !db || !profile || !wallet) return <main className="page"><p className="muted">Loading…</p></main>;

  const myBidFor = (jobId) => myBids.find((b) => b.jobId === jobId && b.status !== 'removed');
  const revealFor = (job) => db.reveals.find((r) => r.providerId === me && r.seekerId === job.seekerId);
  const isUrgent = (j) => j.urgency === 'Now' || j.urgency === 'Today';
  const feed = feedAll.filter((j) => {
    if (filter === 'urgent') return isUrgent(j);
    if (filter === 'mine') return !!myBidFor(j.id) || !!revealFor(j);
    return true;
  });

  const playVoice = (id) => {
    if (playTimer.current) clearTimeout(playTimer.current);
    setPlayingId(id);
    playTimer.current = setTimeout(() => setPlayingId(null), 2600);
  };

  const jobTitle = (j) => {
    const d = j.description || '';
    const first = d.split('.')[0];
    return first.length > 52 ? first.slice(0, 52) + '…' : first;
  };
  const jobMeta = (j) => {
    const idx = Math.max(0, db.jobs.findIndex((x) => x.id === j.id));
    return { dist: DISTS[idx % DISTS.length], when: lang === 'en' ? j.urgency : (WHEN_RO[j.urgency] || j.urgency), budget: BUDGETS[j.categoryId] || 'PKR 1,000–2,000' };
  };
  const catOf = (j) => db.categories.find((c) => c.id === j.categoryId) || { icon: '🧰' };

  /* ---------- coin reveal: provider pays 5 coins to see the seeker's number.
     Same reveal record + coin rules as store.doReveal, with the notification
     worded for this direction (the seeker is told who saw their number). */
  const openCoinReveal = (job) => {
    const rec = revealFor(job);
    if (rec && !rec.refunded) { setToast('Already shown — FREE hai, coins nahi lage'); return; }
    if (job.revealCount >= 3) return;
    if (wallet.balance < 5) { setToast('🪙 Coins khatam — top-up karein'); setTab('wallet'); return; }
    setCoinJob(job);
  };
  const confirmCoinReveal = () => {
    const job = coinJob; if (!job) return;
    let result;
    transact((d) => {
      const w = d.wallets[me];
      const existing = d.reveals.find((r) => r.seekerId === job.seekerId && r.providerId === me && !r.refunded);
      if (existing) { result = 'already'; return; }
      const j = d.jobs.find((x) => x.id === job.id);
      if (j && j.revealCount >= 3) { result = 'full'; return; }
      if (!w || w.balance < 5) { result = 'low'; return; }
      w.balance -= 5;
      w.txns.unshift({ id: uid(), type: 'reveal', amount: -5, note: `Number shown — ${userName(d, job.seekerId)}`, at: Date.now() });
      d.reveals.unshift({ id: uid(), jobId: job.id, seekerId: job.seekerId, providerId: me, coins: 5, at: Date.now(), refunded: false });
      if (j) j.revealCount += 1;
      notify(d, job.seekerId, `${userName(d, me)} ne aap ka number dekha (${catName(d, job.categoryId)}, ${job.area}).`);
      notifyAdmins(d, `Reveal: ${userName(d, me)} ↔ ${userName(d, job.seekerId)} (5 coins).`);
      logActivity(d, `Reveal — ${userName(d, me)} ↔ ${userName(d, job.seekerId)} (5 coins)`);
      result = 'ok';
    }, { toast: '📞 Number mil gaya', toastFor: [job.seekerId] });
    setCoinJob(null);
    if (result === 'low') { setToast('🪙 Coins khatam — top-up karein'); setTab('wallet'); }
  };

  /* ---------- report a bad lead (existing store semantics: instant refund) */
  const submitReport = () => {
    if (!reason) { setToast('Ek wajah chunein 👆'); return; }
    const rec = reportRec; if (!rec) return;
    transact((d) => {
      const r = d.reveals.find((x) => x.id === rec.id);
      if (!r || r.refunded) return;
      r.refunded = true;
      const w = d.wallets[me];
      w.balance += 5;
      w.txns.unshift({ id: uid(), type: 'refund', amount: 5, note: 'Refund — bad lead reported', at: Date.now() });
      d.refunds.unshift({ id: uid(), revealId: r.id, providerId: me, reason, status: 'auto-approved', at: Date.now() });
      const job = r.jobId ? d.jobs.find((j) => j.id === r.jobId) : null;
      if (job && job.revealCount > 0) job.revealCount -= 1;
      notifyAdmins(d, `Bad lead reported by ${userName(d, me)} (${reason}) — 5 coins auto-refunded.`);
      logActivity(d, `Refund (auto) — ${userName(d, me)} +5 coins, reason: ${reason}`);
    }, { toast: 'Refund approved: +5 coins', toastFor: db.users.filter((u) => u.role === 'admin').map((u) => u.id) });
    setReportRec(null); setReason('');
    setSuccess({ title: 'Refund mil gaya!', sub: '+5 coins wallet mein wapas aa gaye', btn1: { label: '📋 Jobs Dekhein', tab: 'jobs' } });
    setTab('success');
  };

  /* ---------- bid screen */
  const openBid = (job) => {
    const existing = myBidFor(job.id);
    if (existing) {
      setBidForm({
        priceType: existing.priceType, price: String(existing.price || ''), priceTo: String(existing.priceTo || ''),
        visitCharge: existing.visitCharge || 0, message: existing.message || '',
      });
    } else {
      setBidForm({ priceType: 'fixed', price: '2000', priceTo: '3000', visitCharge: 0, message: 'Assalam-o-Alaikum, main kal subah aa sakta hoon.' });
    }
    setBidJob(job);
    setTab('bid');
    window.scrollTo({ top: 0 });
  };
  const doSendBid = (message) => {
    const job = bidJob; if (!job) return;
    const f = bidForm;
    const existing = myBidFor(job.id);
    transact((d) => {
      if (existing) {
        const b = d.bids.find((x) => x.id === existing.id);
        Object.assign(b, { priceType: f.priceType, price: Number(f.price) || null, priceTo: Number(f.priceTo) || null, visitCharge: f.priceType === 'visit' ? f.visitCharge : null, message, status: 'active', at: Date.now() });
      } else {
        d.bids.unshift({ id: 'bid-' + uid(), jobId: job.id, providerId: me, priceType: f.priceType, price: Number(f.price) || null, priceTo: Number(f.priceTo) || null, visitCharge: f.priceType === 'visit' ? f.visitCharge : null, message, status: 'active', at: Date.now() });
      }
      notify(d, job.seekerId, `New bid on your job from ${userName(d, me)} — ${f.priceType === 'visit' ? 'visit PKR ' + f.visitCharge : 'PKR ' + f.price}.`);
      logActivity(d, `Bid — ${userName(d, me)} bid on ${catName(d, job.categoryId)} job in ${job.area}`);
    }, { toast: `New bid from ${session.name}`, toastFor: [job.seekerId] });
    setScreen(null);
    setSuccess({ title: 'Bid chali gayi!', sub: 'Seeker number mange to coins lagenge — bid FREE thi', btn1: { label: '📋 Jobs Dekhein', tab: 'jobs' } });
    setTab('success');
  };
  const sendBid = () => {
    if (bidForm.priceType !== 'visit' && !(Number(bidForm.price) > 0)) { setToast('Sahi rate likhein — misal 2000'); return; }
    const hit = findPhone(bidForm.message);
    if (hit) { setScreen({ found: hit, cleaned: stripPhone(bidForm.message) }); return; }
    doSendBid(bidForm.message);
  };

  /* ---------- wallet */
  const confirmTopup = () => {
    if (!pack || !receipt || !tuRef.trim()) return;
    const req = { id: 'top-' + uid(), providerId: me, coins: pack.coins, pkr: pack.pkr, method: tuMethod, ref: tuRef.trim(), status: 'pending', at: Date.now() };
    transact((d) => {
      d.topups.unshift(req);
      notifyAdmins(d, `Top-up request: ${userName(d, me)} — ${req.coins} coins via ${req.method} (${req.ref}).`);
      logActivity(d, `Top-up requested — ${userName(d, me)}, ${req.coins} coins, ${req.method}`);
    }, { toast: `Top-up request from ${session.name}`, toastFor: db.users.filter((u) => u.role === 'admin').map((u) => u.id) });
    setPack(null); setReceipt(false); setTuRef('');
    setToast(`🎉 +${req.coins} coins! Request: Pending`);
  };

  const toggleAvailability = () => transact((d) => { d.providers[me].availability = !d.providers[me].availability; });
  function markAllRead() { transact((d) => { d.notifications.forEach((n) => { if (n.userId === me) n.read = true; }); }); }

  /* ---------- profile (store profile <-> onboarding shape) */
  const obProfile = {
    name: session.name, work: profile.categories || [], areas: profile.areas || [],
    exp: yearsToExp(profile.experience), charges: priceToCharges(profile.price), avail: !!profile.availability,
  };
  const startRerecord = (key) => {
    const i = OBQ.findIndex((q) => q.key === key);
    if (i < 0) return;
    setEditProfile({ ...obProfile });
    setEditStep(i);
    setTab('edit');
    setToast('🎙️ Dobara bolo ya badal do');
    window.scrollTo({ top: 0 });
  };
  const saveEdit = () => {
    if (!editProfile) { setTab('profile'); return; }
    const newName = (editProfile.name || '').trim() || session.name;
    transact((d) => {
      const pr = d.providers[me];
      pr.categories = editProfile.work; pr.areas = editProfile.areas;
      pr.experience = expToYears(editProfile.exp); pr.price = chargesToPrice(editProfile.charges);
      pr.availability = editProfile.avail;
      const u = d.users.find((x) => x.id === me);
      if (u) u.name = newName;
      logActivity(d, `Profile updated — ${newName}`);
    });
    setSession({ id: me, role: 'provider', name: newName, phone: session.phone });
    setEditProfile(null);
    setTab('profile');
  };

  const navItems = [
    { key: 'home', icon: '🏠', label: t(lang, 'navHome') },
    { key: 'jobs', icon: '📋', label: t(lang, 'navJobs') },
    { key: 'voice', icon: '🎙️', label: t(lang, 'navVoice'), center: true },
    { key: 'wallet', icon: '🪙', label: t(lang, 'navWallet') },
    { key: 'karigar', icon: '🧰', label: t(lang, 'navKarigar') },
  ];
  const navActive = { home: 'home', alerts: 'home', jobs: 'jobs', bid: 'jobs', success: 'jobs', wallet: 'wallet', profile: 'karigar', edit: 'karigar', settings: 'karigar' }[tab] || 'jobs';
  const navGo = (key) => {
    if (key === 'home') setTab('home');
    else if (key === 'jobs') setTab('jobs');
    else if (key === 'wallet') setTab('wallet');
    else if (key === 'karigar') setTab('profile');
    else if (key === 'voice') { const j = feedAll.find((x) => !myBidFor(x.id)); if (j) openBid(j); else setTab('jobs'); }
    window.scrollTo({ top: 0 });
  };

  const fakeBid = { priceType: bidForm.priceType, price: Number(bidForm.price) || 0, priceTo: Number(bidForm.priceTo) || 0, visitCharge: bidForm.visitCharge };

  return (
    <div dir={lang === 'ur' ? 'rtl' : 'ltr'}>
      <AppHeader role="provider" />
      {toast && <div className="toast-wrap" aria-live="polite"><div className="toast">{toast}</div></div>}
      <main className="page">

        {tab === 'home' && (
          <>
            <div className="card">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="avatar">{session.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 19 }}>{session.name}</b>
                  <div className="small" style={{ color: 'var(--marigold-d)', fontWeight: 800 }}>{stars(profile.ratingAvg)} {profile.ratingAvg || 'New'} ({profile.ratingCount || 0})</div>
                  <div className="small muted">🧰 {(profile.categories || []).map((c) => catName(db, c, lang)).join(' • ')} • 📍 {(profile.areas || []).join(' • ')}</div>
                </div>
              </div>
              <div className="field-row">
                <span className="fi">🟢</span>
                <div className="fv"><small>{t(lang, 'available')}</small><b>{profile.availability ? t(lang, 'availOn') : t(lang, 'availOff')}</b></div>
                <label className="switch"><input type="checkbox" checked={!!profile.availability} onChange={toggleAvailability} /><span className="track"></span></label>
              </div>
            </div>
            {wallet.balance < 5 && (
              <div className="warn">🪙 Coins kam hain ({wallet.balance}) — number nahi dikh sakega. Top-up karein.
                <div style={{ height: 8 }} /><button className="btn btn-amber" onClick={() => setTab('wallet')}>🪙 Top-up Karein</button>
              </div>
            )}
            <div className="pill-row" style={{ marginTop: 4 }}>
              <span className="pill active">🪙 {wallet.balance} {t(lang, 'coins')}</span>
              <span className="pill">📋 {feedAll.length} jobs</span>
              <span className="pill">💬 {myBids.length} bids</span>
            </div>
            <button className="btn btn-amber" style={{ marginTop: 12 }} onClick={() => setTab('jobs')}>{t(lang, 'seeJobs')}</button>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => setTab('alerts')}>🔔 {t(lang, 'alerts')}{unread > 0 ? ` (${unread})` : ''}</button>
          </>
        )}

        {tab === 'jobs' && (
          <>
            <div className="section-head" style={{ marginTop: 0 }}>
              <h1 style={{ margin: 0 }}>{t(lang, 'jobsTitle')}</h1>
            </div>
            <div className="pill-row" style={{ marginBottom: 16 }}>
              <button className={`pill ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>{t(lang, 'all')}</button>
              <button className={`pill ${filter === 'urgent' ? 'active' : ''}`} onClick={() => setFilter('urgent')}>{t(lang, 'urgent')}</button>
              <button className={`pill ${filter === 'mine' ? 'active' : ''}`} onClick={() => setFilter('mine')}>{t(lang, 'mine')}</button>
            </div>
            {feed.length === 0 && (
              <div className="card empty"><div className="ei">📭</div><p className="muted">Abhi koi job nahi</p></div>
            )}
            {feed.map((j) => {
              const m = jobMeta(j); const cat = catOf(j);
              const rec = revealFor(j);
              const seeker = db.users.find((u) => u.id === j.seekerId);
              const existing = myBidFor(j.id);
              return (
                <article key={j.id} className="job">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <h3>{cat.icon} {jobTitle(j)}</h3>
                    {isUrgent(j) && <span className="tag">🔴 Urgent</span>}
                  </div>
                  <div className="meta"><span>📍 {j.area} • {m.dist}</span><span>🕐 {m.when}</span><span>💰 {m.budget}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <ListenBtn id={'job' + j.id} playingId={playingId} onPlay={playVoice} />
                    <span className="small muted">{t(lang, 'voiceNote')}</span>
                    <span style={{ marginInlineStart: 'auto' }}><Dots n={j.revealCount || 0} /></span>
                    <span className="small muted">{j.revealCount || 0}/3</span>
                  </div>
                  {rec && !rec.refunded ? (
                    <>
                      <div style={{ background: 'var(--leaf-bg)', borderRadius: 12, padding: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                          <b>📞 <span dir="ltr">{seeker ? seeker.phone : ''}</span></b>
                          <span className="status-chip ok">{t(lang, 'alreadyShown')}</span>
                        </div>
                        <div className="contact-actions">
                          <a className="btn btn-call" style={{ textDecoration: 'none' }} href={`tel:${(seeker ? seeker.phone : '').replace(/-/g, '')}`}>📞 Call</a>
                          <button className="btn btn-wa" onClick={() => setToast('WhatsApp khul raha hai (demo)')}>💬 WhatsApp</button>
                        </div>
                      </div>
                      <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10, color: 'var(--red)' }} onClick={() => { setReportRec(rec); setReason(''); }}>
                        🚩 Report — ghalat lead <span className="small muted">(48h)</span>
                      </button>
                    </>
                  ) : rec && rec.refunded ? (
                    <p style={{ margin: 0 }}><span className="status-chip ok">🚩 Report ho gayi — Refund +5 🪙</span></p>
                  ) : (j.revealCount || 0) >= 3 ? (
                    <div className="closed-note">{t(lang, 'closed3')}</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button className="btn btn-primary" onClick={() => openCoinReveal(j)}>{t(lang, 'number')}</button>
                      {existing
                        ? <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => openBid(j)}>{t(lang, 'bidSent')}</button>
                        : <button className="btn btn-amber" onClick={() => openBid(j)}>{t(lang, 'bidFree')}</button>}
                    </div>
                  )}
                  {rec && !rec.refunded && existing && (
                    <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => openBid(j)}>{t(lang, 'bidSent')}</button>
                  )}
                </article>
              );
            })}
          </>
        )}

        {tab === 'bid' && bidJob && (
          <>
            <button className="backlink" onClick={() => setTab('jobs')}>← {t(lang, 'back')}</button>
            <h1>💬 {lang === 'en' ? 'Send a bid' : lang === 'ur' ? 'بِڈ بھیجیں' : 'Bid bhejein'} <span className="tag gold">{t(lang, 'free')}</span></h1>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 17 }}>{catOf(bidJob).icon} {jobTitle(bidJob)}</h3>
              <div className="meta" style={{ margin: 0 }}><span>📍 {bidJob.area} • {jobMeta(bidJob).dist}</span><span>🕐 {jobMeta(bidJob).when}</span><span>💰 {jobMeta(bidJob).budget}</span></div>
            </div>
            <h2>{t(lang, 'priceHow')}</h2>
            <div className="type-grid" style={{ marginTop: 10 }}>
              {[['fixed', '🎯', p(lang, 'tFixed'), p(lang, 'tFixedS')], ['range', '↔️', p(lang, 'tRange'), p(lang, 'tRangeS')], ['visit', '👀', p(lang, 'tVisit'), p(lang, 'tVisitS')]].map(([v, ic, l, s]) => (
                <button key={v} className={`type-opt ${bidForm.priceType === v ? 'sel' : ''}`} onClick={() => setBidForm({ ...bidForm, priceType: v })}><span className="ti">{ic}</span><span><b>{l}</b><small>{s}</small></span></button>
              ))}
            </div>
            {bidForm.priceType !== 'visit' && (
              <div>
                <label>{t(lang, 'howMuch')}</label>
                <input className="amount-input" inputMode="numeric" value={bidForm.price} onChange={(e) => setBidForm({ ...bidForm, price: e.target.value })} aria-label="Amount PKR" />
                <div className="pill-row" style={{ marginTop: 10, justifyContent: 'center' }}>
                  {[500, 1000, 1500, 2000].map((v) => (<button key={v} className="pill" onClick={() => setBidForm({ ...bidForm, price: String(v) })}>{v.toLocaleString()}</button>))}
                </div>
                {bidForm.priceType === 'range' && (
                  <div>
                    <label>{p(lang, 'toL')}</label>
                    <input className="amount-input" inputMode="numeric" value={bidForm.priceTo} onChange={(e) => setBidForm({ ...bidForm, priceTo: e.target.value })} aria-label="Max amount PKR" />
                  </div>
                )}
              </div>
            )}
            {bidForm.priceType === 'visit' && (
              <div>
                <label>{t(lang, 'visitCharge')}</label>
                <div className="pill-row">
                  {[[0, t(lang, 'freeVisit')], [200, 'PKR 200'], [300, 'PKR 300'], [500, 'PKR 500']].map(([v, l]) => (
                    <button key={v} className={`pill ${bidForm.visitCharge === v ? 'active' : ''}`} onClick={() => setBidForm({ ...bidForm, visitCharge: v })}>{l}</button>
                  ))}
                </div>
              </div>
            )}
            <label>{t(lang, 'message')}</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <textarea rows={2} style={{ flex: 1 }} placeholder="Assalam-o-Alaikum…" value={bidForm.message} onChange={(e) => setBidForm({ ...bidForm, message: e.target.value })} />
              <button className="mic-mini" style={{ width: 56, height: 56, flexBasis: 56, fontSize: 24 }} aria-label="Voice message"
                onClick={() => { setBidForm({ ...bidForm, message: 'Assalam-o-Alaikum, main kal subah 10 baje aa sakta hoon. Kaam saaf aur guarantee ke saath hoga.' }); setToast('🎙️ Voice message lag gaya'); }}>🎙️</button>
            </div>
            <div className="card" style={{ marginTop: 16 }}>
              <div className="small muted" style={{ fontWeight: 700 }}>{t(lang, 'review')}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <b>{jobTitle(bidJob)}</b><span className="tag gold">FREE bid</span>
              </div>
              <div className="price-big" style={{ marginTop: 8 }}>{priceText(fakeBid)}</div>
              <div className="small muted">{priceTypeLabel(fakeBid)}</div>
            </div>
            <div className="sticky-action">
              <button className="btn btn-amber" onClick={sendBid}>{myBidFor(bidJob.id) ? t(lang, 'updateBid') : t(lang, 'sendBid')}</button>
            </div>
          </>
        )}

        {tab === 'wallet' && (
          <>
            <button className="backlink" onClick={() => setTab('home')}>← {t(lang, 'back')}</button>
            <h1>{t(lang, 'walletTitle')}</h1>
            <div className="balance-card">
              <div className="num">{wallet.balance} <small style={{ fontSize: 20 }}>{t(lang, 'coins')}</small></div>
              <div style={{ color: '#D9D2BF', fontWeight: 700 }}>= PKR {(wallet.balance * COIN_PKR).toLocaleString()}</div>
              <div style={{ color: '#D9D2BF', fontSize: 14, marginTop: 4 }}>{p(lang, 'coinRule')}</div>
            </div>
            {wallet.balance < 5 && <div className="warn" style={{ marginTop: 12 }}>Coins khatam honay walay hain — number nahi dikh sakega.</div>}
            <h2 style={{ margin: '20px 0 8px' }}>{t(lang, 'buyCoins')}</h2>
            <div className="cat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
              {[20, 50, 100].map((c) => (
                <button key={c} className="pack" onClick={() => { setPack({ coins: c, pkr: c * COIN_PKR }); setReceipt(false); setTuRef(''); }}>
                  <b>{c}{c === 50 ? ' ⭐' : ''}</b><span>PKR {(c * COIN_PKR).toLocaleString()}</span>
                </button>
              ))}
            </div>
            <h2 style={{ margin: '20px 0 8px' }}>{t(lang, 'history')}</h2>
            <div className="card" style={{ padding: '6px 16px' }}>
              {db.topups.filter((x) => x.providerId === me).map((x) => (
                <div key={x.id} className="txn">
                  <span>🪙 Top-up — {x.method}<br /><span className="small muted">{x.ref} • {new Date(x.at).toLocaleDateString()}</span></span>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`status-chip ${x.status === 'approved' ? 'ok' : ''}`}>{x.status === 'approved' ? 'Approved' : x.status === 'rejected' ? 'Rejected' : 'Pending'}</span>
                    <b className="pos">+{x.coins} 🪙</b>
                  </span>
                </div>
              ))}
              {wallet.txns.length === 0 && db.topups.filter((x) => x.providerId === me).length === 0 && <p className="muted">Abhi koi history nahi</p>}
              {wallet.txns.map((x) => (
                <div key={x.id} className="txn"><span>{x.note}<br /><span className="small muted">{new Date(x.at).toLocaleString()}</span></span><b className={x.amount >= 0 ? 'pos' : 'neg'}>{x.amount >= 0 ? '+' : ''}{x.amount} 🪙</b></div>
              ))}
            </div>
          </>
        )}

        {tab === 'profile' && (
          <>
            <button className="backlink" onClick={() => setTab('home')}>← {t(lang, 'back')}</button>
            <h1>{t(lang, 'myProfile')}</h1>
            <ProfileCard
              profile={obProfile}
              lang={lang}
              categories={db.categories}
              onRerecord={startRerecord}
              onAvail={toggleAvailability}
              photos={photos}
              onPhotos={(n) => { setPhotos(n); if (n > photos) setToast(`📷 Photo lag gayi (${n} / 10)`); }}
            />
            <div className="sticky-action"><button className="btn btn-primary" onClick={() => setToast('✅ Profile pehle se LIVE hai')}>{t(lang, 'goLive')}</button></div>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => setTab('settings')}>{t(lang, 'settings')}</button>
          </>
        )}

        {tab === 'edit' && editProfile && (
          <ObStep
            step={editStep}
            profile={editProfile}
            onChange={(patch) => setEditProfile((pr) => ({ ...pr, ...patch }))}
            lang={lang}
            categories={db.categories.filter((c) => c.active)}
            areas={db.areas.filter((a) => a.active).map((a) => a.name)}
            onBack={() => setTab('profile')}
            onNext={saveEdit}
            onSkip={saveEdit}
            returnTo="profile"
          />
        )}

        {tab === 'settings' && (
          <>
            <button className="backlink" onClick={() => setTab('profile')}>← {t(lang, 'back')}</button>
            <h1>{t(lang, 'settings')}</h1>
            <div className="card">
              <div className="field-row"><span className="fi">👤</span><div className="fv"><small>Name</small><b>{session.name}</b></div></div>
              <div className="field-row"><span className="fi">📱</span><div className="fv"><small>Phone</small><b dir="ltr">{session.phone}</b></div></div>
              <div className="field-row"><span className="fi">🌐</span><div className="fv"><small>Language</small><b>Top bar se badlein ↑</b></div></div>
              <div className="field-row">
                <span className="fi">🟢</span>
                <div className="fv"><small>Available (karigar)</small><b>{profile.availability ? 'ON' : 'OFF'}</b></div>
                <label className="switch"><input type="checkbox" checked={!!profile.availability} onChange={toggleAvailability} /><span className="track"></span></label>
              </div>
            </div>
            <div className="sticky-action"><button className="btn btn-primary" onClick={() => { clearSession(); router.replace('/login'); }}>↩ {t(lang, 'logout')}</button></div>
          </>
        )}

        {tab === 'alerts' && (
          <>
            <button className="backlink" onClick={() => setTab('home')}>← {t(lang, 'back')}</button>
            <h1>🔔 {t(lang, 'alerts')}</h1>
            {db.notifications.filter((n) => n.userId === me).length === 0 && <div className="card empty"><div className="ei">🔔</div><p className="muted">No alerts yet.</p></div>}
            {db.notifications.filter((n) => n.userId === me).map((n) => (
              <div key={n.id} className="card" style={{ padding: '12px 16px' }}>{n.text}<div className="small muted">{new Date(n.at).toLocaleString()}</div></div>
            ))}
          </>
        )}

        {tab === 'success' && success && (
          <Celebrate
            title={success.title}
            sub={success.sub}
            btn1={{ label: success.btn1.label, onClick: () => setTab(success.btn1.tab) }}
            btn2={{ label: '🏠 Home', onClick: () => setTab('home') }}
          />
        )}
      </main>

      {/* Coin reveal modal (prototype coinModal) */}
      {coinJob && (
        <div className="modal open">
          <div className="modal-card">
            <h3>📞 {p(lang, 'revealTitle')}</h3>
            <p className="muted" style={{ margin: '0 0 12px' }}>📍 {coinJob.area} • {jobTitle(coinJob)} • {userName(db, coinJob.seekerId)}</p>
            <div style={{ background: '#F3EAD8', border: '1px solid var(--line)', borderRadius: 12, padding: 13, display: 'flex', justifyContent: 'space-between' }}><span>{p(lang, 'costL')}</span><b>5 coins = PKR 50</b></div>
            <div style={{ background: '#F3EAD8', border: '1px solid var(--line)', borderRadius: 12, padding: 13, display: 'flex', justifyContent: 'space-between', marginTop: 8 }}><span>{p(lang, 'afterL')}</span><b>{wallet.balance - 5} coins</b></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setCoinJob(null)}>✕</button>
              <button className="btn btn-primary" onClick={confirmCoinReveal}>✓ {p(lang, 'yesNum')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal (prototype reportModal) */}
      {reportRec && (
        <div className="modal open">
          <div className="modal-card">
            <h3>🚩 Report karein</h3>
            <p className="muted" style={{ margin: '0 0 12px' }}>Kya masla tha? <span className="chip">48 ghante ke andar</span></p>
            <div style={{ display: 'grid', gap: 10 }}>
              {REASONS.map(([v, l]) => (
                <button key={v} className={`reason-opt ${reason === v ? 'sel' : ''}`} onClick={() => setReason(v)}>{l}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setReportRec(null)}>✕</button>
              <button className="btn btn-primary" onClick={submitReport}>✓ Report Bhejein</button>
            </div>
          </div>
        </div>
      )}

      {/* Top-up modal (prototype topupModal) */}
      {pack && (
        <div className="modal open">
          <div className="modal-card">
            <h3>{t(lang, 'topUp')}</h3>
            <div style={{ background: '#F3EAD8', border: '1px solid var(--line)', borderRadius: 12, padding: 13, textAlign: 'center' }}>
              <b style={{ fontSize: 19 }}>{pack.coins} coins — PKR {pack.pkr.toLocaleString()}</b>
            </div>
            <div className="pill-row" style={{ justifyContent: 'center', marginTop: 12 }}>
              {['JazzCash', 'Easypaisa'].map((m) => (
                <button key={m} className={`pill ${tuMethod === m ? 'active' : ''}`} onClick={() => setTuMethod(m)}>📱 {m}</button>
              ))}
            </div>
            <p className="small muted" style={{ textAlign: 'center' }}>{tuMethod} {lang === 'en' ? '— send to' : 'par bhejein'}<br /><b style={{ fontSize: 16, color: 'var(--ink)' }}>0300-XXXXXXX</b></p>
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => { setReceipt(true); setToast('📷 Receipt mil gayi — check ho rahi hai'); }}>{receipt ? t(lang, 'receiptOk') : t(lang, 'receipt')}</button>
            <label>Transaction reference</label>
            <input value={tuRef} onChange={(e) => setTuRef(e.target.value)} placeholder="e.g. TXN-123456" />
            <button className="btn btn-amber" style={{ marginTop: 10 }} disabled={!receipt || !tuRef.trim()} onClick={confirmTopup}>{t(lang, 'addCoins')}</button>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => setPack(null)}>✕ {p(lang, 'close')}</button>
          </div>
        </div>
      )}

      <ScreeningModal found={screen?.found} cleaned={screen?.cleaned} onContinue={() => doSendBid(screen.cleaned)} onClose={() => setScreen(null)} />

      <BottomNav items={navItems} active={navActive} onGo={navGo} />
    </div>
  );
}
