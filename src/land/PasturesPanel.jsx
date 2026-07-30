import { useState } from 'react';
import { useStore } from '../hooks/useStore.js';
import { useStoredState } from '../hooks/useStoredState.js';

const DEFAULT_PASTURES = [
  { id: 'p1', name: 'North 80', acres: 80, head: 45, species: 'cattle', condition: 'Good', grazeDays: 18, totalDays: 21, resting: false, notes: '' },
  { id: 'p2', name: 'South Creek', acres: 160, head: 0, species: 'cattle', condition: 'Fair', grazeDays: 12, totalDays: 35, resting: true, notes: '' },
  { id: 'p3', name: 'Highway', acres: 40, head: 22, species: 'cattle', condition: 'Good', grazeDays: 5, totalDays: 21, resting: false, notes: '' },
  { id: 'p4', name: 'East Pasture', acres: 120, head: 34, species: 'sheep', condition: 'Good', grazeDays: 8, totalDays: 14, resting: false, notes: '' },
];

function initPastures() {
  try {
    const raw = localStorage.getItem('arpent.pastures');
    return raw ? JSON.parse(raw) : DEFAULT_PASTURES;
  } catch { return DEFAULT_PASTURES; }
}

function emptyPasture() {
  return { id: `p-${Date.now()}`, name: '', acres: 0, head: 0, species: 'cattle', condition: 'Good', grazeDays: 0, totalDays: 21, resting: false, notes: '' };
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
