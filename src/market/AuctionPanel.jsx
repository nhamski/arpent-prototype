import { useState } from 'react';

const BARNS = [
  { name: 'Colby Livestock', dist: '42 mi', distClass: 'pill-accent', meta1: 'Next sale: Aug 9 · Avg last month: $183/cwt', meta2: 'Saturday sales · Cattle, sheep, & goats' },
  { name: 'Pratt Livestock', dist: '62 mi', distClass: 'pill-muted', meta1: 'Next sale: Aug 12 · Avg last month: $188/cwt', meta2: 'Tuesday sales · Cattle & sheep' },
  { name: 'Dodge City Commission', dist: '84 mi', distClass: 'pill-muted', meta1: 'Next sale: Aug 8 · Avg last month: $185/cwt', meta2: 'Friday sales · Cattle only' },
  { name: 'Salina Livestock Exchange', dist: '98 mi', distClass: 'pill-muted', meta1: 'Next sale: Aug 14 · Avg last month: $191/cwt', meta2: 'Thursday sales · Cattle & sheep' },
];

const LOTS = [
  { num: 'Lot 47', head: 12, detail: '12 head · Steer calves · 486 lb · $174/cwt · $845/head', result: '$43/head under ceiling · Total: $10,140' },
  { num: 'Lot 52', head: 8, detail: '8 head · Heifer calves · 462 lb · $162/cwt · $748/head', result: '$12/head under ceiling · Total: $5,984' },
];

export default function AuctionPanel() {
  const [bidFilter, setBidFilter] = useState(0);
  const BID_FILTERS = ['Steer calves', 'Feeder lambs', '+ Setup'];

  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Nearby Sale Barns</div>
      <div className="field" style={{ marginBottom: 16 }}>
        <label>Your ZIP Code</label>
        <input
          type="text"
          inputMode="numeric"
          defaultValue="67646"
          placeholder="Enter ZIP to find closest barns"
          style={{ fontSize: 18 }}
          readOnly
        />
      </div>
      <p style={{ font: '400 15px/1.4 var(--sans)', color: 'var(--ink2)', marginBottom: 16 }}>
        Within 100 miles of Logan, KS
      </p>

      {BARNS.map((b) => (
        <div key={b.name} className="barn-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="barn-name">{b.name}</div>
            <span className={`pill ${b.distClass}`}>{b.dist}</span>
          </div>
          <div className="barn-meta">{b.meta1}</div>
          <div className="barn-meta">{b.meta2}</div>
        </div>
      ))}

      <div style={{ borderTop: '1px solid var(--line)', margin: '24px 0 0' }} />
      <div className="sh">Max Bid</div>

      <div className="hero-card">
        <div className="hero-label">Maximum Bid</div>
        <div className="hero-value">$847<span className="unit">/head</span></div>
        <div className="hero-sub">$174.23/cwt on 486 lb calves</div>
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        {BID_FILTERS.map((f, i) => (
          <button key={f} className={`filt ${bidFilter === i ? 'on' : ''}`} onClick={() => setBidFilter(i)}>
            {f}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Current Bid</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <input
              type="text"
              inputMode="decimal"
              defaultValue="168"
              style={{ fontSize: 20, fontWeight: 600, textAlign: 'center' }}
              readOnly
            />
          </div>
          <span style={{ font: '400 14px/1 var(--sans)', color: 'var(--ink2)' }}>$/cwt</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', margin: '16px 0' }}>
        <div className="verdict verdict-bid">BID</div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="sl">Margin</div>
          <div className="sv" style={{ color: 'var(--ok)' }}>+$29/hd</div>
        </div>
        <div className="stat">
          <div className="sl">On 20 head</div>
          <div className="sv" style={{ color: 'var(--ok)' }}>+$584</div>
        </div>
        <div className="stat">
          <div className="sl">ROI</div>
          <div className="sv">3.5%</div>
        </div>
      </div>

      <button
        className="act-btn"
        style={{ width: '100%', justifyContent: 'center', marginTop: 16, background: 'var(--ok-fill)' }}
      >
        Bought It — Log Purchase
      </button>

      <div style={{ borderTop: '1px solid var(--line)', margin: '24px 0 0' }} />
      <div className="sh">Today's Purchases</div>

      <div className="budget">
        <div className="budget-header">
          <span className="budget-label">Budget</span>
          <span className="budget-val">$50,000</span>
        </div>
        <div className="budget-bar">
          <div className="budget-fill" style={{ width: '77%' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ font: '400 14px/1 var(--sans)', color: 'var(--ink2)' }}>Spent: $38,640</span>
          <span style={{ font: '600 14px/1 var(--sans)', color: 'var(--ok)' }}>$11,360 left</span>
        </div>
      </div>

      <div className="tiles" style={{ marginBottom: 16 }}>
        <div className="tile"><div className="tl">Head</div><div className="tv">20</div></div>
        <div className="tile"><div className="tl">Lots</div><div className="tv">2</div></div>
        <div className="tile"><div className="tl">Avg $/head</div><div className="tv">$1,932</div></div>
        <div className="tile"><div className="tl">Under Ceiling</div><div className="tv" style={{ color: 'var(--ok)' }}>2/2</div></div>
      </div>

      {LOTS.map((l) => (
        <div key={l.num} className="lot-card">
          <div className="lot-head">
            <span className="lot-num">{l.num}</span>
            <span className="pill pill-ok">Under</span>
          </div>
          <div className="lot-detail">{l.detail}</div>
          <div className="lot-result" style={{ color: 'var(--ok)' }}>{l.result}</div>
        </div>
      ))}
    </section>
  );
}
