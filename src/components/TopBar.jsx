import { useState } from 'react';
import './TopBar.css';

export default function TopBar({ theme, onToggleTheme, user, onSignIn, onSignOut, authError }) {
  const [showMenu, setShowMenu] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-brand">Arpent</span>
      </div>
      <div className="topbar-right">
        <button className="topbar-theme-btn" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === 'field' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {user ? (
          <div style={{ position: 'relative' }}>
            <button
              className="topbar-avatar"
              onClick={() => setShowMenu((p) => !p)}
              aria-label="Account menu"
            >
              {initials}
            </button>
            {showMenu && (
              <div className="topbar-menu">
                <div className="topbar-menu-name">{user.name || user.email}</div>
                <div className="topbar-menu-email">{user.email}</div>
                <button className="topbar-menu-btn" onClick={() => { setShowMenu(false); onSignOut?.(); }}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="topbar-signin" onClick={onSignIn}>
            Sign In
          </button>
        )}
      </div>
      {authError && (
        <div className="topbar-error">{authError}</div>
      )}
    </header>
  );
}
