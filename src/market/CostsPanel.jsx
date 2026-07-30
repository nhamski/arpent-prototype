const COSTS = [
  { label: 'Feed & mineral', val: '$2,400' },
  { label: 'Pasture rent', val: '$1,800' },
  { label: 'Labor', val: '$800' },
  { label: 'Vet & supplies', val: '$600' },
  { label: 'Equipment', val: '$400' },
  { label: 'Insurance', val: '$250' },
];

export default function CostsPanel() {
  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Cost of Ownership</div>

      <div className="tile-dark card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="tl" style={{ color: 'var(--nav-muted)', marginBottom: 8 }}>Daily Cost Per Head</div>
        <div style={{ font: '600 36px/1 var(--serif)', color: '#F6F2EA' }}>$1.42</div>
        <div style={{ font: '400 15px/1 var(--sans)', color: 'var(--nav-text)', marginTop: 6 }}>
          $42.60/month · $518/year
        </div>
      </div>

      <div className="card">
        <div className="card-title">Monthly Costs</div>
        {COSTS.map((c) => (
          <div key={c.label} className="cost-row">
            <span className="cost-label">{c.label}</span>
            <span className="cost-val">{c.val}</span>
          </div>
        ))}
        <div className="cost-row" style={{ borderTop: '2px solid var(--line)', fontWeight: 700 }}>
          <span className="cost-label" style={{ color: 'var(--ink)', fontWeight: 700 }}>Total</span>
          <span className="cost-val">$6,250</span>
        </div>
      </div>

      <div className="tiles" style={{ marginTop: 16 }}>
        <div className="tile">
          <div className="tl">Breakeven</div>
          <div className="tv">$186</div>
          <div className="ts">per cwt</div>
        </div>
        <div className="tile">
          <div className="tl">Market</div>
          <div className="tv" style={{ color: 'var(--ok)' }}>$192</div>
          <div className="ts">per cwt</div>
        </div>
      </div>
    </section>
  );
}
