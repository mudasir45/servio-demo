'use client';
import { useState } from 'react';
import { TINTS } from '../lib/seed';
import { t, p } from '../lib/i18n';

// The prototype's 6-step voice onboarding (OBQ), copied verbatim — questions,
// icons, step types and simulated mic answers. `work` holds store category ids;
// the prototype's sample for step 2 is the category whose English name is "Plumber".
export const OBQ = [
  { key: 'name', icon: '👤', q: { ur: 'آپ کا نام؟', roman: 'Aap ka naam?', en: 'Your name?' }, type: 'text', sample: 'Muhammad Ahmad', ph: 'Naam likhein…' },
  { key: 'work', icon: '🧰', q: { ur: 'آپ کا کام؟', roman: 'Aap ka kaam?', en: 'Your work?' }, type: 'cats', sample: 'Plumber' },
  { key: 'areas', icon: '📍', q: { ur: 'کہاں کام کرتے ہیں؟', roman: 'Kahan kaam karte hain?', en: 'Where do you work?' }, type: 'areas', sample: 'Depalpur' },
  { key: 'exp', icon: '⭐', q: { ur: 'کتنا تجربہ؟', roman: 'Kitna tajurba?', en: 'Experience?' }, type: 'chips', options: ['1 saal se kam', '1–3 saal', '3–5 saal', '5+ saal'], sample: '5+ saal' },
  { key: 'charges', icon: '💰', q: { ur: 'وزٹ چارجز؟', roman: 'Visit charges?', en: 'Visit charges?' }, type: 'chips', options: ['Free visit', 'PKR 200', 'PKR 300', 'PKR 500'], sample: 'PKR 300' },
  { key: 'avail', icon: '🟢', q: { ur: 'ابھی دستیاب ہیں؟', roman: 'Abhi available hain?', en: 'Available now?' }, type: 'avail', sample: 'Haan, available' },
];

