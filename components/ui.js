'use client';

// Small shared building blocks copied from the prototype's render helpers.

export const AVCOLORS = ['#182234', '#68784F', '#9A7B3F', '#8C5A3C'];
export const avColor = (i) => AVCOLORS[Math.abs(i || 0) % AVCOLORS.length];

// Provider avatar: the verified face-cropped selfie when the provider has one
// (providers[id].photo, a small data URL), otherwise the initial-letter disc.
// Seeded demo providers have no photo, so they keep the letter avatar.
export function ProviderAvatar({ photo, name, size = 56, bg }) {
  const s = { width: size, height: size, flexBasis: size };
  if (photo) return <img className="avatar-img" src={photo} alt={name || 'Provider'} width={size} height={size} style={s} />;
  return (
    <span className="avatar" style={{ ...s, fontSize: Math.round(size * 0.43), background: bg || 'var(--teal)' }}>
      {(name || 'P').charAt(0)}
    </span>
  );
}

export function stars(r) {
  const f = Math.round(r || 0);
  let s = '';
  for (let i = 0; i < 5; i++) s += i < f ? '★' : '☆';
  return s;
}

// Prototype revealDots(n): filled dots for used slots, .off for the rest.
export function Dots({ n, light }) {
  return (
    <span className="dots-reveal" style={light ? { color: '#fff' } : undefined}>
      {[0, 1, 2].map((i) => (<span key={i} className={i < n ? '' : 'off'}>●</span>))}
    </span>
  );
}

// Prototype priceText / priceTypeLabel, adapted to the store's bid shape
// (priceType: 'fixed' | 'range' | 'visit', visitCharge in PKR).
export function priceText(b) {
  if (!b) return '';
  if (b.priceType === 'fixed') return 'PKR ' + Number(b.price || 0).toLocaleString();
  if (b.priceType === 'range') return 'PKR ' + Number(b.price || 0).toLocaleString() + ' – ' + Number(b.priceTo || 0).toLocaleString();
  return 'Visit first';
}
export function priceTypeLabel(b) {
  if (!b) return '';
  if (b.priceType === 'fixed') return '🎯 Fixed';
  if (b.priceType === 'range') return '↔️ Range';
  return '👀 Visit first • ' + (b.visitCharge ? 'PKR ' + b.visitCharge : 'Free');
}

// Prototype .celebrate screen (checkpop + title + sub + two buttons).
export function Celebrate({ title, sub, big, btn1, btn2 }) {
  return (
    <div className="celebrate">
      <div className="checkpop">✓</div>
      <h1>{title}</h1>
      {big && <div style={{ fontSize: 44, fontWeight: 800, margin: '10px 0' }}>{big}</div>}
      <p className="muted">{sub}</p>
      {btn1 && <button className="btn btn-amber" style={{ marginTop: 16 }} onClick={btn1.onClick}>{btn1.label}</button>}
      {btn2 && <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={btn2.onClick}>{btn2.label}</button>}
    </div>
  );
}

// Prototype screening modal (phone-number leakage, PRD §13).
export function ScreeningModal({ found, cleaned, onContinue, onClose }) {
  if (!found) return null;
  return (
    <div className="modal open">
      <div className="modal-card">
        <h3>🛡️ Number mila hai</h3>
        <p style={{ margin: '0 0 6px' }}><b>📞 {found}</b></p>
        <p className="muted" style={{ margin: '0 0 12px' }}>Number hata diya jayega. Message check ke liye ruka rahega — number Servio par hi share hota hai.</p>
        <div style={{ background: '#F3EAD8', border: '1px solid var(--line)', borderRadius: 12, padding: 13 }}>
          <span className="small muted" style={{ fontWeight: 800 }}>SAF VERSION</span><br />{cleaned || '—'}
        </div>
        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onContinue}>✓ Number hata kar aage</button>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>✏️ Edit karein</button>
        </div>
      </div>
    </div>
  );
}

// Prototype voice-note listen button (▶ / ⏸ while "playing").
export function ListenBtn({ id, playingId, onPlay, label }) {
  const on = playingId === id;
  return (
    <button
      className="playbtn"
      style={on ? { background: 'var(--red)' } : undefined}
      onClick={() => onPlay(id)}
      aria-label={label || 'Voice note sunein'}
    >{on ? '⏸' : '▶'}</button>
  );
}
