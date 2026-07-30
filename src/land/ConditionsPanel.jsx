export default function ConditionsPanel() {
  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Conditions</div>
      <p style={{ font: '400 15px/1.4 var(--sans)', color: 'var(--ink2)', marginBottom: 16 }}>
        Logan County, KS · ZIP 67646
      </p>

      <div className="cond-card">
        <div className="cond-label">Drought Status</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="drought-indicator" style={{ background: '#E8C84A' }} />
          <div>
            <div className="cond-value">D1 — Moderate</div>
            <div className="cond-note">10% capacity reduction applied to all analyses</div>
          </div>
        </div>
      </div>

      <div className="cond-card">
        <div className="cond-label">Growing Season Rainfall</div>
        <div className="cond-value">8.4"</div>
        <div className="cond-note">vs. 3-year average of 10.2" — below normal</div>
      </div>

      <div className="cond-card">
        <div className="cond-label">Annual Rainfall</div>
        <div className="cond-value">14.1"</div>
        <div className="cond-note">vs. 3-year average of 19.8" (71% of normal)</div>
      </div>

      <div className="card" style={{ background: 'var(--warn-bg)', borderColor: 'transparent' }}>
        <div style={{ font: '600 15px/1.3 var(--sans)', color: 'var(--warn)' }}>
          Below-average rainfall may tighten grazing capacity beyond the drought category alone. Consider conservative stocking.
        </div>
      </div>
    </section>
  );
}