// The store keeps experience as years and visit charge as a PKR number; the
// onboarding speaks in the prototype's chip labels. These map between them.
export function expToYears(exp) {
  return { '1 saal se kam': 1, '1–3 saal': 2, '3–5 saal': 4, '5+ saal': 6 }[exp] || 0;
}
export function yearsToExp(y) {
  if (!y || y <= 1) return '1 saal se kam';
  if (y <= 3) return '1–3 saal';
  if (y <= 5) return '3–5 saal';
  return '5+ saal';
}
export function chargesToPrice(ch) {
  if (!ch || ch === 'Free visit') return 0;
  const n = parseInt(String(ch).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}
export function priceToCharges(price) {
  if (!price) return 'Free visit';
  return 'PKR ' + Number(price).toLocaleString();
}

const catLabel = (c, lang) => (lang === 'ur' ? c.ur : lang === 'en' ? c.en : c.ro);

export function obAnswerText(profile, key, lang, categories) {
  if (key === 'name') return profile.name || '';
  if (key === 'work') return (profile.work || []).map((id) => { const c = (categories || []).find((x) => x.id === id); return c ? catLabel(c, lang) : id; }).join(' • ');
  if (key === 'areas') return (profile.areas || []).join(' • ');
  if (key === 'exp') return profile.exp || '';
  if (key === 'charges') return profile.charges || '';
  if (key === 'avail') return profile.avail ? (lang === 'en' ? 'Yes — available' : 'Haan, available') : (lang === 'en' ? 'No' : 'Nahi');
  return '';
}

// One onboarding step screen, exactly the prototype's layout:
// backlink, progress dots + "n / 6", big emoji, serif question, body,
// big brass mic (press-and-hold) with caption, white answer box,
// midnight "Aage →" sticky button, "Skip ⏭" link.
// A provider can offer at most 3 services (work categories) — enforced here in
// the onboarding tiles, and again in the profile re-record/edit (same ObStep).
export const MAX_SERVICES = 3;
export const MAX_SERVICES_MSG = {
  ur: 'زیادہ سے زیادہ 3 کام چن سکتے ہیں',
  ro: 'Zyada se zyada 3 kaam chun sakte hain',
  en: 'You can choose at most 3 services',
};

export function ObStep({ step, profile, onChange, lang, categories, areas, onBack, onNext, onSkip, returnTo }) {
  const q = OBQ[step];
  const [holding, setHolding] = useState(false);
  const [limitMsg, setLimitMsg] = useState('');
  const question = lang === 'ur' ? q.q.ur : lang === 'en' ? q.q.en : q.q.roman;
  const answer = obAnswerText(profile, q.key, lang, categories);

  const applySample = () => {
    if (q.key === 'name') onChange({ name: q.sample });
    else if (q.key === 'work') {
      const c = categories.find((x) => x.en === q.sample);
      if (c && !profile.work.includes(c.id)) {
        if (profile.work.length >= MAX_SERVICES) { setLimitMsg(MAX_SERVICES_MSG[lang] || MAX_SERVICES_MSG.ro); return; }
        setLimitMsg('');
        onChange({ work: [...profile.work, c.id] });
      }
    } else if (q.key === 'areas') {
      if (areas.includes(q.sample) && !profile.areas.includes(q.sample)) onChange({ areas: [...profile.areas, q.sample] });
    } else if (q.key === 'exp') onChange({ exp: q.sample });
    else if (q.key === 'charges') onChange({ charges: q.sample });
    else if (q.key === 'avail') onChange({ avail: true });
  };
  const pressStart = (e) => { e.preventDefault(); if (!holding) setHolding(true); };
  const pressEnd = () => { if (!holding) return; setHolding(false); applySample(); };

  const toggleList = (key, val) => {
    const has = profile[key].includes(val);
    // Max 3 services: tapping a 4th work tile shows the limit and does not select.
    if (key === 'work' && !has && profile[key].length >= MAX_SERVICES) {
      setLimitMsg(MAX_SERVICES_MSG[lang] || MAX_SERVICES_MSG.ro);
      return;
    }
    setLimitMsg('');
    onChange({ [key]: has ? profile[key].filter((x) => x !== val) : [...profile[key], val] });
  };

  return (
    <>
      <button className="backlink" onClick={onBack}>← {p(lang, 'back')}</button>
      <div className="progress-dots">
        {OBQ.map((_, i) => (<i key={i} className={i < step ? 'done' : i === step ? 'on' : ''}></i>))}
        <span>{step + 1} / 6</span>
      </div>
      <div className="ob-icon">{q.icon}</div>
      <h1 className="ob-q">{question}</h1>
      <div>
        {q.type === 'text' && (
          <input placeholder={q.ph} value={profile.name} onChange={(e) => onChange({ name: e.target.value })} aria-label="Naam" />
        )}
        {q.type === 'cats' && (
          <>
            <p className="hold-hint" style={{ margin: '0 0 10px' }}>{(profile.work || []).length} / {MAX_SERVICES} {lang === 'en' ? 'services' : 'kaam'}</p>
            <div className="cat-grid">
              {categories.map((c, i) => (
                <button key={c.id} className={`cat ${profile.work.includes(c.id) ? 'sel' : ''}`} style={{ background: TINTS[i % TINTS.length] }} onClick={() => toggleList('work', c.id)}>
                  <span className="ic">{c.icon}</span><b>{catLabel(c, lang)}</b>
                </button>
              ))}
            </div>
            {limitMsg && <div className="warn" role="alert">{limitMsg}</div>}
          </>
        )}
        {q.type === 'areas' && (
          <div className="pill-row" style={{ justifyContent: 'center' }}>
            {areas.map((a) => (
              <button key={a} className={`pill ${profile.areas.includes(a) ? 'active' : ''}`} onClick={() => toggleList('areas', a)}>{a}</button>
            ))}
          </div>
        )}
        {q.type === 'chips' && (
          <div className="pill-row" style={{ justifyContent: 'center' }}>
            {q.options.map((o) => (
              <button key={o} className={`pill ${answer === o ? 'active' : ''}`} onClick={() => onChange({ [q.key]: o })}>{o}</button>
            ))}
          </div>
        )}
        {q.type === 'avail' && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <label className="switch" style={{ transform: 'scale(1.5)' }}>
              <input type="checkbox" checked={!!profile.avail} onChange={(e) => onChange({ avail: e.target.checked })} /><span className="track"></span>
            </label>
          </div>
        )}
      </div>
      {q.type !== 'avail' && (
        <div>
          <button
            className={`bigmic ${holding ? 'listening' : ''}`}
            aria-label="Daba kar bolo"
            onPointerDown={pressStart}
            onPointerUp={pressEnd}
            onPointerLeave={pressEnd}
            onPointerCancel={pressEnd}
            onContextMenu={(e) => e.preventDefault()}
          >{holding ? '🔴' : '🎙️'}</button>
          <p className="hold-hint">{t(lang, 'holdHint')}</p>
        </div>
      )}
      <div className={`ob-answer ${answer ? '' : 'empty'}`}>{answer || '—'}</div>
      <div className="sticky-action">
        <button className="btn btn-primary" onClick={onNext}>
          {returnTo ? t(lang, 'profileDone') : step === 5 ? `${t(lang, 'seeProfile')} →` : `${t(lang, 'next')} →`}
        </button>
      </div>
      {!returnTo && <button className="skip-link" onClick={onSkip}>{t(lang, 'skip')} ⏭</button>}
    </>
  );
}

