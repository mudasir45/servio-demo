'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession, useServio } from '../lib/store';
import { t, getLang, setLang } from '../lib/i18n';

// Top bar — mirrors the prototype .topbar: midnight bar, brass logo mark,
// segmented language switch (اردو / Roman / EN), coin pill for providers.
const LANG_BTNS = [
  { id: 'ur', label: 'اردو' },
  { id: 'ro', label: 'Roman' },
  { id: 'en', label: 'EN' },
];

export default function AppHeader({ role }) {
  const router = useRouter();
  const db = useServio();
  const [lang, setLangState] = useState('ro');
  const [me, setMe] = useState(null);

  useEffect(() => { setLangState(getLang()); setMe(getSession()); }, []);

  const unread = db && me ? db.notifications.filter((n) => n.userId === me.userId && !n.read).length : 0;
  const balance = db && me && db.wallets[me.userId] ? db.wallets[me.userId].balance : null;

  const changeLang = (l) => { setLang(l); setLangState(l); window.dispatchEvent(new CustomEvent('servio-lang')); };

  return (
    <header className="topbar">
      <div className="topbar-in">
        <div className="logo"><div className="logo-mark">S</div><b>Servio</b></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {role === 'provider' && balance !== null && (
            <span className="coin-pill" aria-label="Wallet">🪙 {balance}</span>
          )}
          <button className="bell-btn" title={t(lang, 'alerts')} aria-label={t(lang, 'alerts')}>🔔{unread > 0 && <span className="badge">{unread}</span>}</button>
          <div className="lang-switch" role="group" aria-label="Language">
            {LANG_BTNS.map((l) => (
              <button key={l.id} className={lang === l.id ? 'active' : ''} onClick={() => changeLang(l.id)}>{l.label}</button>
            ))}
          </div>
          <button className="logout-btn" onClick={() => { clearSession(); router.replace('/login'); }}>{t(lang, 'logout')}</button>
        </div>
      </div>
    </header>
  );
}

// Hook: guard a page to one role. Returns session (null while checking / redirecting).
export function useGuard(role) {
  const router = useRouter();
  const [session, setSessionState] = useState(null);
  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace('/login'); return; }
    if (s.role !== role) {
      router.replace(s.role === 'admin' ? '/admin' : s.role === 'provider' ? '/provider' : '/seeker');
      return;
    }
    setSessionState(s);
  }, [role, router]);
  return session;
}

// Hook: current language, updates when the header toggle changes.
export function useLang() {
  const [lang, setLangState] = useState('ro');
  useEffect(() => {
    const read = () => setLangState(getLang());
    read();
    window.addEventListener('servio-lang', read);
    window.addEventListener('storage', read);
    return () => { window.removeEventListener('servio-lang', read); window.removeEventListener('storage', read); };
  }, []);
  return lang;
}
