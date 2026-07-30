import { useState, useMemo } from 'react';
import { planRotation, seasonFromMonth } from '../engine/rotation.js';
import { buildBuyCullReport } from '../engine/buyCull.js';
import { SPECIES_CATALOG } from '../engine/species.js';

const num = (v) => { const n = parseFloat(String(v).replace(/,/g, '')); return Number.isFinite(n) && n >= 0 ? n : 0; };
const SPECIES_LIST = Object.values(SPECIES_CATALOG).sort((a, b) => a.name.localeCompare(b.name));

export default function RotationPanel() {
  const [forage, setForage] = useState(1840);
  const [acres, setAcres] = useState(80);
  const [herdAU, setHerdAU] = useState(45);
  const [residency, setResidency] = useState(5);
  const [speciesId, setSpeciesId] = useState('big_bluestem');

  const month = new Date().getMonth() + 1;
  const season = seasonFromMonth(month);

  const plan = useMemo(() => {
    if (forage <= 0 || acres <= 0 || herdAU <= 0 || !speciesId) return null;
    try {
      return planRotation({
        usableForageLbPerAcre: forage,
        pastureAcres: acres,
        herdAnimalUnits: herdAU,
        speciesIds: [speciesId],
        season,
        targetResidencyDays: Math.max(residency, 1),
      });
    } catch { return null; }
  }, [forage, acres, herdAU, residency, speciesId, season]);

  const buyCull = useMemo(() => {
    if (!plan) return null;
    try { return buildBuyCullReport(plan, herdAU); }
    catch { return null; }
  }, [plan, herdAU]);

  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Rotation Planner</div>
      <p style={{ font: '400 15px/1.5 var(--sans)', color: 'var(--ink2)', marginBottom: 16 }}>
        Plan paddock rotations from known forage data — no photo needed.
      </p>

      <div className="field">
        <label>Dominant Species</label>
        <select
          value={speciesId}
          onChange={(e) => setSpeciesId(e.target.value)}
          style={{ width: '100%', fontSize: 16, padding: '10px 12px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}
        >
          {SPECIES_LIST.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.season}-season{s.native ? ', native' : ''})</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Usable Forage (lb/acre)</label>
        <input type="text" inputMode="decimal" value={forage || ''} onChange={(e) => setForage(num(e.target.value))} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="field">
          <label>Pasture Acres</label>
          <input type="text" inputMode="decimal" value={acres || ''} onChange={(e) => setAcres(num(e.target.value))} />
        </div>
        <div className="field">
          <label>Herd (AU)</label>
          <input type="text" inputMode="decimal" value={herdAU || ''} onChange={(e) => setHerdAU(num(e.target.value))} />
        </div>
      </div>
      <div className="field">
        <label>Target Residency (days)</label>
        <input type="text" inputMode="decimal" value={residency || ''} onChange={(e) => setResidency(num(e.target.value))} />
      </div>

      {plan && (
        <>
          <div className="rot-grid">
            <div className="rot-stat"><div className="rot-num">{plan.numPaddocks}</div><div className="rot-label">Paddocks</div></div>
            <div className="rot-stat"><div className="rot-num">{plan.residencyDaysPerPaddock}</div><div className="rot-label">Graze Days</div></div>
            <div className="rot-stat"><div className="rot-num">{plan.restPeriodDays}</div><div className="rot-label">Rest Days</div></div>
            <div className="rot-stat"><div className="rot-num">{plan.recommendedMaxHerdAU}</div><div className="rot-label">Max AU</div></div>
          </div>

          <div className="card" style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`pill ${plan.forageFeasible ? 'pill-ok' : 'pill-bad'}`}>
                {plan.forageFeasible ? 'Feasible' : 'Overstocked'}
              </span>
              <span style={{ font: '400 15px/1 var(--sans)', color: 'var(--ink2)' }}>
                {plan.forageFeasible
                  ? `Each paddock feeds ${herdAU} AU for ${plan.residencyDaysPerPaddock} days`
                  : `Reduce to ${plan.recommendedMaxHerdAU} AU or add acreage`}
              </span>
            </div>
          </div>

          {buyCull && buyCull.decision !== 'hold' && (
            <div className="card" style={{ marginTop: 12, background: buyCull.decision === 'cull' ? 'var(--warn-bg)' : undefined }}>
              <div className="card-title" style={{ color: buyCull.decision === 'cull' ? 'var(--warn)' : 'var(--ok)' }}>
                {buyCull.decision === 'cull' ? 'Cull Recommendation' : 'Room to Add'}
              </div>
              <div style={{ font: '400 15px/1.4 var(--sans)', color: 'var(--ink2)', marginTop: 4 }}>
                {buyCull.decision === 'cull'
                  ? `Reduce by ${Math.abs(buyCull.recommendedChangeAU).toFixed(0)} AU to match forage capacity`
                  : `${buyCull.recommendedChangeAU.toFixed(0)} AU of additional capacity available`}
              </div>
            </div>
          )}

          {plan.notes.length > 0 && (
            <div className="card" style={{ marginTop: 12, background: 'var(--warn-bg)', borderColor: 'transparent' }}>
              {plan.notes.map((n, i) => (
                <div key={i} style={{ font: '400 14px/1.4 var(--sans)', color: 'var(--warn)', marginTop: i ? 8 : 0 }}>{n}</div>
              ))}
            </div>
          )}

          <div className="stat-row" style={{ marginTop: 16 }}>
            <div className="stat">
              <div className="sl">Cycle</div>
              <div className="sv">{plan.cycleLengthDays}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink2)' }}> days</span></div>
            </div>
            <div className="stat">
              <div className="sl">Total Grazing</div>
              <div className="sv">{plan.totalGrazingDaysAvailable}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink2)' }}> AU-days</span></div>
            </div>
            <div className="stat">
              <div className="sl">Paddock Size</div>
              <div className="sv">{Math.round(plan.paddockAcres)}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink2)' }}> acres</span></div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
