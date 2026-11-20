'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader, { useGuard, useLang } from '../../components/AppHeader';
import BottomNav from '../../components/BottomNav';
import { ListenBtn, Celebrate, ScreeningModal, priceText, priceTypeLabel, stars, avColor, ProviderAvatar } from '../../components/ui';
import { PHOTO_ICONS } from '../../components/Onboarding';
import { useServio, transact, uid, notify, notifyAdmins, logActivity, findPhone, stripPhone, requestReveal, userName, catName, clearSession } from '../../lib/store';
import { TINTS } from '../../lib/seed';
import { t, p } from '../../lib/i18n';

// The prototype's three voice samples, verbatim (category names mapped to store ids).
const SAMPLES = [
  { t: 'Mere ghar ka bathroom wala nal leak ho raha hai. Kal subah plumber chahiye, Depalpur mein.', catId: 'plumber', loc: 'Depalpur', when: 'Kal subah', budget: 'PKR 1,500 – 2,500', desc: 'Bathroom ka nal leak ho raha hai.' },
  { t: 'AC bilkul cooling nahi kar raha. Aaj hi AC wala chahiye, Haveli Lakha mein.', catId: 'ac', loc: 'Haveli Lakha', when: 'Aaj hi — urgent', budget: 'PKR 2,000 – 3,500', desc: 'AC cooling nahi kar raha, gas check karna hai.' },
  { t: 'Ghar ki bijli baar baar ja rahi hai, wiring mein fault hai. Is hafte electrician chahiye.', catId: 'electrician', loc: '', when: 'Is hafte mein', budget: 'PKR 3,000 – 5,000', desc: 'Bijli baar baar trip ho rahi hai, wiring fault hai.' },
];
const WHEN_TO_URGENCY = { 'Kal subah': 'Today', 'Aaj hi — urgent': 'Now', 'Is hafte mein': 'This week' };
const DISTS = ['0.8 km', '1.4 km', '4.2 km', '3.1 km'];
const BUDGETS = { plumber: 'PKR 1,500–2,500', ac: 'PKR 2,000–3,500', electrician: 'PKR 3,000–5,000', carpenter: 'PKR 1,000–1,800' };
const WHEN_RO = { Now: 'Aaj hi', Today: 'Kal subah', 'This week': 'Is hafte' };

