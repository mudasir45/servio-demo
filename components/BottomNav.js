'use client';

// The prototype's floating rounded bottom nav: 5 items, brass centre button.
// items: [{ key, icon, label, center?, badge? }]
// Desktop (≥1024px) the same nav becomes the app sidebar; two extra
// display-only blocks can then be passed in — coinWidget {balance, pkr,
// onTopup} and userBlock {name, roleLabel, photo, onOpen} — rendered in a
// .nav-foot that is display:none on mobile, so mobile is untouched.
export default function BottomNav({ items, active, onGo, coinWidget, userBlock }) {
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
      {(coinWidget || userBlock) && (
        <div className="nav-foot">
          {coinWidget && (
            <div className="nav-coins">
              <div className="nc-row"><span>🪙 Coins</span><b>{coinWidget.balance}</b></div>
              <div className="nc-sub">= PKR {Number(coinWidget.pkr || 0).toLocaleString()}</div>
              <button className="nc-btn" onClick={coinWidget.onTopup}>＋ Top up</button>
            </div>
          )}
          {userBlock && (
            <button className="nav-user" onClick={userBlock.onOpen}>
              {userBlock.photo
                ? <img className="avatar-img" src={userBlock.photo} alt="" width={40} height={40} style={{ width: 40, height: 40, flexBasis: 40 }} />
                : <span className="avatar" style={{ width: 40, height: 40, flexBasis: 40, fontSize: 17 }}>{(userBlock.name || 'U').charAt(0)}</span>}
              <span className="nu-text">
                <span className="nu-name">{userBlock.name}</span>
                <span className="nu-role">{userBlock.roleLabel} • ⚙ Settings</span>
              </span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
