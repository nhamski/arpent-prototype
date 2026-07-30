import { useState, useMemo } from 'react';
import { evaluate, verdict as bidVerdict } from '../engine/maxBid.js';
import { makeLot, saleTotals, budgetState, lotMargin, underCeiling } from '../engine/sale.js';
import { useStore } from '../hooks/useStore.js';
import { useStoredState } from '../hooks/useStoredState.js';

const DEFAULT_SETUPS = [
  {
    id: 'default-steers', name: 'Steer calves', species: 'cattle',
    BW: 486, SW: 750, CoG: 0.85, days: 180, deathLoss: 1.5, shrink: 3, apr: 7,
    SP: 192, targetMargin: 50, gainSource: 'feed',
  },
  {
    id: 'default-lambs', name: 'Feeder lambs', species: 'sheep',
    BW: 70, SW: 130, CoG: 0.60, days: 120, deathLoss: 2, shrink: 3, apr: 7,
    SP: 160, targetMargin: 15, gainSource: 'grass',
  },
];

const BARNS = [
  { name: 'Colby Livestock', dist: '42 mi', distClass: 'pill-accent', meta1: 'Saturday sales · Cattle, sheep, & goats', meta2: 'Colby, KS' },
  { name: 'Pratt Livestock', dist: '62 mi', distClass: 'pill-muted', meta1: 'Tuesday sales · Cattle & sheep', meta2: 'Pratt, KS' },
  { name: 'Dodge City Commission', dist: '84 mi', distClass: 'pill-muted', meta1: 'Friday sales · Cattle only', meta2: 'Dodge City, KS' },
  { name: 'Salina Livestock Exchange', dist: '98 mi', distClass: 'pill-muted', meta1: 'Thursday sales · Cattle & sheep', meta2: 'Salina, KS' },
];

function setupToInputs(s) {
  return {
    group: { BW: s.BW, SW: s.SW, N: 1 },
    tract: { acres: 80, stockingRate: 3, rateUnit: 'head/acre', labor: 2000, equipment: 1500, rentLoan: 3000, seedPerAcre: 0 },
    growOut: { CoG: s.CoG, days: s.days, deathLoss: s.deathLoss, shrink: s.shrink, apr: s.apr, gainSource: s.gainSource || 'feed' },
    sale: { SP: s.SP },
    costs: {
      buy: { commission: 25, freight: 15, yardage: 5, vet: 10 },
      sell: { commission: 25, freight: 15, yardage: 5, vet: 5 },
    },
  };
}

