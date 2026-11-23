'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, useServio } from '../lib/store';
import { getLang, setLang } from '../lib/i18n';

// Prototype topbar, exactly: brass S logo-mark + serif "Servio" on the left;
// on the right ONLY the coin pill (providers, live balance — tapping it opens
// the wallet, like the prototype's showView('wallet')) and the segmented
// language pill (اردو / Roman / EN). No bell, no logout in the header —
// alerts live in the screens, logout lives in Settings (prototype pattern).
const LANG_BTNS = [
  { id: 'ur', label: 'اردو' },
  { id: 'ro', label: 'Roman' },
  { id: 'en', label: 'EN' },
];

export default function AppHeader({ role, showCoins, title }) {
  const db = useServio();
  const [lang, setLangState] = useState('ro');
  const [me, setMe] = useState(null);

  useEffect(() => { setLangState(getLang()); setMe(getSession()); }, []);

  const balance = db && me && db.wallets[me.userId] ? db.wallets[me.userId].balance : null;
  const coinsVisible = showCoins !== undefined ? showCoins : role === 'provider';

  const changeLang = (l) => { setLang(l); setLangState(l); window.dispatchEvent(new CustomEvent('servio-lang')); };
  const gotoWallet = () => window.dispatchEvent(new CustomEvent('servio-goto', { detail: 'wallet' }));

  // Desktop only (.page-title is display:none below 1024px): the current
  // screen's name in the topbar, passed by the page from its tab state.
  // Leading emoji/symbols in the i18n labels are stripped for the title.
  const cleanTitle = title ? title.replace(/^[^\p{L}]+/u, '') : '';

  return (
    <header className="topbar">
      <div className="topbar-in">
        <div className="logo"><div className="logo-mark">S</div><b>Servio</b></div>
        {cleanTitle ? <div className="page-title">{cleanTitle}</div> : null}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {coinsVisible && balance !== null && (
            <button className="coin-pill" onClick={gotoWallet} aria-label="Wallet">🪙 {balance}</button>
          )}
          <div className="lang-switch" role="group" aria-label="Language">
            {LANG_BTNS.map((l) => (
              <button key={l.id} className={lang === l.id ? 'active' : ''} onClick={() => changeLang(l.id)}>{l.label}</button>
            ))}
          </div>
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

// Hook: pages listen for header coin-pill taps ('wallet') and other nav jumps.
export function useGoto(setTab) {
  useEffect(() => {
    const h = (e) => setTab(e.detail);
    window.addEventListener('servio-goto', h);
    return () => window.removeEventListener('servio-goto', h);
  }, [setTab]);
}
