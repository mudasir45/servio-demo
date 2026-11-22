'use client';

// The prototype's floating rounded bottom nav: 5 items, brass centre button.
// items: [{ key, icon, label, center?, badge? }]
export default function BottomNav({ items, active, onGo }) {
  return (
    <nav className="bottomnav" aria-label="Main">
      {/* Desktop only: sidebar brand block (hidden on mobile via .nav-brand). */}
      <div className="nav-brand" aria-hidden="true">
        <div className="logo"><div className="logo-mark">S</div><b>Servio</b></div>
      </div>
      {items.map((it) => (
        <button
          key={it.key}
          className={`${it.center ? 'center ' : ''}${active === it.key ? 'active' : ''}`}
          onClick={() => onGo(it.key)}
        >
          <span>{it.icon}</span>{it.label}
          {it.badge > 0 && <span className="nb-badge">{it.badge}</span>}
        </button>
      ))}
    </nav>
  );
}
