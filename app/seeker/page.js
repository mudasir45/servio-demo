'use client';
import { useMemo, useState } from 'react';
import AppHeader, { useGuard, useLang } from '../../components/AppHeader';
import { useServio, transact, uid, notify, notifyAdmins, logActivity, findPhone, stripPhone, doReveal, userName, catName } from '../../lib/store';
import { COIN_PKR, TINTS } from '../../lib/seed';
import { t } from '../../lib/i18n';

export default function SeekerPage() {
  const session = useGuard('seeker');
  const db = useServio();
  const lang = useLang();
  const [tab, setTab] = useState('home');
  const [form, setForm] = useState({ categoryId: '', description: '', area: 'Depalpur', urgency: 'Today' });
  const [phoneWarn, setPhoneWarn] = useState(null);
  const [msg, setMsg] = useState('');
  const [rateFor, setRateFor] = useState(null); // reveal id pending rating
  const [rating, setRating] = useState({ hired: 'yes', stars: 5 });

  const myJobs = useMemo(() => (db && session ? db.jobs.filter((j) => j.seekerId === session.userId) : []), [db, session]);
  const myReveals = useMemo(() => (db && session ? db.reveals.filter((r) => r.seekerId === session.userId) : []), [db, session]);
  const ratedRevealIds = useMemo(() => (db ? new Set(db.reviews.map((r) => r.revealId)) : new Set()), [db]);

  if (!session || !db) return <main className="page"><p className="muted">Loading…</p></main>;
  const me = session.userId;
  const unread = db.notifications.filter((n) => n.userId === me && !n.read).length;

  const postJob = (cleaned) => {
    const desc = cleaned || form.description;
    if (!form.categoryId) { setMsg('Please tap a category first.'); return; }
    if (!desc.trim()) { setMsg('Please describe the work.'); return; }
    const job = { id: 'job-' + uid(), seekerId: me, categoryId: form.categoryId, description: desc.trim(), area: form.area, urgency: form.urgency, status: 'open', revealCount: 0, at: Date.now() };
    const targets = db.users.filter((u) => u.role === 'provider' && db.providers[u.id] && db.providers[u.id].categories.includes(form.categoryId)).map((u) => u.id);
    transact((d) => {
      d.jobs.unshift(job);
      targets.forEach((pid) => notify(d, pid, `New job: ${catName(d, job.categoryId)} in ${job.area}.`));
      notifyAdmins(d, `New job posted by ${userName(d, me)} — ${catName(d, job.categoryId)}, ${job.area}.`);
      logActivity(d, `New job — ${catName(d, job.categoryId)} in ${job.area} by ${userName(d, me)}`);
    }, { toast: 'New job posted in ' + job.area, toastFor: [...targets, ...db.users.filter((u) => u.role === 'admin').map((u) => u.id)] });
    setForm({ categoryId: '', description: '', area: 'Depalpur', urgency: 'Today' });
    setPhoneWarn(null); setMsg(''); setTab('myjobs');
  };

  const submitJob = () => {
    const found = findPhone(form.description);
    if (found) { setPhoneWarn({ found, cleaned: stripPhone(form.description) }); return; }
    postJob();
  };

  const reveal = (providerId, jobId) => {
    let result;
    transact((d) => { result = doReveal(d, { seekerId: me, providerId, jobId }); },
      { toast: result === 'ok' ? 'A number was shown' : undefined, toastFor: [providerId] });
    // transact runs synchronously, but result is set inside; re-read message:
    if (result === 'ok') {
      setMsg(`Number shown. The provider paid 5 coins (PKR ${5 * COIN_PKR}).`);
      const rev = null; // rating prompt appears from reveals list below
    } else if (result === 'already') setMsg('Already shown — no coins charged again.');
    else if (result === 'full') setMsg('This job already has 3 numbers shown (maximum).');
    else if (result === 'low') setMsg('This provider is not available right now.');
    else setMsg('This provider is not available.');
  };

  const providerPhone = (pid) => { const u = db.users.find((x) => x.id === pid); return u ? u.phone : ''; };
  const revealedFor = (pid) => db.reveals.find((r) => r.seekerId === me && r.providerId === pid && !r.refunded);

  const submitRating = (revealRec) => {
    transact((d) => {
      d.reviews.unshift({ id: uid(), revealId: revealRec.id, seekerId: me, providerId: revealRec.providerId, hired: rating.hired, stars: rating.stars, at: Date.now() });
      const p = d.providers[revealRec.providerId];
      if (p && rating.hired === 'yes') {
        p.ratingAvg = Math.round((((p.ratingAvg || 0) * (p.ratingCount || 0)) + rating.stars) / ((p.ratingCount || 0) + 1) * 10) / 10;
        p.ratingCount = (p.ratingCount || 0) + 1;
      }
      notify(d, revealRec.providerId, `New rating — ${rating.stars} stars from ${userName(d, me)}.`);
      logActivity(d, `Rating — ${userName(d, revealRec.providerId)} got ${rating.stars}★`);
    }, { toast: `New rating: ${rating.stars} stars`, toastFor: [revealRec.providerId] });
    setRateFor(null);
  };

  const markAllRead = () => transact((d) => { d.notifications.forEach((n) => { if (n.userId === me) n.read = true; }); });

  return (
    <div dir={lang === 'ur' ? 'rtl' : 'ltr'}>
      <AppHeader role="seeker" />
      <main className="page">
        <h1>Assalam-o-Alaikum, {session.name}</h1>
        {msg && <div className="ok">{msg}</div>}

        {tab === 'home' && (
          <>
            <div className="voice-hero">
              <h1>Bol kar kaam <em>karwao</em></h1>
              <p>Bas bolo — Servio samajh jayega</p>
              <button className="bigmic" aria-label="Bol kar kaam post karein" onClick={() => document.getElementById('post-form')?.scrollIntoView({ behavior: 'smooth' })}>🎙️</button>
              <div style={{ fontWeight: 800 }}>Mic dabao, bolo</div>
            </div>
            <div className="section-head"><h2>{t(lang, 'postJob')}</h2></div>
            <div className="tile-grid">
              {db.categories.map((c, i) => c.active ? (
                <button key={c.id} className={`tile ${form.categoryId === c.id ? 'sel' : ''}`} style={{ background: TINTS[i % TINTS.length] }} onClick={() => setForm({ ...form, categoryId: c.id })}>
                  <span className="ic">{c.icon}</span><b>{lang === 'ur' ? c.ur : lang === 'ro' ? c.ro : c.en}</b>
                </button>
              ) : null)}
            </div>
            <div className="card" id="post-form">
            <label style={{ marginTop: 0 }}>What is the work?</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Bathroom ka nal kharab hai, pani tapak raha hai…" />
            <label>Area</label>
            <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
              {db.areas.filter((a) => a.active).map((a) => (<option key={a.name} value={a.name}>{a.name}</option>))}
            </select>
            <label>When?</label>
            <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
              <option>Now</option><option>Today</option><option>This week</option>
            </select>
            {phoneWarn && (
              <div className="warn">
                ⚠️ Your text has a phone number (<b>{phoneWarn.found}</b>). Numbers are only shared after Show Number, so we will remove it.
                <div style={{ height: 8 }} />
                <button className="btn btn-amber" onClick={() => postJob(phoneWarn.cleaned)}>Remove number &amp; post</button>
                <div style={{ height: 8 }} />
                <button className="btn btn-ghost" onClick={() => setPhoneWarn(null)}>Edit text</button>
              </div>
            )}
            <div className="sticky-action"><button className="btn btn-primary" onClick={submitJob}>🚀 {t(lang, 'postJob')} — FREE</button></div>
            </div>

            <div className="section-head"><h2>{t(lang, 'providers')}</h2></div>
            {db.users.filter((u) => u.role === 'provider' && db.providers[u.id]).slice(0, 3).map((u) => (
              <ProviderCard key={u.id} db={db} u={u} lang={lang} revealed={revealedFor(u.id)} phone={providerPhone(u.id)} onReveal={() => reveal(u.id, null)} />
            ))}
          </>
        )}

        {tab === 'myjobs' && (
          <>
            {myJobs.length === 0 && <div className="card empty"><div className="ei">📋</div><p className="muted">No jobs yet.</p><button className="btn" onClick={() => setTab('home')}>{t(lang, 'postJob')}</button></div>}
            {myJobs.map((j) => (
              <div key={j.id} className="card">
                <b>{catName(db, j.categoryId, lang)}</b> <span className="chip">{j.area}</span> <span className="chip">{j.urgency}</span>
                <span className={`chip ${j.status === 'open' ? 'chip-green' : 'chip-red'}`}>{j.status}</span>
                <p style={{ margin: '8px 0' }}>{j.description}</p>
                <p className="small muted">Numbers shown: <span className="dots-reveal">{'●'.repeat(j.revealCount)}<span style={{ color: 'var(--line)' }}>{'●'.repeat(Math.max(0, 3 - j.revealCount))}</span></span> (max 3)</p>
                <h4 style={{ marginBottom: 4 }}>Bids</h4>
                {db.bids.filter((b) => b.jobId === j.id && b.status === 'active').length === 0 && <p className="muted small">No bids yet — providers will be notified.</p>}
                {db.bids.filter((b) => b.jobId === j.id && b.status === 'active').map((b) => {
                  const pu = db.users.find((x) => x.id === b.providerId);
                  const prof = db.providers[b.providerId] || {};
                  const rev = revealedFor(b.providerId);
                  return (
                    <div key={b.id} className="job">
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div className="avatar">{(pu ? pu.name : 'P').charAt(0)}</div>
                        <div style={{ flex: 1 }}><b>{pu ? pu.name : 'Provider'}</b><br /><span className="chip">⭐ {prof.ratingAvg || 'New'} ({prof.ratingCount || 0})</span></div>
                      </div>
                      <div className="price">{b.priceType === 'visit' ? `Visit: PKR ${b.visitCharge}` : b.priceType === 'range' ? `PKR ${b.price} – ${b.priceTo}` : `PKR ${b.price}`}</div>
                      <p className="small" style={{ margin: '4px 0' }}>{b.message}</p>
                      {rev ? (
                        <div className="ok" style={{ margin: 0 }}>📞 <b dir="ltr">{pu.phone}</b><br />
                          <span className="small">Call / WhatsApp buttons would open your phone app.</span>
                          {!ratedRevealIds.has(rev.id) && rateFor !== rev.id && (<><br /><button className="btn btn-amber btn-sm" style={{ marginTop: 8 }} onClick={() => setRateFor(rev.id)}>Rate this provider</button></>)}
                          {rateFor === rev.id && (
                            <div style={{ marginTop: 10 }}>
                              <p style={{ margin: '4px 0' }}><b>Did you hire {pu.name}?</b></p>
                              <label className="radio-row"><input type="radio" checked={rating.hired === 'yes'} onChange={() => setRating({ ...rating, hired: 'yes' })} /> Yes</label>
                              <label className="radio-row"><input type="radio" checked={rating.hired === 'no'} onChange={() => setRating({ ...rating, hired: 'no' })} /> No</label>
                              <div className="stars">{[1, 2, 3, 4, 5].map((s) => (<button key={s} className={s <= rating.stars ? 'on' : ''} onClick={() => setRating({ ...rating, stars: s })}>{s <= rating.stars ? '★' : '☆'}</button>))}</div>
                              <button className="btn btn-sm" onClick={() => submitRating(rev)}>Send rating</button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button className="btn btn-amber" onClick={() => reveal(b.providerId, j.id)}>{t(lang, 'showNumber')} — 5 coins from provider</button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {myReveals.length > 0 && <p className="small muted">Tip: rating opens on the job card after a number is shown.</p>}
          </>
        )}

        {tab === 'providers' && db.users.filter((u) => u.role === 'provider' && db.providers[u.id]).map((u) => (
          <ProviderCard key={u.id} db={db} u={u} lang={lang} revealed={revealedFor(u.id)} phone={providerPhone(u.id)} onReveal={() => reveal(u.id, null)} />
        ))}

        {tab === 'alerts' && (
          <>
            {db.notifications.filter((n) => n.userId === me).length === 0 && <div className="card empty"><div className="ei">🔔</div><p className="muted">No alerts yet.</p></div>}
            {db.notifications.filter((n) => n.userId === me).map((n) => (
              <div key={n.id} className="card" style={{ padding: '12px 16px' }}>{n.text}<div className="small muted">{new Date(n.at).toLocaleString()}</div></div>
            ))}
          </>
        )}
      </main>
      <nav className="bottomnav" aria-label="Main">
        <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><span>🏠</span>{t(lang, 'home')}</button>
        <button className={tab === 'myjobs' ? 'active' : ''} onClick={() => setTab('myjobs')}><span>📋</span>{t(lang, 'myJobs')}</button>
        <button className={`center ${tab === 'home' ? 'active' : ''}`} onClick={() => { setTab('home'); setTimeout(() => document.getElementById('post-form')?.scrollIntoView({ behavior: 'smooth' }), 50); }}><span>🎙️</span>Bolo</button>
        <button className={tab === 'providers' ? 'active' : ''} onClick={() => setTab('providers')}><span>🧰</span>{t(lang, 'providers')}</button>
        <button className={tab === 'alerts' ? 'active' : ''} onClick={() => { setTab('alerts'); markAllRead(); }}><span>🔔</span>{t(lang, 'alerts')}{unread > 0 && <span className="nb-badge">{unread}</span>}</button>
      </nav>
    </div>
  );
}

function ProviderCard({ db, u, lang, revealed, phone, onReveal }) {
  const p = db.providers[u.id] || {};
  return (
    <div className="job">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div className="avatar">{u.name.charAt(0)}</div>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 19 }}>{u.name}</b><br />
          <span className="chip">⭐ {p.ratingAvg || 'New'} ({p.ratingCount || 0})</span>{' '}
          <span className={`chip ${p.availability ? 'chip-green' : 'chip-red'}`}>{p.availability ? t(lang, 'available') : t(lang, 'busy')}</span>
        </div>
      </div>
      <p className="small" style={{ margin: '10px 0' }}>
        {(p.categories || []).map((c) => catName(db, c, lang)).join(', ')} · {(p.areas || []).join(', ')}<br />
        {p.experience} years · from PKR {p.price}{p.bio ? <><br />{p.bio}</> : null}
      </p>
      {revealed ? (<div className="ok" style={{ margin: 0 }}>📞 <b dir="ltr">{phone}</b> — already shown, free.</div>)
        : (<button className="btn btn-amber" onClick={onReveal}>Contact — {t(lang, 'showNumber')}</button>)}
    </div>
  );
}
