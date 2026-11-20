'use client';

// The prototype's floating rounded bottom nav: 5 items, brass centre button.
// items: [{ key, icon, label, center?, badge? }]
export default function BottomNav({ items, active, onGo }) {
  return (
    <nav className="bottomnav" aria-label="Main">
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
