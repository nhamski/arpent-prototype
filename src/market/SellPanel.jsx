import { useState, useMemo } from 'react';
import { timingFor, standingLabel, MON, inWindow } from '../engine/sellTiming.js';
import { DEMO_DATA } from '../data/demoSeries.js';

const HM_LEVELS = { 1: 'hm-1', 2: 'hm-2', 3: 'hm-3', 4: 'hm-4', 5: 'hm-5' };

function indexToLevel(v) {
  if (v >= 110) return 5;
  if (v >= 104) return 4;
  if (v >= 97) return 3;
  if (v >= 91) return 2;
  return 1;
}

function Heatmap({ levels }) {
  return (
    <div className="timing-heatmap">
      {levels.map((l, i) => (
        <span key={i} className={`hm ${HM_LEVELS[l]}`} />
      ))}
    </div>
  );
}

function TimingRow({ cls, month, onExpand, expanded }) {
  const c = cls.consensus;
  const levels = cls.series[0]
    ? cls.series[0].index.map(indexToLevel)
    : Array(12).fill(3);

  const sellMonth = c.high.agreed ? c.high.name : '—';
  const buyMonth = c.low.agreed ? c.low.name : '—';

  const nowVal = c.thisMonth?.min;
  const label = standingLabel(cls.standing);
  const nowClass = cls.standing === 'low' ? 'timing-now-lo'
    : cls.standing === 'high' ? 'timing-now-hi' : '';

  return (
    <>
      <div className="timing-row" onClick={onExpand} style={{ cursor: 'pointer' }}>
        <div className="timing-row-name">{cls.label}</div>
        <div className="timing-row-data">
          <Heatmap levels={levels} />
          <div className="timing-signals">
            <span className="pill-sell">SELL &#x25B2; {sellMonth}</span>
            <span className="pill-buy">BUY &#x25BC; {buyMonth}</span>
            <span className={`timing-now ${nowClass}`}>
              Now {nowVal ?? '—'}{cls.standing === 'high' ? ' · near peak' : cls.standing === 'low' ? ' · near low' : ''}
            </span>
          </div>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '8px 12px 12px', background: 'var(--card)', borderRadius: '0 0 8px 8px', marginTop: -4, marginBottom: 8 }}>
          <div style={{ font: '600 13px/1.3 var(--sans)', color: 'var(--ink2)', marginBottom: 6 }}>
            {c.count} series · {c.regions?.join(', ')} · Standing: {label}
          </div>
          {c.high.agreed && (
            <div style={{ font: '400 13px/1.4 var(--sans)', color: 'var(--ink2)' }}>
              Seasonal high window: {c.high.name} ({c.high.count}/{c.high.of} sources agree)
              {c.dualPeak && c.high.second && ` · Secondary peak: ${c.high.second.name}`}
            </div>
          )}
          {c.low.agreed && (
            <div style={{ font: '400 13px/1.4 var(--sans)', color: 'var(--ink2)' }}>
              Seasonal low window: {c.low.name} ({c.low.count}/{c.low.of} sources agree)
            </div>
          )}
          {c.reason && (
            <div style={{ font: '400 13px/1.4 var(--sans)', color: 'var(--warn)', marginTop: 4 }}>
              {c.reason === 'single-source' ? 'Single source — less reliable' : 'Sources disagree on timing'}
            </div>
          )}
          <div style={{ font: '400 12px/1.3 var(--sans)', color: 'var(--ink3)', marginTop: 6 }}>
            Price swing: {c.swing?.min ?? '—'}–{c.swing?.max ?? '—'} index points
          </div>
          {cls.series.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ font: '600 12px/1.3 var(--sans)', color: 'var(--ink3)', marginBottom: 4 }}>Individual Series</div>
              {cls.series.map((s, i) => (
                <div key={i} style={{ font: '400 12px/1.3 var(--sans)', color: 'var(--ink2)', marginTop: 2 }}>
                  {s.region} ({s.source}) — Peak: {s.peak}, Low: {s.low}, Current: {s.valueThisMonth}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
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

export default function SellPanel() {
  const [expanded, setExpanded] = useState(null);

  const month = new Date().getMonth() + 1;

  const timing = useMemo(() => {
    try { return timingFor(DEMO_DATA, month); }
    catch { return null; }
  }, [month]);

  const toggle = (key) => setExpanded((prev) => prev === key ? null : key);

  if (!timing) {
    return (
      <section className="screen on">
        <div className="sh" style={{ marginTop: 0 }}>Sell Timing</div>
        <p style={{ font: '400 15px/1.4 var(--sans)', color: 'var(--ink2)' }}>Unable to compute timing data.</p>
      </section>
    );
  }

  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Sell Timing</div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {timing.atHigh.length > 0 && (
          <span className="pill pill-ok" style={{ fontSize: 13 }}>
            {timing.atHigh.length} class{timing.atHigh.length > 1 ? 'es' : ''} near seasonal high
          </span>
        )}
        {timing.atLow.length > 0 && (
          <span className="pill pill-bad" style={{ fontSize: 13 }}>
            {timing.atLow.length} class{timing.atLow.length > 1 ? 'es' : ''} near seasonal low
          </span>
        )}
        <span className="pill pill-muted" style={{ fontSize: 13 }}>
          {timing.seriesCount} series · {timing.regionCount} regions
        </span>
      </div>

      {timing.steers.length > 0 && (
        <>
          <div className="timing-cat">
            <span className="timing-cat-label">Steers</span>
          </div>
          <div className="timing-table">
            <TimingLegend />
            {timing.steers.map((cls) => (
              <TimingRow
                key={cls.key}
                cls={cls}
                month={month}
                expanded={expanded === cls.key}
                onExpand={() => toggle(cls.key)}
              />
            ))}
          </div>
        </>
      )}

      {timing.heifers.length > 0 && (
        <>
          <div className="timing-cat">
            <span className="timing-cat-label">Heifers</span>
          </div>
          <div className="timing-table">
            <TimingLegend />
            {timing.heifers.map((cls) => (
              <TimingRow
                key={cls.key}
                cls={cls}
                month={month}
                expanded={expanded === cls.key}
                onExpand={() => toggle(cls.key)}
              />
            ))}
          </div>
        </>
      )}

      {timing.sheep.length > 0 && (
        <>
          <div className="timing-cat">
            <span className="timing-cat-label">Sheep</span>
          </div>
          <div className="timing-table">
            <TimingLegend />
            {timing.sheep.map((cls) => (
              <TimingRow
                key={cls.key}
                cls={cls}
                month={month}
                expanded={expanded === cls.key}
                onExpand={() => toggle(cls.key)}
              />
            ))}
          </div>
        </>
      )}

      <p className="timing-disc">
        Seasonal indices are directional multi-year averages computed by consensus across {timing.regionCount} regions — not a forecast. Basis, weather, and CME futures move the actual number.
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
