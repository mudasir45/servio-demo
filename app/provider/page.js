'use client';
import { useMemo, useState } from 'react';
import AppHeader, { useGuard, useLang } from '../../components/AppHeader';
import { useServio, transact, uid, notify, notifyAdmins, logActivity, userName, catName } from '../../lib/store';
import { COIN_PKR } from '../../lib/seed';
import { t } from '../../lib/i18n';

export default function ProviderPage() {
  const session = useGuard('provider');
  const db = useServio();
  const lang = useLang();
  const [tab, setTab] = useState('jobs');
  const [bidForms, setBidForms] = useState({});
  const [msg, setMsg] = useState('');
  const [topup, setTopup] = useState({ coins: 50, method: 'JazzCash', ref: '' });
  const [reportFor, setReportFor] = useState(null);
  const [reason, setReason] = useState('wrong-number');

  const me = session ? session.userId : null;
  const profile = db && me ? db.providers[me] : null;
  const wallet = db && me ? db.wallets[me] : null;

  const feed = useMemo(() => {
    if (!db || !profile) return [];
    return db.jobs.filter((j) => j.status === 'open' && (profile.categories || []).includes(j.categoryId));
  }, [db, profile]);
  const myBids = useMemo(() => (db && me ? db.bids.filter((b) => b.providerId === me) : []), [db, me]);
  const myLeads = useMemo(() => (db && me ? db.reveals.filter((r) => r.providerId === me) : []), [db, me]);
  const unread = db && me ? db.notifications.filter((n) => n.userId === me && !n.read).length : 0;

  if (!session || !db || !profile || !wallet) return <main className="page"><p className="muted">Loading…</p></main>;

  const setBid = (jobId, patch) => setBidForms((f) => ({ ...f, [jobId]: { priceType: 'fixed', price: '', priceTo: '', visitCharge: '', message: '', ...(f[jobId] || {}), ...patch } }));

  const sendBid = (job) => {
    const f = bidForms[job.id] || { priceType: 'fixed', price: '', priceTo: '', visitCharge: '', message: '' };
    if (f.priceType !== 'visit' && !f.price) { setMsg('Please add a price.'); return; }
    if (f.priceType === 'visit' && !f.visitCharge) { setMsg('Please add the visit charge.'); return; }
    const existing = myBids.find((b) => b.jobId === job.id && b.status !== 'removed');
    transact((d) => {
      if (existing) {
        const b = d.bids.find((x) => x.id === existing.id);
        Object.assign(b, { priceType: f.priceType, price: Number(f.price) || null, priceTo: Number(f.priceTo) || null, visitCharge: Number(f.visitCharge) || null, message: f.message, at: Date.now() });
      } else {
        d.bids.unshift({ id: 'bid-' + uid(), jobId: job.id, providerId: me, priceType: f.priceType, price: Number(f.price) || null, priceTo: Number(f.priceTo) || null, visitCharge: Number(f.visitCharge) || null, message: f.message, status: 'active', at: Date.now() });
      }
      notify(d, job.seekerId, `New bid on your job from ${userName(d, me)} — ${f.priceType === 'visit' ? 'visit PKR ' + f.visitCharge : 'PKR ' + f.price}.`);
      logActivity(d, `Bid — ${userName(d, me)} bid on ${catName(d, job.categoryId)} job in ${job.area}`);
    }, { toast: `New bid from ${session.name}`, toastFor: [job.seekerId] });
    setMsg(existing ? 'Bid updated — bidding is free.' : 'Bid sent — bidding is free.');
  };

  const reportLead = (revealRec) => {
    transact((d) => {
      const r = d.reveals.find((x) => x.id === revealRec.id);
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
    setReportFor(null); setMsg('Reported. 5 coins refunded to your wallet.');
  };

  const requestTopup = () => {
    if (!topup.ref.trim()) { setMsg('Please write the JazzCash/Easypaisa transaction reference.'); return; }
    const req = { id: 'top-' + uid(), providerId: me, coins: topup.coins, pkr: topup.coins * COIN_PKR, method: topup.method, ref: topup.ref.trim(), status: 'pending', at: Date.now() };
    transact((d) => {
      d.topups.unshift(req);
      notifyAdmins(d, `Top-up request: ${userName(d, me)} — ${req.coins} coins via ${req.method} (${req.ref}).`);
      logActivity(d, `Top-up requested — ${userName(d, me)}, ${req.coins} coins, ${req.method}`);
    }, { toast: `Top-up request from ${session.name}`, toastFor: db.users.filter((u) => u.role === 'admin').map((u) => u.id) });
    setTopup({ coins: 50, method: 'JazzCash', ref: '' }); setMsg('Top-up request sent. Admin will approve it.');
  };

  const toggleAvailability = () => transact((d) => { d.providers[me].availability = !d.providers[me].availability; });

  const markAllRead = () => transact((d) => { d.notifications.forEach((n) => { if (n.userId === me) n.read = true; }); });

  return (
    <div dir={lang === 'ur' ? 'rtl' : 'ltr'}>
      <AppHeader role="provider" />
      <main className="page">
        <h1 style={{ marginBottom: 0 }}>{session.name}</h1>
        <p className="muted" style={{ marginTop: 2 }}>{(profile.categories || []).map((c) => catName(db, c, lang)).join(', ')} · ⭐ {profile.ratingAvg || 'New'} ({profile.ratingCount || 0}) · <b style={{ color: 'var(--brass-dark)' }}>🪙 {wallet.balance} {t(lang, 'coins')} = PKR {wallet.balance * COIN_PKR}</b></p>
        {msg && <div className="ok">{msg}</div>}

        {tab === 'jobs' && (
          <>
            {feed.length === 0 && <div className="card empty"><div className="ei">🔍</div><p className="muted">No new jobs in your categories right now.</p></div>}
            {feed.map((j) => {
              const f = bidForms[j.id] || { priceType: 'fixed', price: '', priceTo: '', visitCharge: '', message: '' };
              const existing = myBids.find((b) => b.jobId === j.id && b.status === 'active');
              return (
                <div key={j.id} className="job">
                  <b>{catName(db, j.categoryId, lang)}</b> <span className="chip">{j.area}</span> <span className="chip">{j.urgency}</span>
                  <p style={{ margin: '8px 0' }}>{j.description}</p>
                  <p className="small muted">🎧 Seeker voice note would play here in production. Posted by {userName(db, j.seekerId)}.</p>
                  {existing && <span className="chip chip-green">Bid sent — you can edit it below</span>}
                  <label>Price type</label>
                  <div className="type-grid">
                    {[['fixed', '🎯', 'Fixed price', 'Ek hi rate'], ['range', '↔️', 'Price range', 'Kam se zyada tak'], ['visit', '👀', 'Visit first', 'Pehle dekh kar rate']].map(([v, ic, l, s]) => (
                      <button key={v} className={`type-opt ${f.priceType === v ? 'sel' : ''}`} onClick={() => setBid(j.id, { priceType: v })}><span className="ti">{ic}</span><span><b>{l}</b><small>{s}</small></span></button>
                    ))}
                  </div>
                  {f.priceType !== 'visit' && (<><label>{f.priceType === 'range' ? 'Price from (PKR)' : 'Price (PKR)'}</label><input className="amount-input" inputMode="numeric" value={f.price} onChange={(e) => setBid(j.id, { price: e.target.value })} placeholder="1500" /></>)}
                  {f.priceType === 'range' && (<><label>Price to (PKR)</label><input className="amount-input" inputMode="numeric" value={f.priceTo} onChange={(e) => setBid(j.id, { priceTo: e.target.value })} placeholder="2000" /></>)}
                  {f.priceType === 'visit' && (<><label>Visit charge (PKR)</label><input className="amount-input" inputMode="numeric" value={f.visitCharge} onChange={(e) => setBid(j.id, { visitCharge: e.target.value })} placeholder="500" /></>)}
                  <div className="pill-row" style={{ marginTop: 10, justifyContent: 'center' }}>{[500, 1000, 1500, 2000].map((v) => (<button key={v} className="pill" onClick={() => setBid(j.id, f.priceType === 'visit' ? { visitCharge: String(v) } : { price: String(v) })}>{v}</button>))}</div>
                  <label>Message (or 🎤 voice in production)</label>
                  <input value={f.message} onChange={(e) => setBid(j.id, { message: e.target.value })} placeholder="e.g. Main aaj aa sakta hoon" />
                  <div style={{ height: 12 }} />
                  <button className="btn btn-amber" onClick={() => sendBid(j)}>📩 {existing ? 'Update Bid' : t(lang, 'sendBid')} — FREE</button>
                </div>
              );
            })}
          </>
        )}

        {tab === 'leads' && (
          <>
            <h3>My bids</h3>
            {myBids.length === 0 && <p className="muted">No bids yet.</p>}
            {myBids.map((b) => { const j = db.jobs.find((x) => x.id === b.jobId); return (
              <div key={b.id} className="card"><b>{j ? catName(db, j.categoryId, lang) : 'Job'}</b> <span className="chip">{b.status}</span>
                <div className="price">{b.priceType === 'visit' ? `Visit: PKR ${b.visitCharge}` : b.priceType === 'range' ? `PKR ${b.price} – ${b.priceTo}` : `PKR ${b.price}`}</div>
                <p className="small muted">{j ? j.description : ''}</p></div> ); })}
            <h3>My leads (numbers shown)</h3>
            {myLeads.length === 0 && <p className="muted">No leads yet. When a seeker shows your number, it appears here.</p>}
            {myLeads.map((r) => (
              <div key={r.id} className="card">
                <b>{userName(db, r.seekerId)}</b> <span className="chip">{new Date(r.at).toLocaleDateString()}</span>
                {r.refunded ? <span className="chip chip-green">Refunded</span> : <span className="chip chip-brass">−5 coins</span>}
                <p className="small muted" dir="ltr" style={{ textAlign: 'left' }}>{(db.users.find((u) => u.id === r.seekerId) || {}).phone}</p>
                {!r.refunded && reportFor !== r.id && <button className="btn btn-ghost btn-sm" onClick={() => setReportFor(r.id)}>Report bad lead</button>}
                {reportFor === r.id && (
                  <div style={{ marginTop: 8 }}>
                    {[['wrong-number', 'Wrong number'], ['no-answer', 'No answer'], ['spam', 'Spam / fake']].map(([v, l]) => (
                      <label key={v} className="radio-row"><input type="radio" checked={reason === v} onChange={() => setReason(v)} /> {l}</label>
                    ))}
                    <button className="btn btn-danger btn-sm" onClick={() => reportLead(r)}>Report &amp; get 5 coins back</button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {tab === 'wallet' && (
          <>
            <div className="balance-card">
              <div className="sub">Your balance</div>
              <div className="num">🪙 {wallet.balance}</div>
              <div className="sub">= PKR {wallet.balance * COIN_PKR} · 1 number = 5 coins (PKR {5 * COIN_PKR})</div>
            </div>
            {wallet.balance < 5 && <div className="warn">Your coins are low — you will show as “not available” to seekers. Top up below.</div>}
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Top up coins</h2>
              <div className="pack-grid">{[20, 50, 100].map((c) => (<button key={c} className={`pack ${topup.coins === c ? 'sel' : ''}`} onClick={() => setTopup({ ...topup, coins: c })}><b>{c}{c === 50 ? ' ⭐' : ''}</b><span>PKR {c * COIN_PKR}</span></button>))}</div>
              <div className="pill-row" style={{ marginTop: 12 }}>{['JazzCash', 'Easypaisa'].map((m) => (<button key={m} className={`pill ${topup.method === m ? 'active' : ''}`} onClick={() => setTopup({ ...topup, method: m })}>{m}</button>))}</div>
              <label>Transaction reference (from your {topup.method} receipt)</label>
              <input value={topup.ref} onChange={(e) => setTopup({ ...topup, ref: e.target.value })} placeholder="e.g. TXN-123456" />
              <div style={{ height: 12 }} />
              <button className="btn btn-amber" onClick={requestTopup}>Send top-up request</button>
              <h4>My requests</h4>
              {db.topups.filter((x) => x.providerId === me).map((x) => (<p key={x.id} className="small">{x.coins} coins · {x.method} · {x.ref} — <span className="status-chip">{x.status}</span></p>))}
            </div>
            <div className="section-head"><h2>History</h2></div>
            <div className="card" style={{ marginTop: 0 }}>
              {wallet.txns.length === 0 && <p className="muted" style={{ margin: 0 }}>No transactions yet.</p>}
              {wallet.txns.map((x) => (<div key={x.id} className="txn"><span>{x.note}<br /><span className="small muted">{new Date(x.at).toLocaleString()}</span></span><b className={x.amount >= 0 ? 'pos' : 'neg'}>{x.amount >= 0 ? '+' : ''}{x.amount}</b></div>))}
            </div>
          </>
        )}

        {tab === 'profile' && (
          <div className="card">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
              <div className="avatar">{session.name.charAt(0)}</div>
              <h2>{session.name}</h2>
            </div>
            <div className="field-row"><span className="fi">🧰</span><div className="fv"><small>Kaam</small><b>{(profile.categories || []).map((c) => catName(db, c, lang)).join(' • ')}</b></div></div>
            <div className="field-row"><span className="fi">📍</span><div className="fv"><small>Ilaka</small><b>{(profile.areas || []).join(' • ')}</b></div></div>
            <div className="field-row"><span className="fi">⏱️</span><div className="fv"><small>Experience</small><b>{profile.experience} years</b></div></div>
            <div className="field-row"><span className="fi">💰</span><div className="fv"><small>Charges</small><b>PKR {profile.price} se</b></div></div>
            <div className="field-row"><span className="fi">⭐</span><div className="fv"><small>Rating</small><b>{profile.ratingAvg || 'New'} ({profile.ratingCount || 0} ratings)</b></div></div>
            {profile.bio && <p style={{ marginBottom: 0 }}>{profile.bio}</p>}
            <div className="field-row">
              <span className="fi">🟢</span>
              <div className="fv"><b>{t(lang, 'available')}</b><small>{profile.availability ? t(lang, 'available') : t(lang, 'busy')}</small></div>
              <label className="switch"><input type="checkbox" checked={!!profile.availability} onChange={toggleAvailability} /><span className="track"></span></label>
            </div>
          </div>
        )}

        {tab === 'alerts' && (
          <>
            {db.notifications.filter((n) => n.userId === me).length === 0 && <div className="card empty"><div className="ei">🔔</div><p className="muted">No alerts yet.</p></div>}
            {db.notifications.filter((n) => n.userId === me).map((n) => (<div key={n.id} className="card" style={{ padding: '12px 16px' }}>{n.text}<div className="small muted">{new Date(n.at).toLocaleString()}</div></div>))}
          </>
        )}
      </main>
      <nav className="bottomnav" aria-label="Main">
        <button className={tab === 'jobs' ? 'active' : ''} onClick={() => setTab('jobs')}><span>📋</span>{t(lang, 'jobs')}</button>
        <button className={tab === 'leads' ? 'active' : ''} onClick={() => setTab('leads')}><span>💬</span>{t(lang, 'myBids')}</button>
        <button className={`center ${tab === 'wallet' ? 'active' : ''}`} onClick={() => setTab('wallet')}><span>🪙</span>{t(lang, 'wallet')}</button>
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><span>🧰</span>{t(lang, 'profile')}</button>
        <button className={tab === 'alerts' ? 'active' : ''} onClick={() => { setTab('alerts'); markAllRead(); }}><span>🔔</span>{t(lang, 'alerts')}{unread > 0 && <span className="nb-badge">{unread}</span>}</button>
      </nav>
    </div>
  );
}
