const HM_LEVELS = { 1: 'hm-1', 2: 'hm-2', 3: 'hm-3', 4: 'hm-4', 5: 'hm-5' };

function Heatmap({ levels }) {
  return (
    <div className="timing-heatmap">
      {levels.map((l, i) => (
        <span key={i} className={`hm ${HM_LEVELS[l]}`} />
      ))}
    </div>
  );
}

function TimingRow({ name, levels, sell, buy, now, nowClass }) {
  return (
    <div className="timing-row">
      <div className="timing-row-name">{name}</div>
      <div className="timing-row-data">
        <Heatmap levels={levels} />
        <div className="timing-signals">
          <span className="pill-sell">SELL &#x25B2; {sell}</span>
          <span className="pill-buy">BUY &#x25BC; {buy}</span>
          <span className={`timing-now ${nowClass || ''}`}>{now}</span>
        </div>
      </div>
    </div>
  );
}

function TimingLegend() {
  return (
    <div className="timing-thead">
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#5E7038' }} />
        High
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#9E5040' }} />
        Low
      </span>
    </div>
  );
}

const STEERS = [
  { name: 'Str Calves 300–400#', levels: [3,4,5,4,3,2,1,1,1,2,3,3], sell: 'Mar', buy: 'Sep', now: 'Now 95 · near low', nowClass: 'timing-now-lo' },
  { name: 'Str Calves 500–600#', levels: [3,4,5,5,4,3,2,1,1,2,3,3], sell: 'Mar', buy: 'Sep', now: 'Now 95 · near low', nowClass: 'timing-now-lo' },
  { name: 'Fdr Steers 600–700#', levels: [3,3,4,5,4,3,2,1,1,2,3,3], sell: 'Apr', buy: 'Sep', now: 'Now 99' },
  { name: 'Fdr Steers 700–800#', levels: [3,3,4,5,5,3,2,1,1,2,3,3], sell: 'Apr', buy: 'Sep', now: 'Now 100' },
];

const HEIFERS = [
  { name: 'Hfr Calves 300–400#', levels: [3,4,5,4,3,2,1,1,1,2,3,3], sell: 'Mar', buy: 'Sep', now: 'Now 98' },
  { name: 'Hfr Calves 400–500#', levels: [3,4,5,4,3,2,1,1,1,2,3,3], sell: 'Mar', buy: 'Jul', now: 'Now 95 · near low', nowClass: 'timing-now-lo' },
];

const SHEEP = [
  { name: 'Fdr Lambs 60–90#', levels: [2,2,1,1,1,1,2,3,4,5,4,3], sell: 'Oct', buy: 'Jun', now: 'Now 97 · near low', nowClass: 'timing-now-lo' },
  { name: 'Slaughter Lambs', levels: [3,3,4,4,5,4,3,2,1,1,2,3], sell: 'May', buy: 'Oct', now: 'Now 101' },
  { name: 'Cull Ewes', levels: [2,3,4,5,5,5,4,3,2,1,1,1], sell: 'Jun', buy: 'Dec', now: 'Now 107 · near peak', nowClass: 'timing-now-hi' },
];

export default function SellPanel() {
  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Sell Timing</div>

      <div className="timing-cat">
        <span className="timing-cat-label">Steers</span>
      </div>
      <div className="timing-table">
        <TimingLegend />
        {STEERS.map((r) => <TimingRow key={r.name} {...r} />)}
      </div>

      <div className="timing-cat">
        <span className="timing-cat-label">Heifers</span>
      </div>
      <div className="timing-table">
        <TimingLegend />
        {HEIFERS.map((r) => <TimingRow key={r.name} {...r} />)}
      </div>

      <div className="timing-cat">
        <span className="timing-cat-label">Sheep</span>
      </div>
      <div className="timing-table">
        <TimingLegend />
        {SHEEP.map((r) => <TimingRow key={r.name} {...r} />)}
      </div>

      <p className="timing-disc">
        Seasonal indices are directional multi-year averages, not a forecast — basis, weather, and CME futures move the actual number.
      </p>

      <div className="tile-dark card" style={{ padding: 20, marginTop: 4, borderColor: 'var(--nav-line)' }}>
        <div style={{ font: '600 16px/1.3 var(--serif)', color: '#F6F2EA' }}>
          Analyze my herds against the seasonal window
        </div>
        <div style={{ font: '400 15px/1.4 var(--sans)', color: 'var(--nav-text)', marginTop: 6 }}>
          Projects each herd's weight class and timing against the seasonal index and your breakeven.
        </div>
        <button className="act-btn" style={{ marginTop: 12, background: 'var(--accent)', color: '#F6F2EA', width: '100%', justifyContent: 'center' }}>
          Analyze my herds
        </button>
      </div>
    </section>
  );
}
