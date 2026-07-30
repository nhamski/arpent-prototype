import { useState } from 'react';
import { useConditions } from '../hooks/useLiveData.js';
import { useStoredState } from '../hooks/useStoredState.js';
import { DROUGHT_LABELS, DROUGHT_COLORS, droughtReduction } from '../data/usdmApi.js';
import { PRO_MANUAL_DROUGHT_REDUCTION_MAX } from '../engine/constants.js';

export default function ConditionsPanel({ zip }) {
  const { conditions, loading } = useConditions(zip);
  const [override, setOverride] = useStoredState('arpent.droughtOverride', null);
  const [editing, setEditing] = useState(false);

  const loc = conditions?.location;
  const drought = conditions?.drought;
  const forecast = conditions?.forecast || [];
  const alerts = conditions?.alerts || [];

  const rainfall = conditions?.rainfall;

  const effectiveReduction = override != null ? override : (drought?.reduction ?? 0);

  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Conditions</div>
      {loading && <p style={{ font: '400 15px/1.4 var(--sans)', color: 'var(--ink2)' }}>Loading conditions...</p>}

      {loc && (
        <p style={{ font: '400 15px/1.4 var(--sans)', color: 'var(--ink2)', marginBottom: 16 }}>
          {loc.county ? `${loc.county}, ` : ''}{loc.state} · ZIP {zip}
        </p>
      )}
      {!loc && !loading && (
        <p style={{ font: '400 15px/1.4 var(--sans)', color: 'var(--ink2)', marginBottom: 16 }}>
          {zip ? `ZIP ${zip}` : 'Enter a ZIP code to view conditions'}
        </p>
      )}

      <div className="cond-card">
        <div className="cond-label">Drought Status</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="drought-indicator"
            style={{ background: drought?.color || DROUGHT_COLORS.None }}
          />
          <div>
            <div className="cond-value">
              {drought ? `${drought.category} — ${drought.label}` : (loading ? '...' : 'No data')}
            </div>
            <div className="cond-note">
              {override != null
                ? `Manual override: ${Math.round(effectiveReduction * 100)}% capacity reduction`
                : `${Math.round(effectiveReduction * 100)}% capacity reduction applied to all analyses`}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {!editing ? (
            <button
              className="act-btn outline"
              style={{ fontSize: 14, padding: '8px 12px' }}
              onClick={() => setEditing(true)}
            >
              {override != null ? 'Edit Override' : 'Manual Override'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="field" style={{ flex: 1, margin: 0 }}>
                <label>Reduction %</label>
                <input
                  type="number"
                  min="0"
                  max={PRO_MANUAL_DROUGHT_REDUCTION_MAX * 100}
                  step="5"
                  value={override != null ? Math.round(override * 100) : Math.round(effectiveReduction * 100)}
                  onChange={(e) => setOverride(Math.min(parseFloat(e.target.value) / 100, PRO_MANUAL_DROUGHT_REDUCTION_MAX))}
                  style={{ fontSize: 16 }}
                />
              </div>
              <button
                className="act-btn"
                style={{ fontSize: 14, padding: '8px 12px', marginTop: 18 }}
                onClick={() => setEditing(false)}
              >
                Set
              </button>
              {override != null && (
                <button
                  className="act-btn outline"
                  style={{ fontSize: 14, padding: '8px 12px', marginTop: 18 }}
                  onClick={() => { setOverride(null); setEditing(false); }}
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {forecast.length > 0 && (
        <div className="cond-card">
          <div className="cond-label">Forecast</div>
          {forecast.slice(0, 4).map((p, i) => (
            <div key={i} style={{ marginTop: i ? 8 : 4 }}>
              <div style={{ font: '600 14px/1.3 var(--sans)', color: 'var(--ink)' }}>{p.name}</div>
              <div style={{ font: '400 14px/1.4 var(--sans)', color: 'var(--ink2)' }}>
                {p.temperature}°{p.temperatureUnit} — {p.shortForecast}
              </div>
            </div>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="card" style={{ background: 'var(--warn-bg)', borderColor: 'transparent', marginBottom: 16 }}>
          <div style={{ font: '600 15px/1.3 var(--sans)', color: 'var(--warn)', marginBottom: 8 }}>
            Active Alerts
          </div>
          {alerts.map((a, i) => (
            <div key={i} style={{ font: '400 14px/1.4 var(--sans)', color: 'var(--warn)', marginTop: i ? 8 : 0 }}>
              <strong>{a.event}</strong> — {a.headline}
            </div>
          ))}
        </div>
      )}

      {rainfall && (
        <div className="cond-card">
          <div className="cond-label">Rainfall</div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
            <div>
              <div className="cond-value">{rainfall.growingSeasonInches != null ? `${rainfall.growingSeasonInches.toFixed(1)}"` : '—'}</div>
              <div className="cond-note">Growing season {rainfall.growingSeasonYear} (Apr–Sep)</div>
            </div>
            <div>
              <div className="cond-value">{rainfall.avgAnnualInches != null ? `${rainfall.avgAnnualInches.toFixed(1)}"` : '—'}</div>
              <div className="cond-note">{rainfall.yearsUsed}-yr avg annual</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 56 }}>
            {rainfall.normals.map((n) => {
              const maxVal = Math.max(...rainfall.normals.map((x) => x.inches));
              const h = maxVal > 0 ? Math.round((n.inches / maxVal) * 52) : 0;
              return (
                <div key={n.month} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: '80%', height: h, background: 'var(--accent)', borderRadius: '3px 3px 0 0', minHeight: n.inches > 0 ? 2 : 0, opacity: 0.75 }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
            {rainfall.normals.map((n) => (
              <div key={n.month} style={{ flex: 1, textAlign: 'center', font: '400 10px/1.2 var(--sans)', color: 'var(--ink3)' }}>{n.label}</div>
            ))}
          </div>
          <div style={{ font: '400 12px/1.4 var(--sans)', color: 'var(--ink3)', marginTop: 8 }}>
            Source: {rainfall.source}
          </div>
        </div>
      )}

      {!loading && !conditions && (
        <div className="card" style={{ background: 'var(--warn-bg)', borderColor: 'transparent' }}>
          <div style={{ font: '600 15px/1.3 var(--sans)', color: 'var(--warn)' }}>
            {zip ? 'No weather data available. Cached data will appear when a network connection is restored.' : 'Enter a ZIP code to view conditions.'}
          </div>
        </div>
      )}
    </section>
  );
}
