'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader, { useGuard } from '../../components/AppHeader';
import { useServio, transact, uid, notify, logActivity, clearSession, userName, catName, stripPhone, resetDemoData } from '../../lib/store';
import { COIN_PKR } from '../../lib/seed';

const SECTIONS = [
  ['dash', '📊 Dashboard'], ['topups', '🪙 Top-ups'], ['refunds', '↩️ Refunds'], ['jobs', '📋 Jobs'],
  ['users', '👥 Users'], ['cats', '🧩 Categories & Areas'], ['numbers', '📵 Numbers check'],
];
const TARGETS = { providers: 150, seekers: 400, jobs: 250, reveals: 300, paidProviders: 30 };

export default function AdminPage() {
  const session = useGuard('admin');
  const db = useServio();
  const router = useRouter();
  const [sec, setSec] = useState('dash');
  const [msg, setMsg] = useState('');

  const pendingTopups = db ? db.topups.filter((x) => x.status === 'pending').length : 0;
  const pendingRefunds = db ? db.refunds.filter((x) => x.status === 'pending').length : 0;
  const heldBids = db ? db.bids.filter((b) => b.status === 'held') : [];

  const metrics = useMemo(() => {
    if (!db) return null;
    const providers = db.users.filter((u) => u.role === 'provider').length;
    const seekers = db.users.filter((u) => u.role === 'seeker').length;
    const paid = new Set(db.topups.filter((x) => x.status === 'approved').map((x) => x.providerId)).size;
    const refunded = db.refunds.filter((r) => r.status === 'approved' || r.status === 'auto-approved').length;
    const refundRate = db.reveals.length ? Math.round((refunded / db.reveals.length) * 100) : 0;
    return { providers, seekers, jobs: db.jobs.length, reveals: db.reveals.length, paidProviders: paid, refundRate };
  }, [db]);

  if (!session || !db || !metrics) return <main className="page"><p className="muted">Loading…</p></main>;

  const approveTopup = (req) => transact((d) => {
    const r = d.topups.find((x) => x.id === req.id);
    if (!r || r.status !== 'pending') return;
    r.status = 'approved';
    const w = d.wallets[r.providerId];
    if (w) { w.balance += r.coins; w.txns.unshift({ id: uid(), type: 'topup', amount: r.coins, note: `Top-up approved (${r.method})`, at: Date.now() }); }
    notify(d, r.providerId, `Top-up approved — +${r.coins} coins added to your wallet.`);
    logActivity(d, `Top-up approved — ${userName(d, r.providerId)} +${r.coins} coins`);
  }, { toast: `Top-up approved: +${req.coins} coins`, toastFor: [req.providerId] });

  const rejectTopup = (req) => transact((d) => {
    const r = d.topups.find((x) => x.id === req.id);
    if (!r || r.status !== 'pending') return;
    r.status = 'rejected';
    notify(d, r.providerId, 'Your top-up request was rejected. Please check the receipt and try again.');
    logActivity(d, `Top-up rejected — ${userName(d, r.providerId)}, ${r.coins} coins`);
  }, { toast: 'Top-up rejected', toastFor: [req.providerId] });

  const decideRefund = (claim, approve) => transact((d) => {
    const r = d.refunds.find((x) => x.id === claim.id);
    if (!r || r.status !== 'pending') return;
    r.status = approve ? 'approved' : 'kept';
    if (approve) {
      const rev = d.reveals.find((x) => x.id === r.revealId);
      if (rev && !rev.refunded) {
        rev.refunded = true;
        const w = d.wallets[r.providerId];
        if (w) { w.balance += 5; w.txns.unshift({ id: uid(), type: 'refund', amount: 5, note: 'Refund approved by admin', at: Date.now() }); }
      }
      notify(d, r.providerId, 'Refund approved — 5 coins back in your wallet.');
    } else {
      notify(d, r.providerId, 'Your refund claim was reviewed and the charge was kept.');
    }
    logActivity(d, `Refund ${approve ? 'approved' : 'kept'} — ${userName(d, r.providerId)}`);
  }, { toast: approve ? 'Refund approved: +5 coins' : 'Refund claim closed', toastFor: [claim.providerId] });

  const Metric = ({ label, value, target, suffix }) => (
    <div className="metric"><div className="muted small">{label}</div><div className="num">{value}{suffix || ''}</div>
      <div className="small muted">Target: {target}{suffix || ''} (60 days)</div>
      <div className="progress"><div style={{ width: Math.min(100, Math.round((value / target) * 100)) + '%' }} /></div></div>
  );

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="brand">Servio</div>
        {SECTIONS.map(([id, label]) => (
          <button key={id} className={`side-btn ${sec === id ? 'sel' : ''}`} onClick={() => setSec(id)}>
            {label}{id === 'topups' && pendingTopups ? ` (${pendingTopups})` : ''}{id === 'refunds' && pendingRefunds ? ` (${pendingRefunds})` : ''}{id === 'numbers' && heldBids.length ? ` (${heldBids.length})` : ''}
          </button>
        ))}
        <button className="side-btn" onClick={() => { if (confirm('Reset all demo data?')) { resetDemoData(); window.location.reload(); } }}>↺ Reset demo data</button>
        <button className="side-btn" onClick={() => { clearSession(); router.replace('/login'); }}>Log out</button>
      </aside>

      <div className="admin-main">
        <h2 style={{ marginTop: 0 }}>Admin — {SECTIONS.find((s) => s[0] === sec)[1]}</h2>
        {msg && <div className="ok">{msg}</div>}

        {sec === 'dash' && (
          <>
            <div className="metric-grid">
              <Metric label="Providers" value={metrics.providers} target={TARGETS.providers} />
              <Metric label="Seekers" value={metrics.seekers} target={TARGETS.seekers} />
              <Metric label="Jobs posted" value={metrics.jobs} target={TARGETS.jobs} />
              <Metric label="Contact reveals" value={metrics.reveals} target={TARGETS.reveals} />
              <Metric label="Providers who paid" value={metrics.paidProviders} target={TARGETS.paidProviders} />
              <Metric label="Refund rate" value={metrics.refundRate} target={10} suffix="%" />
            </div>
            <div className="card"><b>Pending work:</b> {pendingTopups} top-up(s), {pendingRefunds} refund claim(s), {heldBids.length} held bid(s) to check.</div>
            <h3>Recent activity (live)</h3>
            {db.activity.length === 0 && <p className="muted">No activity yet.</p>}
            {db.activity.slice(0, 20).map((a) => (<div key={a.id} className="card" style={{ padding: '10px 16px', margin: '8px 0' }}>{a.text}<div className="small muted">{new Date(a.at).toLocaleString()}</div></div>))}
            <h3>Latest alerts for admin</h3>
            {db.notifications.filter((n) => n.userId === session.userId).slice(0, 8).map((n) => (<div key={n.id} className="card" style={{ padding: '10px 16px', margin: '8px 0' }}>{n.text}</div>))}
          </>
        )}

        {sec === 'topups' && (
          <div className="table-wrap"><table><thead><tr><th>Provider</th><th>Pack</th><th>Method / Ref</th><th>Status</th><th>Action</th></tr></thead><tbody>
            {db.topups.map((x) => (<tr key={x.id}><td>{userName(db, x.providerId)}</td><td>{x.coins} coins · PKR {x.pkr}</td><td>{x.method}<br /><span className="small muted">{x.ref}</span></td><td><span className={`chip ${x.status === 'pending' ? 'chip-brass' : x.status === 'approved' ? 'chip-green' : 'chip-red'}`}>{x.status}</span></td>
              <td>{x.status === 'pending' && (<span className="btn-row"><button className="btn btn-olive btn-sm" onClick={() => approveTopup(x)}>Approve</button><button className="btn btn-danger btn-sm" onClick={() => rejectTopup(x)}>Reject</button></span>)}</td></tr>))}
          </tbody></table></div>
        )}

        {sec === 'refunds' && (
          <>
            <p className="muted small">Bad-lead reports from providers are auto-refunded in the app and marked “auto-approved”. Claims below that are still pending need your decision.</p>
            <div className="table-wrap"><table><thead><tr><th>Provider</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead><tbody>
              {db.refunds.map((x) => (<tr key={x.id}><td>{userName(db, x.providerId)}</td><td>{x.reason}</td><td><span className={`chip ${x.status === 'pending' ? 'chip-brass' : 'chip-green'}`}>{x.status}</span></td>
                <td>{x.status === 'pending' && (<span className="btn-row"><button className="btn btn-olive btn-sm" onClick={() => decideRefund(x, true)}>Approve +5</button><button className="btn btn-ghost btn-sm" onClick={() => decideRefund(x, false)}>Keep charge</button></span>)}</td></tr>))}
            </tbody></table></div>
          </>
        )}

        {sec === 'jobs' && (
          <div className="table-wrap"><table><thead><tr><th>Job</th><th>Seeker</th><th>Area</th><th>Reveals</th><th>Status</th><th>Action</th></tr></thead><tbody>
            {db.jobs.map((j) => (<tr key={j.id}><td><b>{catName(db, j.categoryId)}</b><br /><span className="small">{j.description}</span></td><td>{userName(db, j.seekerId)}</td><td>{j.area}</td><td>{j.revealCount}/3</td><td>{j.status}</td>
              <td><span className="btn-row">
                {j.status === 'open' && <button className="btn btn-ghost btn-sm" onClick={() => transact((d) => { d.jobs.find((x) => x.id === j.id).status = 'closed'; logActivity(d, `Job closed by admin — ${catName(d, j.categoryId)}`); })}>Close</button>}
                <button className="btn btn-danger btn-sm" onClick={() => transact((d) => { d.jobs = d.jobs.filter((x) => x.id !== j.id); d.bids = d.bids.filter((b) => b.jobId !== j.id); logActivity(d, 'Job removed by admin'); })}>Remove</button>
              </span></td></tr>))}
          </tbody></table></div>
        )}

        {sec === 'users' && (
          <div className="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Coins</th><th>Status</th><th>Action</th></tr></thead><tbody>
            {db.users.map((u) => (<tr key={u.id}><td>{u.name}</td><td dir="ltr">{u.phone}</td><td>{u.role}</td><td>{db.wallets[u.id] ? db.wallets[u.id].balance : '—'}</td><td><span className={`chip ${u.status === 'active' ? 'chip-green' : 'chip-red'}`}>{u.status}</span></td>
              <td>{u.role !== 'admin' && (<button className="btn btn-ghost btn-sm" onClick={() => transact((d) => { const x = d.users.find((y) => y.id === u.id); x.status = x.status === 'active' ? 'suspended' : 'active'; logActivity(d, `User ${x.status} — ${x.name}`); notify(d, u.id, x.status === 'active' ? 'Your account is active again.' : 'Your account has been suspended by Servio.'); })}>{u.status === 'active' ? 'Suspend' : 'Activate'}</button>)}</td></tr>))}
          </tbody></table></div>
        )}

        {sec === 'cats' && (
          <>
            <h3>Categories</h3>
            {db.categories.map((c) => (<div key={c.id} className="card" style={{ padding: '10px 16px', margin: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{c.icon} {c.en} · {c.ro} · {c.ur}</span><label className="check-row" style={{ margin: 0 }}><input type="checkbox" checked={c.active} onChange={() => transact((d) => { const x = d.categories.find((y) => y.id === c.id); x.active = !x.active; logActivity(d, `Category ${x.active ? 'enabled' : 'disabled'} — ${x.en}`); })} /> On</label></div>))}
            <h3>Areas</h3>
            {db.areas.map((a) => (<div key={a.name} className="card" style={{ padding: '10px 16px', margin: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{a.name}</span><label className="check-row" style={{ margin: 0 }}><input type="checkbox" checked={a.active} onChange={() => transact((d) => { const x = d.areas.find((y) => y.name === a.name); x.active = !x.active; logActivity(d, `Area ${x.active ? 'enabled' : 'disabled'} — ${x.name}`); })} /> On</label></div>))}
          </>
        )}

        {sec === 'numbers' && (
          <>
            <p className="muted small">Bids and posts that contained a phone number are held here. Release shows a cleaned version; Remove deletes it.</p>
            {heldBids.length === 0 && <div className="card center"><p className="muted">Nothing held. ✅</p></div>}
            {heldBids.map((b) => { const j = db.jobs.find((x) => x.id === b.jobId); return (
              <div key={b.id} className="card">
                <b>{userName(db, b.providerId)}</b> on <b>{j ? catName(db, j.categoryId) : 'a job'}</b>
                <p style={{ margin: '6px 0' }}>“{b.message}”</p>
                <p className="small muted">Cleaned: “{stripPhone(b.message)}”</p>
                <span className="btn-row">
                  <button className="btn btn-olive btn-sm" onClick={() => transact((d) => { const x = d.bids.find((y) => y.id === b.id); x.message = stripPhone(x.message); x.status = 'active'; logActivity(d, `Held bid released (cleaned) — ${userName(d, b.providerId)}`); if (j) notify(d, j.seekerId, 'A bid on your job was checked and released.'); })}>Release cleaned</button>
                  <button className="btn btn-danger btn-sm" onClick={() => transact((d) => { d.bids = d.bids.filter((y) => y.id !== b.id); logActivity(d, `Held bid removed — ${userName(d, b.providerId)}`); })}>Remove</button>
                </span>
              </div> ); })}
          </>
        )}
      </div>
    </div>
  );
}
