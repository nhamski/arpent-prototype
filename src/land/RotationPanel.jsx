export default function RotationPanel() {
  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Rotation Planner</div>
      <p style={{ font: '400 15px/1.5 var(--sans)', color: 'var(--ink2)', marginBottom: 16 }}>
        Plan paddock rotations from known forage data — no photo needed.
      </p>

      <div className="field">
        <label>Usable Forage (lb/acre)</label>
        <input type="text" inputMode="decimal" defaultValue="1,840" readOnly />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="field">
          <label>Pasture Acres</label>
          <input type="text" inputMode="decimal" defaultValue="80" readOnly />
        </div>
        <div className="field">
          <label>Herd (AU)</label>
          <input type="text" inputMode="decimal" defaultValue="45" readOnly />
        </div>
      </div>
      <div className="field">
        <label>Target Residency (days)</label>
        <input type="text" inputMode="decimal" defaultValue="5" readOnly />
      </div>

      <div className="rot-grid">
        <div className="rot-stat"><div className="rot-num">5</div><div className="rot-label">Paddocks</div></div>
        <div className="rot-stat"><div className="rot-num">5</div><div className="rot-label">Graze Days</div></div>
        <div className="rot-stat"><div className="rot-num">20</div><div className="rot-label">Rest Days</div></div>
        <div className="rot-stat"><div className="rot-num">52</div><div className="rot-label">Max AU</div></div>
      </div>

      <div className="card" style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pill pill-ok">Feasible</span>
          <span style={{ font: '400 15px/1 var(--sans)', color: 'var(--ink2)' }}>
            Each paddock feeds 45 AU for 5 days
          </span>
        </div>
      </div>
    </section>
  );
}
