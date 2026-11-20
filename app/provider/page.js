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
        <h2 style={{ marginBottom: 0 }}>{session.name}</h2>
        <p className="muted" style={{ marginTop: 2 }}>{(profile.categories || []).map((c) => catName(db, c, lang)).join(', ')} · ⭐ {profile.ratingAvg || 'New'} ({profile.ratingCount || 0}) · <b style={{ color: 'var(--brass-dark)' }}>🪙 {wallet.balance} {t(lang, 'coins')} = PKR {wallet.balance * COIN_PKR}</b></p>
        <div className="tabs">
          <button className={`tab ${tab === 'jobs' ? 'sel' : ''}`} onClick={() => setTab('jobs')}>{t(lang, 'jobs')} ({feed.length})</button>
          <button className={`tab ${tab === 'leads' ? 'sel' : ''}`} onClick={() => setTab('leads')}>{t(lang, 'myBids')} ({myLeads.length})</button>
          <button className={`tab ${tab === 'wallet' ? 'sel' : ''}`} onClick={() => setTab('wallet')}>{t(lang, 'wallet')}</button>
          <button className={`tab ${tab === 'profile' ? 'sel' : ''}`} onClick={() => setTab('profile')}>{t(lang, 'profile')}</button>
          <button className={`tab ${tab === 'alerts' ? 'sel' : ''}`} onClick={() => { setTab('alerts'); markAllRead(); }}>{t(lang, 'alerts')}{unread ? ` (${unread})` : ''}</button>
        </div>
        {msg && <div className="ok">{msg}</div>}

        {tab === 'jobs' && (
          <>
            {feed.length === 0 && <div className="card center"><div style={{ fontSize: 34 }}>🔍</div><p className="muted">No new jobs in your categories right now.</p></div>}
            {feed.map((j) => {
              const f = bidForms[j.id] || { priceType: 'fixed', price: '', priceTo: '', visitCharge: '', message: '' };
              const existing = myBids.find((b) => b.jobId === j.id && b.status === 'active');
              return (
                <div key={j.id} className="card">
                  <b>{catName(db, j.categoryId, lang)}</b> <span className="chip">{j.area}</span> <span className="chip">{j.urgency}</span>
                  <p style={{ margin: '8px 0' }}>{j.description}</p>
                  <p className="small muted">🎧 Seeker voice note would play here in production. Posted by {userName(db, j.seekerId)}.</p>
                  {existing && <span className="chip chip-green">Bid sent — you can edit it below</span>}
                  <label>Price type</label>
                  <div className="tabs" style={{ paddingTop: 0 }}>
                    {[['fixed', 'Fixed price'], ['range', 'Price range'], ['visit', 'Visit first']].map(([v, l]) => (
                      <button key={v} className={`tab ${f.priceType === v ? 'sel' : ''}`} onClick={() => setBid(j.id, { priceType: v })}>{l}</button>
                    ))}
                  </div>
                  {f.priceType !== 'visit' && (<><label>{f.priceType === 'range' ? 'Price from (PKR)' : 'Price (PKR)'}</label><input inputMode="numeric" value={f.price} onChange={(e) => setBid(j.id, { price: e.target.value })} placeholder="1500" /></>)}
                  {f.priceType === 'range' && (<><label>Price to (PKR)</label><input inputMode="numeric" value={f.priceTo} onChange={(e) => setBid(j.id, { priceTo: e.target.value })} placeholder="2000" /></>)}
                  {f.priceType === 'visit' && (<><label>Visit charge (PKR)</label><input inputMode="numeric" value={f.visitCharge} onChange={(e) => setBid(j.id, { visitCharge: e.target.value })} placeholder="500" /></>)}
                  <div className="tabs" style={{ padding: '6px 0 0' }}>{[500, 1000, 1500, 2000].map((v) => (<button key={v} className="tab" onClick={() => setBid(j.id, f.priceType === 'visit' ? { visitCharge: String(v) } : { price: String(v) })}>{v}</button>))}</div>
                  <label>Message (or 🎤 voice in production)</label>
                  <input value={f.message} onChange={(e) => setBid(j.id, { message: e.target.value })} placeholder="e.g. Main aaj aa sakta hoon" />
                  <div style={{ height: 12 }} />
                  <button className="btn" onClick={() => sendBid(j)}>{existing ? 'Update Bid' : t(lang, 'sendBid')} · Free</button>
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
            <div className="card center">
              <div className="muted">Your balance</div>
              <div style={{ fontSize: 40, fontWeight: 800, fontFamily: 'Georgia,serif', color: 'var(--ink)' }}>🪙 {wallet.balance}</div>
              <div className="muted">= PKR {wallet.balance * COIN_PKR} · One number shown costs 5 coins (PKR {5 * COIN_PKR})</div>
            </div>
            {wallet.balance < 5 && <div className="warn">Your coins are low — you will show as “not available” to seekers. Top up below.</div>}
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Top up coins</h3>
              <div className="tabs" style={{ paddingTop: 0 }}>{[20, 50, 100].map((c) => (<button key={c} className={`tab ${topup.coins === c ? 'sel' : ''}`} onClick={() => setTopup({ ...topup, coins: c })}>{c} coins · PKR {c * COIN_PKR}</button>))}</div>
              <div className="tabs" style={{ paddingTop: 0 }}>{['JazzCash', 'Easypaisa'].map((m) => (<button key={m} className={`tab ${topup.method === m ? 'sel' : ''}`} onClick={() => setTopup({ ...topup, method: m })}>{m}</button>))}</div>
              <label>Transaction reference (from your {topup.method} receipt)</label>
              <input value={topup.ref} onChange={(e) => setTopup({ ...topup, ref: e.target.value })} placeholder="e.g. TXN-123456" />
              <div style={{ height: 12 }} />
              <button className="btn btn-brass" onClick={requestTopup}>Send top-up request</button>
              <h4>My requests</h4>
              {db.topups.filter((x) => x.providerId === me).map((x) => (<p key={x.id} className="small">{x.coins} coins · {x.method} · {x.ref} — <b>{x.status}</b></p>))}
            </div>
            <h3>History</h3>
            {wallet.txns.length === 0 && <p className="muted">No transactions yet.</p>}
            {wallet.txns.map((x) => (<div key={x.id} className="card" style={{ padding: '10px 16px' }}><b style={{ color: x.amount >= 0 ? 'var(--olive)' : 'var(--oxblood)' }}>{x.amount >= 0 ? '+' : ''}{x.amount} coins</b> — {x.note}<div className="small muted">{new Date(x.at).toLocaleString()}</div></div>))}
          </>
        )}

        {tab === 'profile' && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{session.name}</h3>
            <p>{(profile.categories || []).map((c) => catName(db, c, lang)).join(', ')}</p>
            <p className="muted">{(profile.areas || []).join(', ')} · {profile.experience} years experience · usual charge PKR {profile.price}</p>
            {profile.bio && <p>{profile.bio}</p>}
            <label className="check-row"><input type="checkbox" checked={!!profile.availability} onChange={toggleAvailability} /> {profile.availability ? t(lang, 'available') : t(lang, 'busy')}</label>
            <p className="small muted">⭐ {profile.ratingAvg || 'New'} from {profile.ratingCount || 0} ratings</p>
          </div>
        )}

        {tab === 'alerts' && (
          <>
            {db.notifications.filter((n) => n.userId === me).length === 0 && <div className="card center"><div style={{ fontSize: 34 }}>🔔</div><p className="muted">No alerts yet.</p></div>}
            {db.notifications.filter((n) => n.userId === me).map((n) => (<div key={n.id} className="card" style={{ padding: '12px 16px' }}>{n.text}<div className="small muted">{new Date(n.at).toLocaleString()}</div></div>))}
          </>
        )}
      </main>
    </div>
  );
}