export default function SeekerPage() {
  const router = useRouter();
  const session = useGuard('seeker');
  const db = useServio();
  const lang = useLang();
  const [tab, setTab] = useState('home');
  const [toast, setToast] = useState('');
  // Voice job-post flow
  const [sampleIdx, setSampleIdx] = useState(0);
  const [tappedCat, setTappedCat] = useState(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [typedText, setTypedText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [extracted, setExtracted] = useState(null); // {categoryId, area, when, budget, desc}
  const [pendingSample, setPendingSample] = useState(null);
  const [fuAnswer, setFuAnswer] = useState('');
  const [jobPhotos, setJobPhotos] = useState(0);
  const [screen, setScreen] = useState(null);
  const [success, setSuccess] = useState(null);
  const voiceTimer = useRef(null);
  const aiTimer = useRef(null);
  // Bids / reveal
  const [bidsJobId, setBidsJobId] = useState(null);
  const [providerId, setProviderId] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const playTimer = useRef(null);
  // Rating (hire prompt)
  const [dismissed, setDismissed] = useState([]);
  const [thanksName, setThanksName] = useState(null);
  const [hireChoice, setHireChoice] = useState(null);
  const [hireStars, setHireStars] = useState(0);
  const [hireReview, setHireReview] = useState('');
  // PWA card
  const [pwaDismissed, setPwaDismissed] = useState(false);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  const me = session ? session.userId : null;
  const myJobs = useMemo(() => (db && me ? db.jobs.filter((j) => j.seekerId === me) : []), [db, me]);
  const myReveals = useMemo(() => (db && me ? db.reveals.filter((r) => r.seekerId === me) : []), [db, me]);
  const ratedIds = useMemo(() => (db ? new Set(db.reviews.map((r) => r.revealId)) : new Set()), [db]);
  const unread = db && me ? db.notifications.filter((n) => n.userId === me && !n.read).length : 0;
  const pendingRating = myReveals.find((r) => !r.refunded && !ratedIds.has(r.id) && !dismissed.includes(r.id)) || null;

  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 2800); return () => clearTimeout(id); }, [toast]);
  useEffect(() => { if (tab === 'alerts') markAllRead(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (voiceTimer.current) clearInterval(voiceTimer.current); if (aiTimer.current) clearTimeout(aiTimer.current); }, []);

  if (!session || !db) return <main className="page"><p className="muted">Loading…</p></main>;

  const providerUsers = db.users.filter((u) => u.role === 'provider' && db.providers[u.id] && u.status === 'active');
  const avIndex = (pid) => Math.max(0, providerUsers.findIndex((u) => u.id === pid));
  const revealedFor = (pid) => db.reveals.find((r) => r.seekerId === me && r.providerId === pid && !r.refunded);
  const jobTitle = (j) => { const f = (j.description || '').split('.')[0]; return f.length > 52 ? f.slice(0, 52) + '…' : f; };
  const catOf = (id) => db.categories.find((c) => c.id === id) || { icon: '🧰' };
  const whenLabel = (j) => (lang === 'en' ? j.urgency : (WHEN_RO[j.urgency] || j.urgency));
  const budgetLabel = (j) => BUDGETS[j.categoryId] || 'PKR 1,000–2,000';
  function markAllRead() { transact((d) => { d.notifications.forEach((n) => { if (n.userId === me) n.read = true; }); }); }

  const playVoice = (id) => {
    if (playTimer.current) clearTimeout(playTimer.current);
    setPlayingId(id);
    playTimer.current = setTimeout(() => setPlayingId(null), 2600);
  };

  /* ---------- voice job post (prototype voice view) */
  const goPost = () => { setTab('post'); window.scrollTo({ top: 0 }); };
  const catTap = (catId, idx) => { setSampleIdx(idx % SAMPLES.length); setTappedCat(catId); goPost(); setToast(`${catOf(catId).icon} ${catName(db, catId, lang)} — ab bolo 🎙️`); };
  const aiProcess = (s) => {
    setExtracted(null); setAiLoading(true);
    aiTimer.current = setTimeout(() => {
      setAiLoading(false);
      if (!s.loc) { setPendingSample(s); setFuAnswer(''); setTab('followup'); window.scrollTo({ top: 0 }); }
      else setExtracted({ categoryId: tappedCat || s.catId, area: s.loc, when: s.when, budget: s.budget, desc: s.desc });
    }, 1200);
  };
  const toggleVoice = () => {
    if (listening) return;
    const s = SAMPLES[sampleIdx];
    setListening(true); setTranscript('');
    const words = s.t.split(' '); let idx = 0;
    voiceTimer.current = setInterval(() => {
      idx++; setTranscript(words.slice(0, idx).join(' '));
      if (idx >= words.length) {
        clearInterval(voiceTimer.current);
        setListening(false);
        aiProcess(s);
      }
    }, 170);
  };
  const typeSubmit = () => {
    const txt = typedText.trim();
    if (!txt) { setToast('Pehle masla likhein ✍️'); return; }
    const s = SAMPLES[sampleIdx];
    setTranscript(txt);
    aiProcess({ ...s, t: txt, desc: txt });
  };
  const fuPick = (area) => {
    if (!pendingSample) return;
    setFuAnswer('📍 ' + area);
    const s = { ...pendingSample, loc: area };
    setPendingSample(null);
    setTimeout(() => {
      setTab('post');
      setExtracted({ categoryId: tappedCat || s.catId, area: s.loc, when: s.when, budget: s.budget, desc: s.desc });
      setToast('✅ Job tayyar hai');
    }, 600);
  };
  const createJob = (desc) => {
    const ex = extracted; if (!ex) return;
    const job = {
      id: 'job-' + uid(), seekerId: me, categoryId: ex.categoryId, description: (desc || ex.desc).trim(),
      area: ex.area, urgency: WHEN_TO_URGENCY[ex.when] || 'Today', status: 'open', revealCount: 0, at: Date.now(),
    };
    const targets = db.users.filter((u) => u.role === 'provider' && db.providers[u.id] && db.providers[u.id].categories.includes(ex.categoryId)).map((u) => u.id);
    transact((d) => {
      d.jobs.unshift(job);
      targets.forEach((pid) => notify(d, pid, `New job: ${catName(d, job.categoryId)} in ${job.area}.`));
      notifyAdmins(d, `New job posted by ${userName(d, me)} — ${catName(d, job.categoryId)}, ${job.area}.`);
      logActivity(d, `New job — ${catName(d, job.categoryId)} in ${job.area} by ${userName(d, me)}`);
    }, { toast: 'New job posted in ' + job.area, toastFor: [...targets, ...db.users.filter((u) => u.role === 'admin').map((u) => u.id)] });
    setExtracted(null); setTranscript(''); setTypedText(''); setTappedCat(null); setJobPhotos(0); setScreen(null);
    setSuccess({ title: 'Job LIVE ho gayi!', sub: 'Karigar bids bhejna shuru karenge', btn1: { label: '📋 Meri Jobs', tab: 'jobs' } });
    setTab('success');
    window.scrollTo({ top: 0 });
  };
  const postJob = () => {
    if (!extracted) return;
    const hit = findPhone(extracted.desc);
    if (hit) { setScreen({ found: hit, cleaned: stripPhone(extracted.desc) }); return; }
    if (!extracted.area.trim()) {
      setPendingSample({ catId: extracted.categoryId, loc: '', when: extracted.when, budget: extracted.budget, desc: extracted.desc });
      setFuAnswer(''); setTab('followup'); return;
    }
    createJob();
  };

  /* ---------- reveal by REQUEST: the seeker only asks. No coins move here —
     the provider's Accept runs the 5-coin rule (store.acceptRevealRequest).
     States per provider (+job): none -> pending -> accepted (number visible)
     or declined (seeker may request again). */
  const requests = db.revealRequests || [];
  const requestFor = (pid, jobId) => requests
    .filter((r) => r.seekerId === me && r.providerId === pid && (r.jobId || null) === (jobId || null))
    .sort((a, b) => b.at - a.at)[0] || null;
  const sendRequest = (pid, jobId) => {
    let result;
    transact((d) => { result = requestReveal(d, { seekerId: me, providerId: pid, jobId }); },
      { toast: '📞 Number request aayi hai', toastFor: [pid] });
    if (result === 'ok' || result === 'exists') setToast('📞 Request bheji gayi — provider ke jawab ka intezar');
    else if (result === 'already') setToast('✓ Number pehle se mila hua hai');
  };
  // The request action area shared by bid cards and the provider profile.
  const requestArea = (pid, jobId, closed) => {
    const req = requestFor(pid, jobId);
    if (req && req.status === 'pending') {
      return <div className="closed-note" role="status">{t(lang, 'reqWaiting')}</div>;
    }
    return (
      <>
        {req && req.status === 'declined' && (
          <p className="small" style={{ margin: '0 0 8px', color: 'var(--red)', fontWeight: 700 }}>{t(lang, 'reqDeclined')}</p>
        )}
        <button className="btn btn-primary" disabled={closed} onClick={() => sendRequest(pid, jobId)}>
          {req && req.status === 'declined' ? t(lang, 'reqAgain') : t(lang, 'reqNumber')}
        </button>
        <p className="small muted" style={{ textAlign: 'center', margin: '8px 0 0' }}>
          {lang === 'en' ? 'Request goes to the karigar — accept it and the number is yours. FREE for you.' : 'Request karigar ke paas jayegi — woh accept kare to number mil jayega. Aap ke liye FREE.'}
        </p>
      </>
    );
  };

  /* ---------- hire prompt / rating (prototype renderHirePrompts) */
  const hireAnswer = (yes) => {
    if (!pendingRating) return;
    if (!yes) { setDismissed((d) => [...d, pendingRating.id]); setHireChoice(null); setToast('Theek hai — shukriya!'); return; }
    setHireChoice('yes');
  };
  const sendRating = () => {
    if (!pendingRating) return;
    if (!hireStars) { setToast('Pehle stars tap karein ⭐'); return; }
    const rec = pendingRating;
    const starsN = hireStars; const review = hireReview;
    transact((d) => {
      d.reviews.unshift({ id: uid(), revealId: rec.id, seekerId: me, providerId: rec.providerId, hired: 'yes', stars: starsN, review, at: Date.now() });
      const pr = d.providers[rec.providerId];
      if (pr) {
        pr.ratingAvg = Math.round((((pr.ratingAvg || 0) * (pr.ratingCount || 0)) + starsN) / ((pr.ratingCount || 0) + 1) * 10) / 10;
        pr.ratingCount = (pr.ratingCount || 0) + 1;
      }
      notify(d, rec.providerId, `New rating — ${starsN} stars from ${userName(d, me)}.`);
      logActivity(d, `Rating — ${userName(d, reveal.providerId)} got ${starsN}★`);
    }, { toast: `New rating: ${starsN} stars`, toastFor: [rec.providerId] });
    setThanksName(userName(db, rec.providerId));
    setHireChoice(null); setHireStars(0); setHireReview('');
  };
  const hirePrompt = thanksName ? (
    <div className="card hire-card" style={{ marginBottom: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 36 }}>⭐</div><b>Shukriya!</b>
      <p className="small muted" style={{ margin: '4px 0 10px' }}>{thanksName} ki rating mil gayi.</p>
      <button className="btn btn-ghost" onClick={() => setThanksName(null)}>✓ Theek hai</button>
    </div>
  ) : pendingRating ? (
    hireChoice === 'yes' ? (
      <div className="card hire-card" style={{ marginBottom: 12 }}>
        <b>⭐ {userName(db, pendingRating.providerId)} ko kitne stars?</b>
        <div style={{ textAlign: 'center' }}>
          {[1, 2, 3, 4, 5].map((i) => (<button key={i} className={`star-btn ${i <= hireStars ? 'on' : ''}`} onClick={() => setHireStars(i)} aria-label={`${i} stars`}>★</button>))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea rows={2} style={{ flex: 1 }} placeholder="Review likhein (optional)…" value={hireReview} onChange={(e) => setHireReview(e.target.value)} />
          <button className="mic-mini" style={{ width: 56, height: 56, flexBasis: 56, fontSize: 24 }} aria-label="Voice review"
            onClick={() => { setHireReview('Kaam bohat acha kiya, waqt par aaya.'); setToast('🎙️ Voice review lag gaya'); }}>🎙️</button>
        </div>
        <button className="btn btn-amber" style={{ marginTop: 12 }} onClick={sendRating}>📩 Rating Bhejein</button>
      </div>
    ) : (
      <div className="card hire-card" style={{ marginBottom: 12 }}>
        <b>🤝 Kya aap ne {userName(db, pendingRating.providerId)} ko hire kiya?</b>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => hireAnswer(true)}>✓ Haan</button>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => hireAnswer(false)}>✕ Nahi</button>
        </div>
      </div>
    )
  ) : null;

  const pwaCard = pwaInstalled ? (
    <div className="pwa-card" style={{ textAlign: 'center' }}><b>✓ Servio home screen par hai</b></div>
  ) : !pwaDismissed ? (
    <div className="pwa-card">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 38 }}>📱</span>
        <div style={{ flex: 1 }}><b>Add Servio to home screen</b><div className="small muted">App ki tarah — ek tap mein khulega</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <button className="btn btn-primary" onClick={() => { setPwaInstalled(true); setToast('✓ Home screen par lag gaya!'); }}>＋ Add</button>
        <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setPwaDismissed(true)}>Later</button>
      </div>
    </div>
  ) : null;

  const bidsJob = bidsJobId ? db.jobs.find((j) => j.id === bidsJobId) : null;
  const jobBids = bidsJob ? db.bids.filter((b) => b.jobId === bidsJob.id) : [];
  const bidsUsed = bidsJob ? jobBids.filter((b) => revealedFor(b.providerId)).length : 0;
  const detailProvider = providerId ? db.users.find((u) => u.id === providerId) : null;

  const navItems = [
    { key: 'home', icon: '🏠', label: t(lang, 'navHome') },
    { key: 'jobs', icon: '📋', label: t(lang, 'navJobs') },
    { key: 'voice', icon: '🎙️', label: t(lang, 'navVoice'), center: true },
    { key: 'wallet', icon: '🪙', label: t(lang, 'navWallet') },
    { key: 'karigar', icon: '🧰', label: t(lang, 'navKarigar') },
  ];
  const navActive = { home: 'home', alerts: 'home', settings: 'home', jobs: 'jobs', bids: 'jobs', followup: 'jobs', success: 'jobs', post: 'voice', wallet: 'wallet', karigar: 'karigar', provider: 'karigar' }[tab] || 'home';
  const navGo = (key) => {
    if (key === 'home') setTab('home');
    else if (key === 'jobs') setTab('jobs');
    else if (key === 'voice') goPost();
    else if (key === 'wallet') setTab('wallet');
    else if (key === 'karigar') setTab('karigar');
    window.scrollTo({ top: 0 });
  };

  return (
    <div dir={lang === 'ur' ? 'rtl' : 'ltr'}>
      <AppHeader role="seeker" />
      {toast && <div className="toast-wrap" aria-live="polite"><div className="toast">{toast}</div></div>}
      <main className="page">

        {tab === 'home' && (
          <>
            <div className="voice-hero">
              <h1>{lang === 'en' ? <>Say it. <em>Get it done.</em></> : lang === 'ur' ? p(lang, 'heroTitle') : <>Bol kar kaam <em>karwao</em></>}</h1>
              <p>{p(lang, 'heroSub')}</p>
              <button className="bigmic" aria-label="Bol kar kaam post karein" onClick={goPost}>🎙️</button>
              <div style={{ fontWeight: 800 }}>{p(lang, 'tapMic')}</div>
            </div>
            {hirePrompt}
            {pwaCard}
            <div className="section-head"><h2>{p(lang, 'catTitle')}</h2></div>
            <div className="cat-grid">
              {db.categories.map((c, i) => c.active ? (
                <button key={c.id} className="cat" style={{ background: TINTS[i % TINTS.length] }} onClick={() => catTap(c.id, i)}>
                  <span className="ic">{c.icon}</span><b>{lang === 'ur' ? c.ur : lang === 'ro' ? c.ro : c.en}</b>
                </button>
              ) : null)}
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => setTab('karigar')}>{t(lang, 'seeKarigar')} →</button>
            <div className="footer-link">
              <button onClick={() => setTab('alerts')}>🔔 {t(lang, 'alerts')}{unread > 0 ? ` (${unread})` : ''}</button>
              <button onClick={() => setTab('settings')}>{t(lang, 'settings')}</button>
            </div>
          </>
        )}

        {tab === 'post' && (
          <>
            <button className="backlink" onClick={() => setTab('home')}>← {t(lang, 'back')}</button>
            <h1>🎙️ {p(lang, 'voiceTitle')}</h1>
            <div className={`voice-panel ${listening ? 'listening' : 'idle'}`}>
              <div className="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
              <b>{listening ? 'Sun raha hoon… bolo' : extracted || aiLoading ? '✅ Samajh aa gaya!' : 'Mic dabao aur bolo'}</b>
              <button className={`bigmic ${listening ? 'listening' : ''}`} style={{ marginTop: 16 }} onClick={toggleVoice} aria-label="Bolna shuru karein">{listening ? '🔴' : '🎙️'}</button>
              <div className="pill-row" style={{ justifyContent: 'center' }}>
                <button className="pill" onClick={() => { setSampleIdx(0); setToast('Example tayyar — mic dabao 🎙️'); }}>💧 Plumber</button>
                <button className="pill" onClick={() => { setSampleIdx(1); setToast('Example tayyar — mic dabao 🎙️'); }}>❄️ AC</button>
                <button className="pill" onClick={() => { setSampleIdx(2); setToast('Example tayyar — mic dabao 🎙️'); }}>⚡ Bijli</button>
              </div>
              <div className="transcript">{transcript || '—'}</div>
            </div>
            <label>{p(lang, 'orType')}</label>
            <textarea rows={2} placeholder="Masla likhein…" value={typedText} onChange={(e) => setTypedText(e.target.value)} />
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={typeSubmit}>✍️ {p(lang, 'useText')}</button>
            <div className="card" style={{ marginTop: 16 }}>
              <h2>{t(lang, 'photos')} <span className="muted small">{jobPhotos} / 5</span></h2>
              <div className="photo-grid">
                {Array.from({ length: jobPhotos }).map((_, i) => (
                  <div className="photo-tile" key={i}>{PHOTO_ICONS[i % PHOTO_ICONS.length]}<button onClick={() => setJobPhotos(jobPhotos - 1)} aria-label="Hatao">✕</button></div>
                ))}
                {jobPhotos < 5 && <button className="photo-add" onClick={() => setJobPhotos(jobPhotos + 1)}>📷 +</button>}
              </div>
            </div>
            {aiLoading && (
              <div className="card" style={{ marginTop: 16 }} aria-live="polite">
                <h2>🤖 {p(lang, 'aiThinking')}</h2>
                <div className="skel" style={{ width: '70%' }}></div><div className="skel" style={{ width: '90%' }}></div><div className="skel" style={{ width: '55%' }}></div>
              </div>
            )}
            {extracted && !aiLoading && (
              <div className="card" style={{ marginTop: 16 }}>
                <h2>✅ {p(lang, 'aiGot')}</h2>
                <label>{p(lang, 'fCatL')}</label>
                <select value={extracted.categoryId} onChange={(e) => setExtracted({ ...extracted, categoryId: e.target.value })}>
                  {db.categories.filter((c) => c.active).map((c) => (<option key={c.id} value={c.id}>{lang === 'ur' ? c.ur : lang === 'ro' ? c.ro : c.en}</option>))}
                </select>
                <label>{p(lang, 'fLocL')}</label>
                <input value={extracted.area} onChange={(e) => setExtracted({ ...extracted, area: e.target.value })} />
                <label>{p(lang, 'fWhenL')}</label>
                <select value={extracted.when} onChange={(e) => setExtracted({ ...extracted, when: e.target.value })}>
                  <option>Kal subah</option><option>Aaj hi — urgent</option><option>Is hafte mein</option>
                </select>
                <label>{p(lang, 'fBudgetL')}</label>
                <input value={extracted.budget} onChange={(e) => setExtracted({ ...extracted, budget: e.target.value })} />
                <label>{p(lang, 'fDescL')}</label>
                <textarea rows={2} value={extracted.desc} onChange={(e) => setExtracted({ ...extracted, desc: e.target.value })} />
                <p style={{ margin: '12px 0 0' }}><span className="chip">🎯 94%</span></p>
                <div className="sticky-action"><button className="btn btn-primary" onClick={postJob}>🚀 {p(lang, 'postBtn')}</button></div>
              </div>
            )}
          </>
        )}

        {tab === 'followup' && (
          <>
            <button className="backlink" onClick={() => setTab('post')}>← {t(lang, 'back')}</button>
            <div className="ob-icon">🤖</div>
            <h1 className="ob-q">{p(lang, 'fuQ')}</h1>
            <p className="hold-hint">{p(lang, 'fuSub')}</p>
            <div className="pill-row" style={{ justifyContent: 'center', marginTop: 16 }}>
              {db.areas.filter((a) => a.active).map((a) => (
                <button key={a.name} className="pill" onClick={() => fuPick(a.name)}>{a.name}</button>
              ))}
            </div>
            <button
              className="bigmic"
              aria-label="Bol kar ilaka batayein"
              onClick={() => { const first = db.areas.find((a) => a.active); fuPick(first ? first.name : 'Depalpur'); }}
            >🎙️</button>
            <p className="hold-hint">{t(lang, 'holdHint')}</p>
            <div className={`ob-answer ${fuAnswer ? '' : 'empty'}`}>{fuAnswer || '—'}</div>
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

        {tab === 'jobs' && (
          <>
            <h1 style={{ marginTop: 0 }}>📋 {t(lang, 'myPosted')}</h1>
            {hirePrompt}
            {myJobs.length === 0 && (
              <div className="card empty"><div className="ei">📋</div><p className="muted">Abhi koi job post nahi hui</p><button className="btn btn-primary" onClick={goPost}>🎙️ Pehli Job Post Karein</button></div>
            )}
            {myJobs.map((j) => {
              const n = db.bids.filter((b) => b.jobId === j.id && b.status !== 'removed').length;
              return (
                <article key={j.id} className="job">
                  <h3>{catOf(j.categoryId).icon} {jobTitle(j)}</h3>
                  <div className="meta"><span>📍 {j.area}</span><span>🕐 {whenLabel(j)}</span><span>💰 {budgetLabel(j)}</span></div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`tag ${j.status === 'open' ? 'green' : ''}`}>● {j.status === 'open' ? 'Live' : j.status}</span>
                    {n ? <span className="tag teal">💬 {n} bids</span> : <span className="tag gold">{t(lang, 'bidsWait')}</span>}
                    <button className="btn btn-amber" style={{ width: 'auto', marginInlineStart: 'auto', minHeight: 48, padding: '10px 16px' }} onClick={() => { setBidsJobId(j.id); setTab('bids'); window.scrollTo({ top: 0 }); }}>{t(lang, 'seeBids')} →</button>
                  </div>
                </article>
              );
            })}
          </>
        )}

        {tab === 'bids' && bidsJob && (
          <>
            <button className="backlink" onClick={() => setTab('jobs')}>← {t(lang, 'back')}</button>
            <h1>{catOf(bidsJob.categoryId).icon} Bids — {jobTitle(bidsJob)}</h1>
            <p className="muted" style={{ margin: '0 0 16px' }}>{jobBids.length} bids • Number jagah: {bidsUsed} / 3 use hui</p>
            {jobBids.length === 0 && (
              <div className="card empty"><div className="ei">💬</div><p className="muted">Abhi koi bid nahi aayi</p><button className="btn btn-primary" onClick={() => setTab('jobs')}>← Jobs</button></div>
            )}
            {jobBids.map((b) => {
              const pu = db.users.find((x) => x.id === b.providerId);
              const prof = db.providers[b.providerId] || {};
              const rev = revealedFor(b.providerId);
              const held = b.status === 'held';
              const closed = bidsUsed >= 3 && !rev;
              const on = playingId === b.id;
              if (!pu) return null;
              return (
                <article key={b.id} className="job">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button className="provider-link" onClick={() => { setProviderId(pu.id); setTab('provider'); }} aria-label="Profile dekhein">
                      <ProviderAvatar photo={prof.photo} name={pu.name} bg={avColor(avIndex(pu.id))} />
                    </button>
                    <div style={{ flex: 1 }}>
                      <button className="provider-link" onClick={() => { setProviderId(pu.id); setTab('provider'); }}><b style={{ fontSize: 17 }}>{pu.name} →</b></button>
                      <div className="small" style={{ color: 'var(--marigold-d)', fontWeight: 800 }}>{stars(prof.ratingAvg)} {prof.ratingAvg || 'New'} ({prof.ratingCount || 0})</div>
                      <div className="small muted">📍 {(prof.areas || [])[0] || ''} • {DISTS[avIndex(pu.id) % DISTS.length]} • {prof.ratingCount || 0} jobs</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '14px 0 4px' }}>
                    <div>
                      <div className="price-big">{priceText(b)}</div>
                      <span className="tag gold">{priceTypeLabel(b)}</span>
                      {held && <> <span className="tag held-tag">🛡️ Held for check</span></>}
                    </div>
                    <ListenBtn id={b.id} playingId={playingId} onPlay={playVoice} />
                  </div>
                  <p style={{ margin: '10px 0', fontSize: 16 }}>“{b.message}”</p>
                  {on && <div className="wave playing" style={{ height: 30, justifyContent: 'flex-start' }}><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>}
                  {held ? (
                    <div className="closed-note">🛡️ Held for check — admin review pending</div>
                  ) : rev ? (
                    <div style={{ background: 'var(--leaf-bg)', borderRadius: 12, padding: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <b>📞 <span dir="ltr">{pu.phone}</span></b><span className="status-chip ok">{t(lang, 'alreadyShown')}</span>
                      </div>
                      <div className="contact-actions">
                        <a className="btn btn-call" style={{ textDecoration: 'none' }} href={`tel:${pu.phone.replace(/-/g, '')}`}>📞 Call</a>
                        <button className="btn btn-wa" onClick={() => setToast('WhatsApp khul raha hai (demo)')}>💬 WhatsApp</button>
                      </div>
                    </div>
                  ) : closed ? (
                    <div className="closed-note">{t(lang, 'closed3')}</div>
                  ) : (
                    requestArea(b.providerId, bidsJob.id, false)
                  )}
                </article>
              );
            })}
          </>
        )}

        {tab === 'wallet' && (
          <>
            <button className="backlink" onClick={() => setTab('home')}>← {t(lang, 'back')}</button>
            <h1>{t(lang, 'walletTitle')}</h1>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36 }}>🪙</div>
              <b>Seeker ke liye Servio FREE hai</b>
              <p className="small muted" style={{ margin: '6px 0 0' }}>Number ke coins karigar request accept karne par deta hai — aap se kuch nahi katega.</p>
            </div>
            <h2 style={{ margin: '20px 0 8px' }}>Mere numbers</h2>
            {myReveals.length === 0 && <div className="card empty"><div className="ei">📞</div><p className="muted">Abhi koi number nahi dikhaya gaya</p></div>}
            {myReveals.map((r) => {
              const pu = db.users.find((x) => x.id === r.providerId);
              if (!pu) return null;
              return (
                <article key={r.id} className="job">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <ProviderAvatar photo={(db.providers[pu.id] || {}).photo} name={pu.name} bg={avColor(avIndex(pu.id))} />
                    <div style={{ flex: 1 }}><b style={{ fontSize: 17 }}>{pu.name}</b><div className="small muted">{new Date(r.at).toLocaleDateString()}</div></div>
                    {r.refunded && <span className="chip chip-red">Refunded</span>}
                  </div>
                  <div style={{ background: 'var(--leaf-bg)', borderRadius: 12, padding: 13, marginTop: 12 }}>
                    <b>📞 <span dir="ltr">{pu.phone}</span></b>
                    <div className="contact-actions">
                      <a className="btn btn-call" style={{ textDecoration: 'none' }} href={`tel:${pu.phone.replace(/-/g, '')}`}>📞 Call</a>
                      <button className="btn btn-wa" onClick={() => setToast('WhatsApp khul raha hai (demo)')}>💬 WhatsApp</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </>
        )}

        {tab === 'karigar' && (
          <>
            <button className="backlink" onClick={() => setTab('home')}>← {t(lang, 'back')}</button>
            <h1>{t(lang, 'karigarTitle')}</h1>
            {providerUsers.map((u, i) => {
              const pr = db.providers[u.id];
              return (
                <article key={u.id} className="job">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <ProviderAvatar photo={pr.photo} name={u.name} bg={avColor(i)} />
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: 17 }}>{u.name}</b>
                      <div className="small" style={{ color: 'var(--marigold-d)', fontWeight: 800 }}>{stars(pr.ratingAvg)} {pr.ratingAvg || 'New'} ({pr.ratingCount || 0})</div>
                      <div className="small muted">🧰 {(pr.categories || []).map((c) => catName(db, c, lang)).join(' • ')} • 📍 {(pr.areas || [])[0] || ''} • {DISTS[i % DISTS.length]}</div>
                      <div className="small" style={{ fontWeight: 700 }}>PKR {(pr.price || 0).toLocaleString()} se shuru</div>
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => { setProviderId(u.id); setTab('provider'); window.scrollTo({ top: 0 }); }}>Profile Dekhein →</button>
                </article>
              );
            })}
          </>
        )}

        {tab === 'provider' && detailProvider && (
          <>
            <button className="backlink" onClick={() => setTab('karigar')}>← {t(lang, 'back')}</button>
            <h1>{t(lang, 'profileTitle')}</h1>
            {(() => {
              const pr = db.providers[detailProvider.id] || {};
              const rev = revealedFor(detailProvider.id);
              return (
                <div className="card">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <ProviderAvatar photo={pr.photo} name={detailProvider.name} size={64} bg={avColor(avIndex(detailProvider.id))} />
                    <div>
                      <b style={{ fontSize: 20 }}>{detailProvider.name}</b>
                      <div style={{ color: 'var(--marigold-d)', fontWeight: 800 }}>{stars(pr.ratingAvg)} {pr.ratingAvg || 'New'} ({pr.ratingCount || 0} ratings)</div>
                      <div className="small muted">🧰 {(pr.categories || []).map((c) => catName(db, c, lang)).join(' • ')} • 📍 {(pr.areas || [])[0] || ''} • {DISTS[avIndex(detailProvider.id) % DISTS.length]}</div>
                    </div>
                  </div>
                  <div className="brass-rule"></div>
                  <div className="field-row"><span className="fi">💰</span><div className="fv"><small>Rate</small><b>PKR {(pr.price || 0).toLocaleString()} se</b></div></div>
                  <div className="field-row"><span className="fi">🪙</span><div className="fv"><small>Wallet (demo)</small><b>{db.wallets[detailProvider.id] ? db.wallets[detailProvider.id].balance : 0} coins</b></div></div>
                  <h2 style={{ margin: '14px 0 4px' }}>{t(lang, 'photos')}</h2>
                  <div className="photo-grid">
                    {PHOTO_ICONS.slice(0, 6).map((ic, i) => (<div className="photo-tile" key={i}>{ic}</div>))}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    {rev ? (
                      <div style={{ background: 'var(--leaf-bg)', borderRadius: 12, padding: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                          <b>📞 <span dir="ltr">{detailProvider.phone}</span></b><span className="status-chip ok">{t(lang, 'alreadyShown')}</span>
                        </div>
                        <div className="contact-actions">
                          <a className="btn btn-call" style={{ textDecoration: 'none' }} href={`tel:${detailProvider.phone.replace(/-/g, '')}`}>📞 Call</a>
                          <button className="btn btn-wa" onClick={() => setToast('WhatsApp khul raha hai (demo)')}>💬 WhatsApp</button>
                        </div>
                      </div>
                    ) : (
                      requestArea(detailProvider.id, null, false)
                    )}
                  </div>
                </div>
              );
            })()}
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

        {tab === 'settings' && (
          <>
            <button className="backlink" onClick={() => setTab('home')}>← {t(lang, 'back')}</button>
            <h1>{t(lang, 'settings')}</h1>
            <div className="card">
              <div className="field-row"><span className="fi">👤</span><div className="fv"><small>Name</small><b>{session.name}</b></div></div>
              <div className="field-row"><span className="fi">📱</span><div className="fv"><small>Phone</small><b dir="ltr">{session.phone}</b></div></div>
              <div className="field-row"><span className="fi">🌐</span><div className="fv"><small>Language</small><b>Top bar se badlein ↑</b></div></div>
            </div>
            <div className="sticky-action"><button className="btn btn-primary" onClick={() => { clearSession(); router.replace('/login'); }}>↩ {t(lang, 'logout')}</button></div>
          </>
        )}
      </main>

      <ScreeningModal found={screen?.found} cleaned={screen?.cleaned} onContinue={() => createJob(screen.cleaned)} onClose={() => setScreen(null)} />

      <BottomNav items={navItems} active={navActive} onGo={navGo} />
    </div>
  );
}
