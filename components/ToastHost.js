'use client';
import { useEffect, useRef, useState } from 'react';
import { useServio, getSession } from '../lib/store';

// Shows toasts for events written by ANY tab (via db.lastEvent) when they target
// the currently logged-in user, plus same-tab events.
export default function ToastHost() {
  const db = useServio();
  const [toasts, setToasts] = useState([]);
  const seen = useRef(null);

  useEffect(() => {
    if (!db || !db.lastEvent) return;
    const ev = db.lastEvent;
    if (seen.current === null) { seen.current = ev.id; return; } // don't replay on first load
    if (seen.current === ev.id) return;
    seen.current = ev.id;
    const session = getSession();
    const me = session ? session.userId : null;
    const forMe = ev.toastFor === 'all' || (Array.isArray(ev.toastFor) && me && ev.toastFor.includes(me));
    if (!forMe) return;
    const id = ev.id;
    setToasts((prev) => [...prev.slice(-2), { id, text: ev.toast }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5000);
  }, [db]);

  if (!toasts.length) return null;
  return (
    <div className="toast-wrap" aria-live="polite">
      {toasts.map((x) => (<div key={x.id} className="toast">🔔 {x.text}</div>))}
    </div>
  );
}
