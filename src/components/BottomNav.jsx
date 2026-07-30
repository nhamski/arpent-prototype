import './BottomNav.css';

const TABS = [
  { id: 'home', label: 'Home', icon: (
    <svg className="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )},
  { id: 'herd', label: 'Herd', icon: (
    <svg className="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" /><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    </svg>
  )},
  { id: 'land', label: 'Land', icon: (
    <svg className="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 22L12 2l10 20H2z" /><path d="M7 22l5-10 5 10" />
    </svg>
  )},
  { id: 'market', label: 'Market', icon: (
    <svg className="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )},
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bnav">
      {TABS.map(t => (
        <button key={t.id} className={active === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>
          {t.icon}
          <span className="nl">{t.label}</span>
          <span className="nav-dot" />
        </button>
      ))}
    </nav>
  );
}