export const PHOTO_ICONS = ['🔧', '🪛', '🚿', '💡', '❄️', '🪚', '🎨', '📱'];

// The prototype's AI profile card: field rows with a round brass mic button
// per row (re-record), the Available switch row, and the work-photos card.
export function ProfileCard({ profile, lang, categories, onRerecord, onAvail, photos, onPhotos, photo, onRetake }) {
  const workTxt = (profile.work || []).map((id) => { const c = (categories || []).find((x) => x.id === id); return c ? c.icon + ' ' + catLabel(c, lang) : id; }).join(' • ');
  const row = (icon, label, value, key) => (
    <div className="field-row" key={key}>
      <span className="fi">{icon}</span>
      <div className="fv"><small>{label}</small><b>{value || '—'}</b></div>
      {onRerecord && <button className="mic-mini" onClick={() => onRerecord(key)} aria-label="Dobara bolo">🎙️</button>}
    </div>
  );
  return (
    <>
      <div className="card">
        {(photo || onRetake) && (
          <div className="field-row">
            {photo
              ? <img className="avatar-img" src={photo} alt="Selfie" width={48} height={48} style={{ width: 48, height: 48, flexBasis: 48 }} />
              : <span className="fi">📷</span>}
            <div className="fv">
              <small>{lang === 'en' ? 'Selfie' : 'Selfie'}</small>
              <b>{photo ? (lang === 'en' ? '✓ Face verified' : '✓ Chehra verify ho gaya') : (lang === 'en' ? 'Not taken yet' : 'Abhi selfie nahi li')}</b>
            </div>
            {onRetake && <button className="mic-mini" onClick={onRetake} aria-label="Selfie dobara lein">📷</button>}
          </div>
        )}
        {row('👤', lang === 'en' ? 'Name' : 'Naam', profile.name, 'name')}
        {row('🧰', lang === 'en' ? 'Work' : 'Kaam', workTxt, 'work')}
        {row('📍', lang === 'en' ? 'Areas' : 'Ilaka', (profile.areas || []).join(' • '), 'areas')}
        {row('⭐', lang === 'en' ? 'Experience' : 'Tajurba', profile.exp, 'exp')}
        {row('💰', 'Visit charges', profile.charges, 'charges')}
        <div className="field-row">
          <span className="fi">🟢</span>
          <div className="fv"><small>{t(lang, 'available')}</small><b>{profile.avail ? t(lang, 'availOn') : t(lang, 'availOff')}</b></div>
          <label className="switch"><input type="checkbox" checked={!!profile.avail} onChange={(e) => onAvail(e.target.checked)} /><span className="track"></span></label>
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h2>{t(lang, 'photos')} <span className="muted small">{photos} / 10</span></h2>
        <div className="photo-grid">
          {Array.from({ length: photos }).map((_, i) => (
            <div className="photo-tile" key={i}>{PHOTO_ICONS[i % PHOTO_ICONS.length]}
              {onPhotos && <button onClick={() => onPhotos(photos - 1)} aria-label="Hatao">✕</button>}
            </div>
          ))}
          {photos < 10 && onPhotos && <button className="photo-add" onClick={() => onPhotos(photos + 1)}>📷 +</button>}
          {photos < 10 && !onPhotos && <div className="photo-add" style={{ display: 'grid', placeItems: 'center' }}>📷</div>}
        </div>
      </div>
    </>
  );
}
