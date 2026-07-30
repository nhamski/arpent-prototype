import { useMemo } from 'react';
import { useStoredState } from '../hooks/useStoredState.js';
import { DEFAULT_COSTS } from '../data/defaults.js';

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;

export default function CostsPanel() {
  const [costs, setCosts] = useStoredState('arpent.costs', DEFAULT_COSTS);
  const [headCount, setHeadCount] = useStoredState('arpent.headCount', 281);
  const [marketPrice, setMarketPrice] = useStoredState('arpent.marketPrice', 192);

  const monthly = useMemo(() => costs.reduce((a, c) => a + (c.val || 0), 0), [costs]);
  const daily = headCount > 0 ? monthly / 30 / headCount : 0;
  const yearly = monthly * 12;
  const monthlyPerHead = headCount > 0 ? monthly / headCount : 0;

  const breakeven = useMemo(() => {
    if (headCount <= 0) return 0;
    const annualPerHead = yearly / headCount;
    return Math.round(annualPerHead / 7.5 * 100) / 100;
  }, [yearly, headCount]);

  const updateCost = (id, val) => {
    setCosts((prev) => prev.map((c) => c.id === id ? { ...c, val: parseFloat(val) || 0 } : c));
  };

  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Cost of Ownership</div>

      <div className="tile-dark card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="tl" style={{ color: 'var(--nav-muted)', marginBottom: 8 }}>Daily Cost Per Head</div>
        <div style={{ font: '600 36px/1 var(--serif)', color: '#F6F2EA' }}>${daily.toFixed(2)}</div>
        <div style={{ font: '400 15px/1 var(--sans)', color: 'var(--nav-text)', marginTop: 6 }}>
          ${monthlyPerHead.toFixed(2)}/month · ${fmt(yearly / (headCount || 1))}/year
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Total Head</label>
          <input type="number" min="1" value={headCount} onChange={(e) => setHeadCount(parseInt(e.target.value) || 1)} style={{ fontSize: 16 }} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Market ($/cwt)</label>
          <input type="number" min="0" value={marketPrice} onChange={(e) => setMarketPrice(parseFloat(e.target.value) || 0)} style={{ fontSize: 16 }} />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Monthly Costs</div>
        {costs.map((c) => (
          <div key={c.id} className="cost-row" style={{ alignItems: 'center' }}>
            <span className="cost-label">{c.label}</span>
            <input
              type="number"
              min="0"
              value={c.val}
              onChange={(e) => updateCost(c.id, e.target.value)}
              style={{
                width: 90, textAlign: 'right', fontSize: 15, fontWeight: 600,
                background: 'transparent', border: '1px solid var(--line)', borderRadius: 6,
                padding: '4px 8px', color: 'var(--ink)',
              }}
            />
          </div>
        ))}
        <div className="cost-row" style={{ borderTop: '2px solid var(--line)', fontWeight: 700 }}>
          <span className="cost-label" style={{ color: 'var(--ink)', fontWeight: 700 }}>Total</span>
          <span className="cost-val">{fmt(monthly)}</span>
        </div>
      </div>

      <div className="tiles" style={{ marginTop: 16 }}>
        <div className="tile">
          <div className="tl">Breakeven</div>
          <div className="tv">${breakeven}</div>
          <div className="ts">per cwt</div>
        </div>
        <div className="tile">
          <div className="tl">Market</div>
          <div className="tv" style={{ color: marketPrice >= breakeven ? 'var(--ok)' : 'var(--bad)' }}>${marketPrice}</div>
          <div className="ts">per cwt</div>
        </div>
      </div>

      {marketPrice > 0 && breakeven > 0 && (
        <div className="card" style={{ marginTop: 12, textAlign: 'center' }}>
          <span style={{ font: '600 16px/1 var(--sans)', color: marketPrice >= breakeven ? 'var(--ok)' : 'var(--bad)' }}>
            {marketPrice >= breakeven
              ? `+$${(marketPrice - breakeven).toFixed(0)} margin per cwt`
              : `$${(breakeven - marketPrice).toFixed(0)} below breakeven`}
          </span>
        </div>
      )}
    </section>
  );
}
