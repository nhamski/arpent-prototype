const PASTURES = [
  {
    name: 'North 80', status: 'Day 18 / 21', statusClass: 'pill-warn',
    detail: '80 acres · 45 head · Condition: Good', progress: 86,
    showActions: true,
  },
  {
    name: 'South Creek', status: 'Resting', statusClass: 'pill-ok',
    detail: '160 acres · 0 head · Day 12 of 35-day rest · Condition: Fair',
    progress: 34, fillColor: 'var(--accent)',
  },
  {
    name: 'Highway', status: 'Day 5 / 21', statusClass: 'pill-ok',
    detail: '40 acres · 22 head · Condition: Good', progress: 24,
  },
  {
    name: 'East Pasture', status: 'Day 8 / 14', statusClass: 'pill-ok',
    detail: '120 acres · 34 head (sheep) · Condition: Good', progress: 57,
  },
];

export default function PasturesPanel() {
  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Pastures</div>
      {PASTURES.map((p) => (
        <div key={p.name} className="pasture-card">
          <div className="pasture-head">
            <div className="pasture-name">{p.name}</div>
            <span className={`pill ${p.statusClass}`}>{p.status}</span>
          </div>
          <div className="pasture-detail">{p.detail}</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${p.progress}%`, background: p.fillColor || undefined }}
            />
          </div>
          {p.showActions && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="act-btn" style={{ padding: '12px 16px', fontSize: 15, flex: 1 }}>Move Herd</button>
              <button className="act-btn outline" style={{ padding: '12px 16px', fontSize: 15, flex: 1 }}>Scan</button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
