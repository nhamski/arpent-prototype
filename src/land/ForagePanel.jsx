import { useState, useMemo, useRef, useCallback } from 'react';
import { computeCapacity } from '../engine/capacity.js';
import { planRotation, seasonFromMonth } from '../engine/rotation.js';
import { computeDepletion } from '../engine/depletion.js';
import { recommendSpecies } from '../engine/recommendations.js';
import { buildBuyCullReport, renderBuyCullText } from '../engine/buyCull.js';
import { SPECIES_CATALOG, speciesIdForScientificName } from '../engine/species.js';
import { useStoredState } from '../hooks/useStoredState.js';
import { identifyPlant } from '../data/plantnetApi.js';
import PhotoMeasure from '../components/PhotoMeasure.jsx';
import { saveAnalysis, getAnalyses } from '../data/analysisStore.js';

const SPECIES_LIST = Object.values(SPECIES_CATALOG).sort((a, b) => a.name.localeCompare(b.name));
const num = (v) => { const n = parseFloat(String(v).replace(/,/g, '')); return Number.isFinite(n) && n >= 0 ? n : 0; };

function emptyPoint() {
  return { id: Date.now(), speciesId: 'big_bluestem', height: 8, share: 0.5 };
}

function DepletionTracker() {
  const [showDepletion, setShowDepletion] = useState(false);
  const [entry, setEntry] = useState(2400);
  const [exit, setExit] = useState(1200);
  const [depAcres, setDepAcres] = useState(80);

  const depletion = useMemo(() => {
    if (entry <= 0 || depAcres <= 0) return null;
    try { return computeDepletion(entry, exit, depAcres); }
    catch { return null; }
  }, [entry, exit, depAcres]);

  if (!showDepletion) {
    return (
      <div style={{ marginTop: 24 }}>
        <button className="act-btn outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowDepletion(true)}>
          Track Depletion (Entry/Exit)
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="sh">Depletion Tracker</div>
      <p style={{ font: '400 14px/1.4 var(--sans)', color: 'var(--ink2)', marginBottom: 12 }}>
        Compare forage standing before and after grazing to measure utilization.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Entry (lb/ac)</label>
          <input type="number" min="0" value={entry} onChange={(e) => setEntry(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Exit (lb/ac)</label>
          <input type="number" min="0" value={exit} onChange={(e) => setExit(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Acres</label>
          <input type="number" min="1" value={depAcres} onChange={(e) => setDepAcres(parseFloat(e.target.value) || 1)} />
        </div>
      </div>

      {depletion && (
        <div className="card" style={{ padding: 16 }}>
          <div className="stat-row">
            <div className="stat">
              <div className="sl">Consumed</div>
              <div className="sv">{depletion.consumedLbPerAcre.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink2)' }}>lb/ac</span></div>
            </div>
            <div className="stat">
              <div className="sl">Utilization</div>
              <div className="sv" style={{ color: depletion.overTakeHalf ? 'var(--bad)' : 'var(--ok)' }}>
                {Math.round(depletion.utilizationFraction * 100)}%
              </div>
            </div>
            <div className="stat">
              <div className="sl">AU-days</div>
              <div className="sv">{depletion.auDaysConsumed}</div>
            </div>
          </div>
          {depletion.notes.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {depletion.notes.map((n, i) => (
                <div key={i} style={{ font: '400 13px/1.4 var(--sans)', color: depletion.overTakeHalf ? 'var(--warn)' : 'var(--ink2)', marginTop: 4 }}>
                  {n}
                </div>
              ))}
            </div>
          )}
          <div className="progress-bar" style={{ marginTop: 12 }}>
            <div className="progress-fill" style={{
              width: `${Math.min(Math.round(depletion.utilizationFraction * 100), 100)}%`,
              background: depletion.overTakeHalf ? 'var(--bad)' : 'var(--ok)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, font: '400 12px/1 var(--sans)', color: 'var(--ink3)' }}>
            <span>0% (ungrazed)</span>
            <span style={{ color: 'var(--warn)' }}>50% take-half</span>
            <span>100%</span>
          </div>
        </div>
      )}

      <button className="act-btn outline" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => setShowDepletion(false)}>
        Hide Depletion
      </button>
    </div>
  );
}

function BuyCullReport({ rotation, herdAU }) {
  const [showText, setShowText] = useState(false);
  const report = useMemo(() => {
    try { return buildBuyCullReport(rotation, herdAU, { auPerHead: 1 }); }
    catch { return null; }
  }, [rotation, herdAU]);

  if (!report) return null;

  const text = renderBuyCullText(report);
  const color = report.decision === 'cull' ? 'var(--bad)' : report.decision === 'room_to_add' ? 'var(--ok)' : 'var(--ink2)';
  const label = report.decision === 'cull' ? 'Cull' : report.decision === 'room_to_add' ? 'Room to Add' : 'At Capacity';

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="card-title">Stocking Verdict</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ font: '600 18px/1 var(--sans)', color }}>{label}</span>
        {report.recommendedChangeHead != null && (
          <span style={{ font: '600 15px/1 var(--sans)', color }}>
            {report.decision === 'cull' ? `−${Math.abs(report.recommendedChangeHead)}` : `+${report.recommendedChangeHead}`} head
          </span>
        )}
      </div>
      <div style={{ font: '400 13px/1.4 var(--sans)', color: 'var(--ink2)', marginTop: 6 }}>
        Running {report.currentHerdAU.toFixed(1)} AU · Max {report.recommendedMaxHerdAU.toFixed(1)} AU
      </div>
      {report.notes.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {report.notes.map((n, i) => (
            <div key={i} style={{ font: '400 13px/1.4 var(--sans)', color: 'var(--warn)', marginTop: 2 }}>• {n}</div>
          ))}
        </div>
      )}
      <button
        className="act-btn outline"
        style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 13 }}
        onClick={() => {
          if (showText) { setShowText(false); return; }
          setShowText(true);
        }}
      >
        {showText ? 'Hide' : 'Copy Report Text'}
      </button>
      {showText && (
        <div style={{ marginTop: 8 }}>
          <pre style={{ font: '400 13px/1.5 var(--sans)', color: 'var(--ink2)', whiteSpace: 'pre-wrap', background: 'var(--line)', padding: 10, borderRadius: 6, userSelect: 'all' }}>
            {text}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ForagePanel({ zip }) {
  const [points, setPoints] = useStoredState('arpent.intercept', [emptyPoint()]);
  const [acres, setAcres] = useState(80);
  const [herdAU, setHerdAU] = useState(45);
  const [droughtCat, setDroughtCat] = useStoredState('arpent.droughtCat', 'NONE');
  const [showResult, setShowResult] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const fileRef = useRef(null);
  const [idTarget, setIdTarget] = useState(null);
  const [selectedPasture, setSelectedPasture] = useStoredState('arpent.foragePasture', null);
  const [savedFeedback, setSavedFeedback] = useState(null);

  const pastures = useMemo(() => {
    try {
      const raw = localStorage.getItem('arpent.pastures');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const selectedPastureObj = pastures.find((p) => p.id === selectedPasture) || null;
  const analysisCount = useMemo(() => selectedPasture ? getAnalyses(selectedPasture).length : 0, [selectedPasture, savedFeedback]);

  const handlePastureChange = useCallback((id) => {
    setSelectedPasture(id || null);
    if (id) {
      const p = pastures.find((x) => x.id === id);
      if (p) {
        setAcres(p.acres || 80);
        const auFactor = p.species === 'sheep' ? 0.2 : 1;
        setHerdAU(Math.round(p.head * auFactor) || 45);
      }
    }
  }, [pastures, setSelectedPasture]);

  const droughtReduction = { NONE: 0, D0: 0.05, D1: 0.10, D2: 0.15, D3: 0.25, D4: 0.40 }[droughtCat] || 0;

  const measured = useMemo(() =>
    points.filter((p) => p.speciesId && p.height > 0 && p.share > 0).map((p) => ({
      speciesId: p.speciesId,
      meanHeightInches: p.height,
      share: p.share,
    })),
  [points]);

  const totalShare = measured.reduce((a, m) => a + m.share, 0);

  const capacity = useMemo(() => {
    if (measured.length === 0 || totalShare > 1.001) return null;
    try { return computeCapacity(measured, { droughtReduction }); }
    catch { return null; }
  }, [measured, droughtReduction, totalShare]);

  const rotation = useMemo(() => {
    if (!capacity || acres <= 0 || herdAU <= 0) return null;
    const month = new Date().getMonth() + 1;
    try {
      return planRotation({
        usableForageLbPerAcre: capacity.usableForageLbPerAcre,
        pastureAcres: acres,
        herdAnimalUnits: herdAU,
        speciesIds: measured.map((m) => m.speciesId),
        season: seasonFromMonth(month),
      });
    } catch { return null; }
  }, [capacity, acres, herdAU, measured]);

  const handleSaveAnalysis = useCallback(() => {
    if (!selectedPasture || !capacity) return;
    saveAnalysis(selectedPasture, {
      droughtCategory: droughtCat,
      droughtReduction,
      usableForageLbPerAcre: capacity.usableForageLbPerAcre,
      standingLbPerAcre: capacity.standingLbPerAcre || 0,
      cattleAUDaysPerAcre: capacity.cattleAUDaysPerAcre,
      recommendedMaxHerdAU: rotation?.recommendedMaxHerdAU || null,
      forageFeasible: rotation?.forageFeasible ?? null,
      acres,
      herdAU,
    });
    setSavedFeedback(Date.now());
    setTimeout(() => setSavedFeedback(null), 2000);
  }, [selectedPasture, capacity, rotation, droughtCat, droughtReduction, acres, herdAU]);

  const recs = useMemo(() => {
    try { return recommendSpecies({ droughtCategory: droughtCat, preferNative: true }, 5); }
    catch { return []; }
  }, [droughtCat]);

  const addPoint = () => setPoints((prev) => [...prev, emptyPoint()]);
  const removePoint = (id) => setPoints((prev) => prev.filter((p) => p.id !== id));
  const updatePoint = (id, field, val) =>
    setPoints((prev) => prev.map((p) => p.id === id ? { ...p, [field]: val } : p));

  const handleIdentify = async (pointId) => {
    setIdTarget(pointId);
    fileRef.current?.click();
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !idTarget) return;
    setIdentifying(true);
    try {
      const results = await identifyPlant(file);
      if (results?.length) {
        const match = results.find((r) => speciesIdForScientificName(r.scientificName));
        if (match) {
          const sid = speciesIdForScientificName(match.scientificName);
          updatePoint(idTarget, 'speciesId', sid);
        }
      }
    } finally {
      setIdentifying(false);
      setIdTarget(null);
      e.target.value = '';
    }
  };

  const capacityAU = capacity ? Math.floor(capacity.usableForageLbPerAcre * acres / 26 / (residencyOrDefault())) : null;
  function residencyOrDefault() { return 5; }

  const verdictLabel = rotation
    ? (rotation.recommendedMaxHerdAU >= herdAU ? 'Room to Run' : 'Overstocked')
    : null;
  const verdictColor = verdictLabel === 'Room to Run' ? '#8DA06A' : 'var(--bad)';

  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Grazing Plan</div>
      <p style={{ font: '400 15px/1.5 var(--sans)', color: 'var(--ink2)', marginBottom: 16 }}>
        Enter species composition from a point-intercept transect, or scan a pasture photo to identify species.
      </p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFileSelected} />

      {pastures.length > 0 && (
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Link to Pasture</label>
          <select
            value={selectedPasture || ''}
            onChange={(e) => handlePastureChange(e.target.value)}
            style={{ width: '100%', fontSize: 16, padding: '10px 12px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}
          >
            <option value="">None (standalone)</option>
            {pastures.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.acres} ac)</option>
            ))}
          </select>
          {selectedPasture && analysisCount > 0 && (
            <div style={{ font: '400 13px/1.4 var(--sans)', color: 'var(--ink3)', marginTop: 4 }}>
              {analysisCount} saved {analysisCount === 1 ? 'analysis' : 'analyses'} for this pasture
            </div>
          )}
        </div>
      )}

      <div className="sh">Intercept Points</div>
      {points.map((p, i) => (
        <div key={p.id} className="card" style={{ marginBottom: 8, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ font: '600 14px/1 var(--sans)', color: 'var(--ink2)' }}>Point {i + 1}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="act-btn outline"
                style={{ fontSize: 12, padding: '4px 8px' }}
                onClick={() => handleIdentify(p.id)}
                disabled={identifying}
              >
                {identifying && idTarget === p.id ? 'Identifying...' : 'ID Plant'}
              </button>
              {points.length > 1 && (
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--bad)', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}
                  onClick={() => removePoint(p.id)}
                >
                  ×
                </button>
              )}
            </div>
          </div>
          <div className="field" style={{ margin: '0 0 6px' }}>
            <label>Species</label>
            <select
              value={p.speciesId}
              onChange={(e) => updatePoint(p.id, 'speciesId', e.target.value)}
              style={{ width: '100%', fontSize: 16, padding: '8px 10px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}
            >
              {SPECIES_LIST.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Height (inches)</label>
              <input type="number" min="0" step="0.5" value={p.height} onChange={(e) => updatePoint(p.id, 'height', num(e.target.value))} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Share (0–1)</label>
              <input type="number" min="0" max="1" step="0.05" value={p.share} onChange={(e) => updatePoint(p.id, 'share', Math.min(num(e.target.value), 1))} />
            </div>
          </div>
        </div>
      ))}

      {totalShare > 1.001 && (
        <div style={{ font: '400 14px/1.4 var(--sans)', color: 'var(--bad)', marginBottom: 8 }}>
          Shares sum to {totalShare.toFixed(2)} — must be ≤ 1.0
        </div>
      )}

      <button className="act-btn outline" style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }} onClick={addPoint}>
        + Add Intercept Point
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="field">
          <label>Pasture Acres</label>
          <input type="text" inputMode="decimal" value={acres || ''} onChange={(e) => setAcres(num(e.target.value))} />
        </div>
        <div className="field">
          <label>Running Herd (AU)</label>
          <input type="text" inputMode="decimal" value={herdAU || ''} onChange={(e) => setHerdAU(num(e.target.value))} />
        </div>
      </div>

      <div className="field">
        <label>Drought Category</label>
        <select
          value={droughtCat}
          onChange={(e) => setDroughtCat(e.target.value)}
          style={{ width: '100%', fontSize: 16, padding: '10px 12px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}
        >
          <option value="NONE">None</option>
          <option value="D0">D0 — Abnormally Dry (−5%)</option>
          <option value="D1">D1 — Moderate Drought (−10%)</option>
          <option value="D2">D2 — Severe Drought (−15%)</option>
          <option value="D3">D3 — Extreme Drought (−25%)</option>
          <option value="D4">D4 — Exceptional Drought (−40%)</option>
        </select>
      </div>

      {capacity && (
        <>
          <div className="sh">Analysis</div>
          <div className="hero-card">
            <div className="hero-label">Carrying Capacity</div>
            <div className="hero-value" style={{ color: verdictColor }}>{verdictLabel}</div>
            <div className="hero-sub">
              This pasture can support <strong style={{ color: '#F6F2EA' }}>{rotation?.recommendedMaxHerdAU ?? '—'} AU</strong> — you're running {herdAU}
            </div>
          </div>

          <div className="stat-row">
            <div className="stat">
              <div className="sl">Usable forage</div>
              <div className="sv">{capacity.usableForageLbPerAcre.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink2)' }}>lb/ac</span></div>
            </div>
            <div className="stat">
              <div className="sl">AU-days/acre</div>
              <div className="sv">{capacity.cattleAUDaysPerAcre}</div>
            </div>
            <div className="stat">
              <div className="sl">Drought</div>
              <div className="sv">{droughtCat === 'NONE' ? '—' : droughtCat} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink2)' }}>{droughtReduction ? `−${Math.round(droughtReduction*100)}%` : ''}</span></div>
            </div>
          </div>

          {rotation && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-title">Rotation Plan</div>
              <div className="rot-grid">
                <div className="rot-stat"><div className="rot-num">{rotation.numPaddocks}</div><div className="rot-label">Paddocks</div></div>
                <div className="rot-stat"><div className="rot-num">{rotation.residencyDaysPerPaddock}</div><div className="rot-label">Graze Days</div></div>
                <div className="rot-stat"><div className="rot-num">{rotation.restPeriodDays}</div><div className="rot-label">Rest Days</div></div>
                <div className="rot-stat"><div className="rot-num">{Math.round(rotation.paddockAcres)}</div><div className="rot-label">Acres Each</div></div>
              </div>
            </div>
          )}

          {capacity.contributions.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-title">Species Contributions</div>
              {capacity.contributions.map((c, i) => {
                const sp = SPECIES_CATALOG[c.speciesId];
                return (
                  <div key={i} className="cost-row">
                    <span className="cost-label">{sp?.name || c.speciesId}</span>
                    <span className="cost-val">{Math.round(c.standingLbPerAcre)} lb/ac ({Math.round(c.share * 100)}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {rotation && (
        <BuyCullReport rotation={rotation} herdAU={herdAU} />
      )}

      {capacity && selectedPasture && (
        <button
          className="act-btn"
          style={{
            width: '100%', justifyContent: 'center', marginTop: 12,
            background: savedFeedback ? 'var(--ok)' : 'var(--accent)', color: '#F6F2EA',
          }}
          onClick={handleSaveAnalysis}
          disabled={!!savedFeedback}
        >
          {savedFeedback ? 'Saved' : `Save to ${selectedPastureObj?.name || 'Pasture'}`}
        </button>
      )}

      <PhotoMeasure />

      <DepletionTracker />

      <div className="sh" style={{ marginTop: 24 }}>Species Recommendations</div>
      <p style={{ font: '400 14px/1.4 var(--sans)', color: 'var(--ink2)', marginBottom: 12 }}>
        Best-fit species for current conditions{droughtCat !== 'NONE' ? ` (${droughtCat} drought)` : ''}, prioritizing native grasses.
      </p>
      {recs.map((r) => (
        <div key={r.speciesId} className="card" style={{ marginBottom: 8, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ font: '600 15px/1.3 var(--sans)', color: 'var(--ink)' }}>{r.commonName}</div>
              <div style={{ font: '400 13px/1.4 var(--sans)', color: 'var(--ink2)', marginTop: 2 }}>{r.rationale}</div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
              {r.native && <span className="pill pill-ok" style={{ fontSize: 11 }}>Native</span>}
              <span className="pill pill-muted" style={{ fontSize: 11 }}>{r.growthSeason}</span>
            </div>
          </div>
          <div style={{ font: '400 13px/1.3 var(--sans)', color: 'var(--ink3)', marginTop: 4 }}>
            Seeding: {r.preferredSeedingMethod.replace(/_/g, ' ')} · Drought tolerance: {r.droughtTolerance}
          </div>
        </div>
      ))}

      <p style={{ font: '400 14px/1.4 var(--sans)', color: 'var(--ink3)', marginTop: 16, textAlign: 'center' }}>
        Conservative by design — numbers round down and apply a safety buffer.
      </p>
    </section>
  );
}
