import { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore.js';
import { useStoredState } from '../hooks/useStoredState.js';
import { getLatestAnalysis, getAnalyses, getProductivityTrend, deleteAnalysis } from '../data/analysisStore.js';
import { DEFAULT_PASTURES } from '../data/defaults.js';

function initPastures() {
  try {
    const raw = localStorage.getItem('arpent.pastures');
    return raw ? JSON.parse(raw) : DEFAULT_PASTURES;
  } catch { return DEFAULT_PASTURES; }
}

function emptyPasture() {
  return { id: `p-${Date.now()}`, name: '', acres: 0, head: 0, species: 'cattle', condition: 'Good', grazeDays: 0, totalDays: 21, resting: false, notes: '' };
}

function PastureAnalyses({ pastureId }) {
  const [rev, setRev] = useState(0);
  const analyses = getAnalyses(pastureId);
  if (!analyses.length) return null;

  const handleDelete = (id) => {
    deleteAnalysis(id);
    setRev((r) => r + 1);
  };

  const trend = getProductivityTrend(pastureId);
  const maxCap = trend.length ? Math.max(...trend.map((t) => t.avgCapacity)) : 0;

  return (
    <div className="card" style={{ marginBottom: 16, padding: 16 }}>
      <div className="card-title">Forage History ({analyses.length})</div>
      {trend.length >= 2 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ font: '400 12px/1 var(--sans)', color: 'var(--ink3)', marginBottom: 6 }}>Capacity trend (lb/ac avg)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
            {trend.map((t) => {
              const h = maxCap > 0 ? Math.round((t.avgCapacity / maxCap) * 36) : 0;
              return (
                <div key={t.month} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: '80%', height: h, background: 'var(--ok)', borderRadius: '2px 2px 0 0', minHeight: 2, opacity: 0.7 }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
            {trend.map((t) => (
              <div key={t.month} style={{ flex: 1, textAlign: 'center', font: '400 9px/1.2 var(--sans)', color: 'var(--ink3)' }}>
                {t.month.slice(5)}
              </div>
            ))}
          </div>
        </div>
      )}
      {analyses.slice(0, 10).map((a) => {
        const d = new Date(a.date);
        return (
          <div key={a.id} className="cost-row" style={{ alignItems: 'center' }}>
            <span className="cost-label">
              {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {a.droughtCategory && a.droughtCategory !== 'NONE' ? ` · ${a.droughtCategory}` : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="cost-val">{a.usableForageLbPerAcre?.toLocaleString()} lb/ac</span>
              <button
                onClick={() => handleDelete(a.id)}
                style={{ background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 16, cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}
                aria-label="Delete analysis"
              >×</button>
            </span>
          </div>
        );
      })}
      {analyses.length > 10 && (
        <div style={{ font: '400 13px/1.4 var(--sans)', color: 'var(--ink3)', marginTop: 8, textAlign: 'center' }}>
          +{analyses.length - 10} older
        </div>
      )}
    </div>
  );
}

export default function PasturesPanel() {
  const { items: pastures, add, update, remove } = useStore('arpent.pastures');
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyPasture());
  const [history, setHistory] = useStoredState('arpent.pastureHistory', []);

  const list = pastures.length ? pastures : DEFAULT_PASTURES;

  const startAdd = () => {
    setDraft(emptyPasture());
    setAdding(true);
    setEditing(null);
  };

  const startEdit = (p) => {
    setDraft({ ...p });
    setEditing(p.id);
    setAdding(false);
  };

  const recordHistory = (pastureName, action) => {
    const entry = { pasture: pastureName, action, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) };
    setHistory((prev) => [entry, ...prev].slice(0, 50));
  };

  const saveDraft = () => {
    if (!draft.name.trim()) return;
    if (adding) {
      add(draft);
      if (pastures.length === 0) {
        DEFAULT_PASTURES.forEach((p) => add(p));
        add(draft);
      }
      recordHistory(draft.name, 'Added pasture');
    } else if (editing) {
      const prev = list.find((p) => p.id === editing);
      update(editing, draft);
      if (prev && prev.resting !== draft.resting) {
        recordHistory(draft.name, draft.resting ? 'Set to resting' : 'Resumed grazing');
      } else if (prev && prev.head !== draft.head) {
        recordHistory(draft.name, `Updated head count: ${prev.head} → ${draft.head}`);
      } else if (prev && prev.grazeDays !== draft.grazeDays) {
        recordHistory(draft.name, `Graze day ${draft.grazeDays} of ${draft.totalDays}`);
      } else if (prev && prev.condition !== draft.condition) {
        recordHistory(draft.name, `Condition changed to ${draft.condition}`);
      } else {
        recordHistory(draft.name, 'Updated');
      }
    }
    setAdding(false);
    setEditing(null);
  };

  const cancelEdit = () => {
    setAdding(false);
    setEditing(null);
  };

  const deletePasture = (id) => {
    const target = list.find((p) => p.id === id);
    if (pastures.length === 0) {
      const init = DEFAULT_PASTURES.filter((p) => p.id !== id);
      init.forEach((p) => add(p));
    } else {
      remove(id);
    }
    if (target) recordHistory(target.name, 'Removed pasture');
    setEditing(null);
  };

  const progressPct = (p) => {
    if (p.totalDays <= 0) return 0;
    return Math.min(Math.round((p.grazeDays / p.totalDays) * 100), 100);
  };

  const statusLabel = (p) => {
    if (p.resting) return 'Resting';
    return `Day ${p.grazeDays} / ${p.totalDays}`;
  };

  const statusClass = (p) => {
    if (p.resting) return 'pill-ok';
    if (progressPct(p) > 80) return 'pill-warn';
    return 'pill-ok';
  };

  const field = (label, key, type = 'text', extra = {}) => (
    <div className="field" style={{ margin: '0 0 8px' }}>
      <label>{label}</label>
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        value={draft[key] ?? ''}
        onChange={(e) => setDraft({ ...draft, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
        {...extra}
      />
    </div>
  );

  const form = (
    <div className="card" style={{ marginBottom: 16, padding: 16 }}>
      <div className="card-title">{adding ? 'Add Pasture' : 'Edit Pasture'}</div>
      {field('Name', 'name')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {field('Acres', 'acres', 'number')}
        {field('Head', 'head', 'number')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {field('Graze Day', 'grazeDays', 'number')}
        {field('Total Days', 'totalDays', 'number')}
      </div>
      <div className="field" style={{ margin: '0 0 8px' }}>
        <label>Species</label>
        <select
          value={draft.species}
          onChange={(e) => setDraft({ ...draft, species: e.target.value })}
          style={{ width: '100%', fontSize: 16, padding: '8px 10px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}
        >
          <option value="cattle">Cattle</option>
          <option value="sheep">Sheep</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>
      <div className="field" style={{ margin: '0 0 8px' }}>
        <label>Condition</label>
        <select
          value={draft.condition}
          onChange={(e) => setDraft({ ...draft, condition: e.target.value })}
          style={{ width: '100%', fontSize: 16, padding: '8px 10px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}
        >
          <option value="Excellent">Excellent</option>
          <option value="Good">Good</option>
          <option value="Fair">Fair</option>
          <option value="Poor">Poor</option>
        </select>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 15px/1 var(--sans)', color: 'var(--ink)', marginBottom: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={draft.resting} onChange={(e) => setDraft({ ...draft, resting: e.target.checked })} />
        Currently resting
      </label>
      {field('Notes', 'notes')}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="act-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={saveDraft}>
          {adding ? 'Add' : 'Save'}
        </button>
        <button className="act-btn outline" style={{ flex: 1, justifyContent: 'center' }} onClick={cancelEdit}>
          Cancel
        </button>
        {editing && (
          <button
            className="act-btn outline"
            style={{ justifyContent: 'center', color: 'var(--bad)', borderColor: 'var(--bad)' }}
            onClick={() => deletePasture(editing)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );

  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Pastures</div>

      {(adding || editing) && form}
      {editing && <PastureAnalyses pastureId={editing} />}

      {list.map((p) => (
        <div
          key={p.id}
          className="pasture-card"
          onClick={() => { if (!adding && !editing) startEdit(p); }}
          style={{ cursor: adding || editing ? undefined : 'pointer' }}
        >
          <div className="pasture-head">
            <div className="pasture-name">{p.name}</div>
            <span className={`pill ${statusClass(p)}`}>{statusLabel(p)}</span>
          </div>
          <div className="pasture-detail">
            {p.acres} acres · {p.head} head{p.species === 'sheep' ? ' (sheep)' : ''} · Condition: {p.condition}
          </div>
          {(() => {
            const latest = getLatestAnalysis(p.id);
            if (!latest) return null;
            const d = new Date(latest.date);
            return (
              <div style={{ font: '400 12px/1.3 var(--sans)', color: 'var(--ink3)', marginTop: 4 }}>
                Last scan: {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {latest.usableForageLbPerAcre?.toLocaleString()} lb/ac
              </div>
            );
          })()}
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPct(p)}%`, background: p.resting ? 'var(--accent)' : undefined }}
            />
          </div>
        </div>
      ))}

      {!adding && !editing && (
        <button
          className="act-btn"
          style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
          onClick={startAdd}
        >
          + Add Pasture
        </button>
      )}

      {history.length > 0 && (
        <>
          <div className="sh">Recent History</div>
          {history.slice(0, 10).map((h, i) => (
            <div key={i} className="feed-item">
              <div className="feed-dot" style={{ background: 'var(--accent)' }} />
              <div>
                <div className="feed-text"><strong>{h.pasture}</strong> — {h.action}</div>
                <div className="feed-time">{h.date}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
