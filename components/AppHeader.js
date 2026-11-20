'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession, useServio } from '../lib/store';
import { LANGS, t, getLang, setLang } from '../lib/i18n';

// Top bar for seeker / provider: brand, language toggle, alerts bell, logout.
export default function AppHeader({ role }) {
  const router = useRouter();
  const db = useServio();
  const [lang, setLangState] = useState('ro');
  const [me, setMe] = useState(null);

  useEffect(() => { setLangState(getLang()); setMe(getSession()); }, []);

  const unread = db && me ? db.notifications.filter((n) => n.userId === me.userId && !n.read).length : 0;

  const changeLang = (l) => { setLang(l); setLangState(l); window.dispatchEvent(new CustomEvent('servio-lang')); };

  return (
    <header className="app-header">
      <div className="brand">Servio</div>
      <div className="header-actions">
        <select aria-label="Language" value={lang} onChange={(e) => changeLang(e.target.value)} className="lang-select">
          {LANGS.map((l) => (<option key={l.id} value={l.id}>{l.label}</option>))}
        </select>
        <span className="bell" title={t(lang, 'alerts')}>🔔{unread > 0 && <span className="badge">{unread}</span>}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => { clearSession(); router.replace('/login'); }}>{t(lang, 'logout')}</button>
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
