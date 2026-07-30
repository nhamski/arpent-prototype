import './SubTabs.css';

export default function SubTabs({ tabs, active, onChange }) {
  if (!tabs || tabs.length === 0) return null;
  return (
    <div className="subtab-bar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`subtab-chip ${active === t.id ? 'on' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