const num = (v) => { const n = parseFloat(String(v).replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
const fmt = (n) => n != null && Number.isFinite(n) ? `$${Math.round(n).toLocaleString()}` : '—';
const fmtCwt = (n) => n != null && Number.isFinite(n) ? `$${n.toFixed(2)}` : '—';

export default function AuctionPanel({ zip, onZipChange }) {
  const [setups, setSetups] = useStoredState('arpent.bidSetups', DEFAULT_SETUPS);
  const [activeSetup, setActiveSetup] = useStoredState('arpent.activeSetup', 0);
  const { items: lots, add: addLot, remove: removeLot, clear: clearLots } = useStore('arpent.lots');
  const [budget, setBudget] = useStoredState('arpent.budget', 50000);
  const [currentBid, setCurrentBid] = useState(168);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [draft, setDraft] = useState({ lotNo: '', head: 1, weight: 0, priceCwt: 0 });
  const [setupDraft, setSetupDraft] = useState(null);

  const setup = setups[activeSetup] || setups[0] || DEFAULT_SETUPS[0];

  const result = useMemo(() => {
    try {
      const inputs = setupToInputs(setup);
      const target = { type: 'flat', value: setup.targetMargin };
      const bidPerCwt = currentBid;
      const bidPerHead = bidPerCwt * (setup.BW / 100);
      return evaluate(inputs, target, bidPerHead);
    } catch { return null; }
  }, [setup, currentBid]);

  const budgetInfo = useMemo(() => budgetState(lots, budget), [lots, budget]);
  const totals = useMemo(() => saleTotals(lots), [lots]);

  const startNewSetup = () => {
    setSetupDraft({
      name: '', species: 'cattle', BW: 500, SW: 750, CoG: 0.85, days: 180,
      deathLoss: 1.5, shrink: 3, apr: 7, SP: 192, targetMargin: 50, gainSource: 'feed',
    });
    setShowSetupForm(true);
  };

  const saveSetup = () => {
    if (!setupDraft?.name?.trim()) return;
    const newSetup = { ...setupDraft, id: `setup-${Date.now()}` };
    setSetups((prev) => [...prev, newSetup]);
    setActiveSetup(setups.length);
    setShowSetupForm(false);
    setSetupDraft(null);
  };

  const logPurchase = () => {
    if (!draft.head || !draft.priceCwt) return;
    const pricePerHead = draft.priceCwt * ((draft.weight || setup.BW) / 100);
    const lot = makeLot({
      lotNo: draft.lotNo,
      head: draft.head,
      className: setup.name,
      species: setup.species,
      weight: draft.weight || setup.BW,
      pricePerHead,
      ceiling: result?.maxBidPerHead ?? null,
      setupName: setup.name,
    }, Date.now());
    addLot(lot);
    setDraft({ lotNo: '', head: 1, weight: 0, priceCwt: 0 });
    setShowLogForm(false);
  };

  const setupField = (label, key, type = 'number') => (
    <div className="field" style={{ margin: '0 0 6px' }}>
      <label>{label}</label>
      <input type={type} value={setupDraft?.[key] ?? ''} onChange={(e) => setSetupDraft((p) => ({ ...p, [key]: type === 'number' ? num(e.target.value) : e.target.value }))} />
    </div>
  );

  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Nearby Sale Barns</div>
      <div className="field" style={{ marginBottom: 16 }}>
        <label>Your ZIP Code</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={zip || ''}
          onChange={(e) => onZipChange?.(e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder="Enter ZIP to find closest barns"
          style={{ fontSize: 18 }}
        />
      </div>
      <p style={{ font: '400 15px/1.4 var(--sans)', color: 'var(--ink2)', marginBottom: 16 }}>
        Within 100 miles of {zip || '—'}
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
        <div className="hero-value">{fmt(result?.maxBidPerHead)}<span className="unit">/head</span></div>
        <div className="hero-sub">{fmtCwt(result?.maxBidPerCwt)}/cwt on {setup.BW} lb {setup.name.toLowerCase()}</div>
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        {setups.map((s, i) => (
          <button key={s.id} className={`filt ${activeSetup === i ? 'on' : ''}`} onClick={() => setActiveSetup(i)}>
            {s.name}
          </button>
        ))}
        <button className="filt" onClick={startNewSetup}>+ Setup</button>
      </div>

      {showSetupForm && setupDraft && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div className="card-title">New Bid Setup</div>
          {setupField('Name', 'name', 'text')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {setupField('Buy Weight (lb)', 'BW')}
            {setupField('Sale Weight (lb)', 'SW')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {setupField('Cost of Gain ($/lb)', 'CoG')}
            {setupField('Days Held', 'days')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {setupField('Sale Price ($/cwt)', 'SP')}
            {setupField('Target Margin ($)', 'targetMargin')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {setupField('Death Loss (%)', 'deathLoss')}
            {setupField('Shrink (%)', 'shrink')}
          </div>
          <div className="field" style={{ margin: '0 0 6px' }}>
            <label>Gain Source</label>
            <select
              value={setupDraft.gainSource}
              onChange={(e) => setSetupDraft((p) => ({ ...p, gainSource: e.target.value }))}
              style={{ width: '100%', fontSize: 16, padding: '8px 10px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}
            >
              <option value="feed">Feed (cost of gain applies)</option>
              <option value="grass">Grass (no feed cost)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="act-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={saveSetup}>Save Setup</button>
            <button className="act-btn outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowSetupForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Current Bid</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <input
              type="text"
              inputMode="decimal"
              value={currentBid}
              onChange={(e) => setCurrentBid(num(e.target.value))}
              style={{ fontSize: 20, fontWeight: 600, textAlign: 'center' }}
            />
          </div>
          <span style={{ font: '400 14px/1 var(--sans)', color: 'var(--ink2)' }}>$/cwt</span>
        </div>
      </div>

      {result && (
        <>
          <div style={{ textAlign: 'center', margin: '16px 0' }}>
            <div className={`verdict ${result.bid.verdict === 'BID' ? 'verdict-bid' : 'verdict-pass'}`}>
              {result.bid.verdict}
            </div>
          </div>

          <div className="stat-row">
            <div className="stat">
              <div className="sl">Margin</div>
              <div className="sv" style={{ color: result.bid.profitPerHead >= 0 ? 'var(--ok)' : 'var(--bad)' }}>
                {result.bid.profitPerHead >= 0 ? '+' : ''}{fmt(result.bid.profitPerHead)}/hd
              </div>
            </div>
            <div className="stat">
              <div className="sl">Breakeven</div>
              <div className="sv">{fmtCwt(result.breakevenPerCwt)}<span style={{ fontSize: 12, fontWeight: 400 }}>/cwt</span></div>
            </div>
            <div className="stat">
              <div className="sl">Gain Source</div>
              <div className="sv" style={{ fontSize: 15 }}>{result.gainSource === 'grass' ? 'Grass' : 'Feed'}</div>
            </div>
          </div>
        </>
      )}

      {!showLogForm ? (
        <button
          className="act-btn"
          style={{ width: '100%', justifyContent: 'center', marginTop: 16, background: 'var(--ok-fill)' }}
          onClick={() => setShowLogForm(true)}
        >
          Bought It — Log Purchase
        </button>
      ) : (
        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <div className="card-title">Log Purchase</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div className="field" style={{ margin: '0 0 6px' }}>
              <label>Lot #</label>
              <input type="text" value={draft.lotNo} onChange={(e) => setDraft((p) => ({ ...p, lotNo: e.target.value }))} />
            </div>
            <div className="field" style={{ margin: '0 0 6px' }}>
              <label>Head</label>
              <input type="number" min="1" value={draft.head} onChange={(e) => setDraft((p) => ({ ...p, head: num(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div className="field" style={{ margin: '0 0 6px' }}>
              <label>Weight (lb)</label>
              <input type="number" placeholder={String(setup.BW)} value={draft.weight || ''} onChange={(e) => setDraft((p) => ({ ...p, weight: num(e.target.value) }))} />
            </div>
            <div className="field" style={{ margin: '0 0 6px' }}>
              <label>Price ($/cwt)</label>
              <input type="number" value={draft.priceCwt || ''} onChange={(e) => setDraft((p) => ({ ...p, priceCwt: num(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="act-btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--ok-fill)' }} onClick={logPurchase}>Add Lot</button>
            <button className="act-btn outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowLogForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {lots.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid var(--line)', margin: '24px 0 0' }} />
          <div className="sh">Today's Purchases</div>

          {budgetInfo && (
            <div className="budget">
              <div className="budget-header">
                <span className="budget-label">Budget</span>
                <span className="budget-val">{fmt(budget)}</span>
              </div>
              <div className="budget-bar">
                <div className="budget-fill" style={{ width: `${Math.min(budgetInfo.usedPct, 100)}%`, background: budgetInfo.over ? 'var(--bad)' : undefined }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ font: '400 14px/1 var(--sans)', color: 'var(--ink2)' }}>Spent: {fmt(budgetInfo.spent)}</span>
                <span style={{ font: '600 14px/1 var(--sans)', color: budgetInfo.over ? 'var(--bad)' : 'var(--ok)' }}>
                  {budgetInfo.over ? 'OVER BUDGET' : `${fmt(budgetInfo.left)} left`}
                </span>
              </div>
            </div>
          )}

          <div className="field" style={{ marginBottom: 12 }}>
            <label>Budget ($)</label>
            <input type="number" value={budget} onChange={(e) => setBudget(num(e.target.value))} style={{ fontSize: 16 }} />
          </div>

          <div className="tiles" style={{ marginBottom: 16 }}>
            <div className="tile"><div className="tl">Head</div><div className="tv">{totals.head}</div></div>
            <div className="tile"><div className="tl">Lots</div><div className="tv">{totals.lots}</div></div>
            <div className="tile"><div className="tl">Avg $/head</div><div className="tv">{fmt(totals.avgPerHead)}</div></div>
            <div className="tile">
              <div className="tl">Under Ceiling</div>
              <div className="tv" style={{ color: totals.overCeiling > 0 ? 'var(--bad)' : 'var(--ok)' }}>
                {totals.lots - totals.overCeiling}/{totals.lots}
              </div>
            </div>
          </div>

          {totals.overCeiling > 0 && (
            <div className="card" style={{ background: 'var(--warn-bg)', borderColor: 'transparent', marginBottom: 12 }}>
              <div style={{ font: '600 14px/1.3 var(--sans)', color: 'var(--warn)' }}>
                {totals.overCeiling} lot{totals.overCeiling > 1 ? 's' : ''} purchased over ceiling
              </div>
            </div>
          )}

          {lots.map((l) => {
            const margin = lotMargin(l);
            const under = underCeiling(l);
            return (
              <div key={l.id} className="lot-card">
                <div className="lot-head">
                  <span className="lot-num">{l.lotNo || 'Lot'}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {under != null && (
                      <span className={`pill ${under ? 'pill-ok' : 'pill-bad'}`}>{under ? 'Under' : 'Over'}</span>
                    )}
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 18, cursor: 'pointer', padding: '2px 6px' }}
                      onClick={() => removeLot(l.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="lot-detail">
                  {l.head} head · {l.className} · {l.weight} lb · {fmtCwt(l.weight > 0 ? l.pricePerHead / (l.weight / 100) : 0)}/cwt · {fmt(l.pricePerHead)}/head
                </div>
                {margin != null && (
                  <div className="lot-result" style={{ color: margin >= 0 ? 'var(--ok)' : 'var(--bad)' }}>
                    {margin >= 0 ? `$${Math.round(margin)}/head under ceiling` : `$${Math.round(Math.abs(margin))}/head OVER ceiling`} · Total: {fmt(l.pricePerHead * l.head)}
                  </div>
                )}
              </div>
            );
          })}

          <button
            className="act-btn outline"
            style={{ width: '100%', justifyContent: 'center', marginTop: 12, color: 'var(--bad)', borderColor: 'var(--bad)' }}
            onClick={clearLots}
          >
            Clear All Purchases
          </button>
        </>
      )}
    </section>
  );
}
