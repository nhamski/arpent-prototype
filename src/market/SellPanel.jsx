import { useState, useMemo, useEffect } from 'react';
import { timingFor, standingLabel, MON, MONTHS } from '../engine/sellTiming.js';
import { liveFor, liveSheepFor, signalLabel } from '../engine/liveSignal.js';
import SeasonBars from '../components/SeasonBars.jsx';
import PriceBars from '../components/PriceBars.jsx';

let sellTimingData = null;
let kansasLive = null;
let sheepLive = null;
let colbyLambs = null;

function tryImport() {
  const jobs = [];
  if (!sellTimingData) jobs.push(import('../data/sell-timing.json').then(m => { sellTimingData = m.default; }).catch(() => {}));
  if (!kansasLive) jobs.push(import('../data/live/kansas-latest.json').then(m => { kansasLive = m.default; }).catch(() => {}));
  if (!sheepLive) jobs.push(import('../data/live/sheep-latest.json').then(m => { sheepLive = m.default; }).catch(() => {}));
  if (!colbyLambs) jobs.push(import('../data/colby/latest-lambs.json').then(m => { colbyLambs = m.default; }).catch(() => {}));
  return Promise.all(jobs);
}

const rng = (a, b) => (Math.abs(a - b) < 0.05 ? a.toFixed(1) : `${a.toFixed(1)}–${b.toFixed(1)}`);
const money = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtWeek = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${MONTHS[+m - 1].slice(0, 3)} ${+d}, ${y}`; };

export default function SellPanel() {
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [expanded, setExpanded] = useState(null);
  const [loaded, setLoaded] = useState(!!sellTimingData);

  useEffect(() => {
    if (!loaded) tryImport().then(() => setLoaded(true));
  }, [loaded]);

  const data = sellTimingData;

  const timing = useMemo(() => {
    if (!data) return null;
    try { return timingFor(data, month); }
    catch { return null; }
  }, [data, month]);

  const toggle = (key) => setExpanded((prev) => prev === key ? null : key);
  const thisMonth = month === new Date().getMonth() + 1;

  if (!timing) {
    return (
      <section className="screen on">
        <div className="sh" style={{ marginTop: 0 }}>Sell Timing</div>
        <p style={{ font: '400 15px/1.4 var(--sans)', color: 'var(--ink2)' }}>
          {loaded ? 'Unable to compute timing data.' : 'Loading sell timing data…'}
        </p>
      </section>
    );
  }

  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Sell Timing</div>

      <div className="card" style={{ padding: '16px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
          Seasonal High · {timing.monthName}{thisMonth ? ' · this month' : ''}
        </div>
        {timing.atHigh.length ? (
          <>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 700, lineHeight: 1.1, color: 'var(--accent)', margin: '4px 0 6px' }}>
              {timing.atHigh.length === 1 ? '1 class' : `${timing.atHigh.length} classes`}
            </div>
            <div style={{ fontSize: 15, color: 'var(--ink2)', lineHeight: 1.4 }}>
              {timing.atHigh.map((c) => c.label).join(' · ')}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 600, lineHeight: 1.1, color: 'var(--ink3)', margin: '4px 0 6px' }}>
              Nothing at a high
            </div>
            <div style={{ fontSize: 15, color: 'var(--ink2)', lineHeight: 1.4 }}>
              {timing.atLow.length
                ? `${timing.atLow.map((c) => c.label).join(' · ')} at a Seasonal Low.`
                : 'No class is at its agreed high or low this month.'}
            </div>
          </>
        )}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 13, color: 'var(--ink3)', fontVariantNumeric: 'tabular-nums' }}>
          {timing.seriesCount} series · {timing.regionCount} regions{timing.sourcesUsed?.length ? ` · ${timing.sourcesUsed.length} publications` : ''}
        </div>
      </div>

      <div className="field" style={{ marginBottom: 16, maxWidth: 200 }}>
        <label>Month</label>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: '100%', fontSize: 16, padding: '8px 10px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8, minHeight: 44 }}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>

      <Group title="Steers" rows={timing.steers} month={timing.monthName} monthNum={month} data={data} open={expanded} setOpen={setExpanded} />
      <Group title="Heifers" rows={timing.heifers} month={timing.monthName} monthNum={month} data={data} open={expanded} setOpen={setExpanded} />
      <Group title="Sheep" rows={timing.sheep} month={timing.monthName} monthNum={month} data={data} open={expanded} setOpen={setExpanded}>
        {colbyLambs && <ColbyLambs lambs={colbyLambs} />}
      </Group>

      {timing.notCovered?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="sh">Not covered yet</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {timing.notCovered.map((g) => (
              <div key={g.label} style={{ border: '1px dashed var(--line)', borderRadius: 8, padding: '10px 12px', background: 'var(--card)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink2)' }}>{g.label}</div>
                <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 2, lineHeight: 1.45 }}>{g.why}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {timing.sourcesUsed?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="sh">Where these come from</div>
          {timing.sourcesUsed.filter(Boolean).map((src) => (
            <p key={src.label || src.id} style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 12, lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--ink2)' }}>{src.label || src.name}</strong> · {src.region} · {src.period}<br />
              {src.basis} {src.method}
              {src.caveat && <><br /><em style={{ color: 'var(--ink3)' }}>{src.caveat}</em></>}
            </p>
          ))}
        </div>
      )}

      <p style={{ fontSize: 13, color: 'var(--ink2)', marginTop: 18, lineHeight: 1.55 }}>
        The seasonal figures are the long-run shape of the year. The <strong>Live</strong> boxes on each
        class show this week's actual USDA auction price and whether it's running above or below what
        the season predicts. Sources are never averaged together: regions peak in different months, and a mean
        would flatten the real pattern.
      </p>
      <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 16, lineHeight: 1.5 }}>
        Informational only. Presents figures and hypotheticals; does not advise transactions.
      </p>
    </section>
  );
}

function Group({ title, rows, month, monthNum, data, open, setOpen, children }) {
  if (!rows.length && !children) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <div className="sh">{title}</div>
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((c) => (
          <Row key={c.key} c={c} month={month} monthNum={monthNum} data={data} open={open === c.key} onToggle={() => setOpen(open === c.key ? null : c.key)} />
        ))}
        {children}
      </div>
    </div>
  );
}

function Row({ c, month, monthNum, data, open, onToggle }) {
  const k = c.consensus;
  const noPattern = !k.high.agreed;
  const sig = c.species === 'cattle' && kansasLive ? liveFor(kansasLive, data, c.sex, c.weightClass, monthNum) : null;
  const lambSigs = c.species === 'sheep' && sheepLive ? liveSheepFor(sheepLive, data, monthNum) : [];

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{c.weightClass}</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            {k.count} series · {k.regions.length} region{k.regions.length > 1 ? 's' : ''}
          </div>
        </div>
        <StandingPill standing={c.standing} lowConfidence={k.lowConfidence} noPattern={noPattern} reason={k.reason} />
      </div>

      {k.lowConfidence ? (
        <div style={styles.warn}>
          Shape only — the source states its own figures are too variable to plan on.
          It reads highest in {k.high.name}, in line with spring lambing and Easter demand.
        </div>
      ) : k.reason === 'single-source' ? (
        <div style={styles.warn}>
          Only {k.regions[0]} publishes this class, so there's nothing to check it against.
          That one series reads highest in {k.high.name} and lowest in {k.low.name}.
          Treat it as a hint, not a pattern.
        </div>
      ) : noPattern ? (
        <div style={styles.warn}>
          No dependable pattern. The {k.high.of} series peak in {k.high.months.length} different months,
          with no window a majority can agree on, each moving only {k.swing.min.toFixed(1)}–{k.swing.max.toFixed(1)} points.
          Don't time this class on season alone.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginTop: 12 }}>
            <Fact label="Seasonal High" value={k.high.name} note={`${k.high.count} of ${k.high.of} agree${k.highRange ? ` · ${rng(k.highRange.min, k.highRange.max)}` : ''}`} />
            <Fact label="Seasonal Low" value={k.low.agreed ? k.low.name : 'they differ'} note={k.low.agreed ? `${k.low.count} of ${k.low.of} agree` : `${k.low.months.length} different months`} />
            <Fact label={`In ${month}`} value={rng(k.thisMonth.min, k.thisMonth.max)} note={`${k.thisMonth.aboveAverage} of ${k.count} above avg`} />
          </div>
          {k.dualPeak && (
            <div style={styles.warn}>
              Peaks twice. {k.high.count} of {k.high.of} series peak in {k.high.name}, but {k.high.second.count} more
              peak around {k.high.second.name} — this class has two seasons rather than one high.
            </div>
          )}
        </>
      )}

      {lambSigs.length > 0 && (
        <div style={styles.live}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={styles.liveTag}>Live · regional lambs</span>
            <span style={{ fontSize: 11, color: 'var(--ink3)' }}>this week</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 10, marginTop: 8 }}>
            {lambSigs.map((g) => (
              <div key={g.region}>
                <div style={{ fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink3)' }}>{g.region.replace(/, [A-Z]{2}$/, '')}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums lining-nums', marginTop: 2 }}>
                  {money(g.current)}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink3)' }}>/cwt</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 1, color: g.direction === 'above' ? 'var(--ok)' : g.direction === 'below' ? 'var(--bad)' : 'var(--ink3)' }}>
                  {g.direction === 'inline' ? 'in line' : `${g.deviationPct > 0 ? '+' : ''}${g.deviationPct}% vs season`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sig && (
        <div style={styles.live}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={styles.liveTag}>Live · Kansas</span>
            <span style={{ fontSize: 11, color: 'var(--ink3)', fontVariantNumeric: 'tabular-nums' }}>wk of {fmtWeek(sig.weekEnding)}</span>
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums lining-nums', marginTop: 2 }}>
            {money(sig.current)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink3)' }}>/cwt</span>
          </div>
          <div style={{ fontSize: 13, marginTop: 1, color: sig.direction === 'above' ? 'var(--ok)' : sig.direction === 'below' ? 'var(--bad)' : 'var(--ink2)' }}>
            {signalLabel(sig)}
          </div>
        </div>
      )}

      <button
        onClick={onToggle}
        style={{ marginTop: 12, minHeight: 44, width: '100%', fontSize: 15, fontFamily: 'var(--sans)', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink2)', cursor: 'pointer' }}
        aria-expanded={open}
      >
        {open ? 'Hide' : 'Show'} the {k.count} series
      </button>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: 11, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 10 }}>
            Seasonal price index (Jan → Dec) · 100 = each series' own yearly average
          </div>
          {c.series.map((x) => (
            <div key={x.id || x.region + x.source} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)', overflowX: 'auto' }}>
              <div style={{ minWidth: 80, flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{x.region}</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)', fontVariantNumeric: 'tabular-nums' }}>{x.sourceInfo?.period}</div>
              </div>
              <SeasonBars index={x.index} month={monthNum} window={k.high.win} compact />
              <div style={{ minWidth: 40, flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontVariantNumeric: 'tabular-nums lining-nums', fontWeight: 600, fontSize: 13 }}>{x.valueThisMonth.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{month.slice?.(0, 3) || MON[monthNum - 1]}</div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 10, lineHeight: 1.5 }}>
            Bars are each series' own range — height is shape, color is level against its yearly
            average.{k.high.agreed ? ` The shaded band is the agreed ${k.high.name} high.` : ''}
          </div>
        </div>
      )}
    </div>
  );
}

function ColbyLambs({ lambs }) {
  const fmtWk = fmtWeek(lambs.weekEnding);
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>Colby · your barn</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>lambs, $/cwt · wk of {fmtWk}</div>
        </div>
        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', background: 'var(--line)', color: 'var(--ink3)' }}>Local</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: 10, marginTop: 12 }}>
        {lambs.lambs.map((l) => (
          <div key={l.weight}>
            <div style={{ fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink3)' }}>{l.weight}</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums lining-nums', marginTop: 2 }}>{money(l.mid)}</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>{money(l.low)}–{money(l.high)}</div>
            {l.yearAgoMid != null && (
              <div style={{ marginTop: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 11, color: 'var(--ink3)', fontVariantNumeric: 'tabular-nums' }}>last yr {money(l.yearAgoMid)}</span>
                {l.changePct != null && <Chg pct={l.changePct} />}
              </div>
            )}
          </div>
        ))}
      </div>

      {(lambs.ewes || lambs.rams) && (
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13, color: 'var(--ink2)', fontVariantNumeric: 'tabular-nums' }}>
          {lambs.ewes && <span>Ewes {money(lambs.ewes.mid)}{lambs.ewes.changePct != null && <Chg pct={lambs.ewes.changePct} />}</span>}
          {lambs.rams && <span>Rams {money(lambs.rams.mid)}{lambs.rams.changePct != null && <Chg pct={lambs.rams.changePct} />}</span>}
        </div>
      )}

      {lambs.slaughter12mo && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: 11, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
            Slaughter lambs ({lambs.slaughter12mo.weight}) · last 12 months
          </div>
          <PriceBars months={lambs.slaughter12mo.months} />
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 10, lineHeight: 1.5 }}>
        This week's mid, with last year ({fmtWeek(lambs.yearAgoTarget)}) and the change. Your local barn,
        not USDA-reported — so it's not in the seasonal series above, but it's the number that matters at Colby.
      </div>
    </div>
  );
}

function Fact({ label, value, note }) {
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink3)' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums lining-nums', marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--ink3)', fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>{note}</div>
    </div>
  );
}

function StandingPill({ standing, lowConfidence, noPattern, reason }) {
  if (lowConfidence) return <span className="pill pill-muted">Low confidence</span>;
  if (reason === 'single-source') return <span className="pill pill-muted">One source</span>;
  if (noPattern) return <span className="pill pill-muted">No pattern</span>;
  const cls = standing === 'high' ? 'pill-ok' : standing === 'low' ? 'pill-bad' : 'pill-muted';
  return <span className={`pill ${cls}`}>{standingLabel(standing)}</span>;
}

function Chg({ pct }) {
  const up = pct > 0;
  const flat = pct === 0;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginLeft: 4, color: flat ? 'var(--ink3)' : up ? 'var(--ok)' : 'var(--bad)' }}>
      {up ? '▲' : flat ? '' : '▼'} {up ? '+' : ''}{pct}%
    </span>
  );
}

const styles = {
  warn: { marginTop: 10, fontSize: 13, color: 'var(--ink2)', lineHeight: 1.5, borderLeft: '2px solid var(--line)', paddingLeft: 10 },
  live: { marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--line)' },
  liveTag: { fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--accent)' },
};
