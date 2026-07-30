export default function ForagePanel() {
  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Grazing Plan</div>
      <p style={{ font: '400 15px/1.5 var(--sans)', color: 'var(--ink2)', marginBottom: 16 }}>
        Photograph a pasture, tap to measure, get a conservative grazing capacity analysis.
      </p>

      <div className="scan-step">
        <div className="scan-num">1</div>
        <div className="scan-body">
          <div className="scan-title">Photograph</div>
          <div className="scan-desc">Include a forage stick, tape measure, or T-post for scale reference.</div>
        </div>
      </div>
      <div className="scan-step">
        <div className="scan-num">2</div>
        <div className="scan-body">
          <div className="scan-title">Tap to Measure</div>
          <div className="scan-desc">Mark the reference object, then mark the forage height. Two taps each.</div>
        </div>
      </div>
      <div className="scan-step">
        <div className="scan-num">3</div>
        <div className="scan-body">
          <div className="scan-title">Enter Details</div>
          <div className="scan-desc">Pasture acres, herd size, and current month for seasonal adjustment.</div>
        </div>
      </div>

      <button className="capture-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="5" width="20" height="15" rx="2" />
          <circle cx="12" cy="13" r="4" />
          <path d="M8 5V3h8v2" />
        </svg>
        <span>Scan a Pasture</span>
      </button>

      <div className="sh">Sample Result</div>
      <div className="hero-card">
        <div className="hero-label">Carrying Capacity</div>
        <div className="hero-value" style={{ color: '#8DA06A' }}>Room to Run</div>
        <div className="hero-sub">
          This pasture can support <strong style={{ color: '#F6F2EA' }}>52 AU</strong> — you're running 45
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="sl">Usable forage</div>
          <div className="sv">1,840 <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink2)' }}>lb/ac</span></div>
        </div>
        <div className="stat">
          <div className="sl">AU-days/acre</div>
          <div className="sv">70</div>
        </div>
        <div className="stat">
          <div className="sl">Drought</div>
          <div className="sv">D1 <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink2)' }}>−10%</span></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">Rotation Plan</div>
        <div className="rot-grid">
          <div className="rot-stat"><div className="rot-num">5</div><div className="rot-label">Paddocks</div></div>
          <div className="rot-stat"><div className="rot-num">5</div><div className="rot-label">Graze Days</div></div>
          <div className="rot-stat"><div className="rot-num">20</div><div className="rot-label">Rest Days</div></div>
          <div className="rot-stat"><div className="rot-num">16</div><div className="rot-label">Acres Each</div></div>
        </div>
      </div>

      <p style={{ font: '400 14px/1.4 var(--sans)', color: 'var(--ink3)', marginTop: 16, textAlign: 'center' }}>
        Conservative by design — numbers round down and apply a safety buffer.
      </p>
    </section>
  );
}
