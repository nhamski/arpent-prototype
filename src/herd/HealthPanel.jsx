import { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore.js';

const COMMON_DRUGS = [
  { name: 'Draxxin', withdrawal: 38, route: 'subcutaneous', category: 'Respiratory' },
  { name: 'Excede', withdrawal: 13, route: 'subcutaneous', category: 'Respiratory' },
  { name: 'LA-200', withdrawal: 28, route: 'intramuscular', category: 'Infection' },
  { name: 'Ivermectin Pour-on', withdrawal: 14, route: 'topical', category: 'Parasite' },
  { name: 'Cydectin', withdrawal: 8, route: 'topical', category: 'Parasite' },
  { name: 'Banamine', withdrawal: 4, route: 'intravenous', category: 'Anti-inflammatory' },
  { name: 'CDT Vaccine', withdrawal: 0, route: 'subcutaneous', category: 'Vaccine' },
  { name: 'Blackleg Vaccine', withdrawal: 0, route: 'subcutaneous', category: 'Vaccine' },
  { name: 'Other', withdrawal: 0, route: '', category: '' },
];

function emptyEntry() {
  return {
    id: `t-${Date.now()}`, ts: Date.now(),
    animalLabel: '', drug: '', dose: '', route: '',
    category: '', withdrawalDays: 0, headCount: 1, notes: '',
    dateStr: new Date().toISOString().slice(0, 10),
  };
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function withdrawalStatus(entry) {
  if (!entry.withdrawalDays || entry.withdrawalDays <= 0) return { label: 'No withdrawal', cls: 'pill-muted', cleared: true };
  const treatDate = new Date(entry.dateStr + 'T00:00:00');
  const clearDate = new Date(treatDate);
  clearDate.setDate(clearDate.getDate() + entry.withdrawalDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((clearDate - today) / 86400000);
  if (daysLeft <= 0) return { label: 'Clear', cls: 'pill-ok', cleared: true, clearStr: formatDate(clearDate.toISOString().slice(0, 10)) };
  return { label: `${daysLeft} days`, cls: 'pill-bad', cleared: false, clearStr: formatDate(clearDate.toISOString().slice(0, 10)) };
}

export default function HealthPanel() {
  const { items: treatments, add, update, remove } = useStore('arpent.treatments');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyEntry());
  const [filterClear, setFilterClear] = useState(false);

  const sorted = useMemo(() => {
    const s = [...treatments].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    if (filterClear) return s.filter((t) => !withdrawalStatus(t).cleared);
    return s;
  }, [treatments, filterClear]);

  const activeCount = useMemo(
    () => treatments.filter((t) => !withdrawalStatus(t).cleared).length,
    [treatments],
  );

  const startAdd = () => { setDraft(emptyEntry()); setAdding(true); setEditing(null); };
  const startEdit = (t) => { setDraft({ ...t }); setEditing(t.id); setAdding(false); };
  const cancel = () => { setAdding(false); setEditing(null); };

  const save = () => {
    if (!draft.animalLabel.trim() || !draft.drug.trim()) return;
    const entry = { ...draft, ts: new Date(draft.dateStr + 'T12:00:00').getTime() || Date.now() };
    if (adding) add(entry);
    else if (editing) update(editing, entry);
    cancel();
  };

  const selectDrug = (name) => {
    const d = COMMON_DRUGS.find((c) => c.name === name);
    if (d) setDraft({ ...draft, drug: d.name, withdrawalDays: d.withdrawal, route: d.route, category: d.category });
    else setDraft({ ...draft, drug: name });
  };

  const field = (label, key, type = 'text', extra = {}) => (
    <div className="field" style={{ margin: '0 0 6px' }}>
      <label>{label}</label>
      <input
        type={type}
        value={draft[key] ?? ''}
        onChange={(e) => setDraft({ ...draft, [key]: type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value })}
        {...extra}
      />
    </div>
  );

  const form = (
    <div className="card" style={{ marginBottom: 16, padding: 16 }}>
      <div className="card-title">{adding ? 'Log Treatment' : 'Edit Treatment'}</div>
      {field('Animal (tag or lot)', 'animalLabel')}
      <div className="field" style={{ margin: '0 0 6px' }}>
        <label>Drug</label>
        <select
          value={COMMON_DRUGS.some((d) => d.name === draft.drug) ? draft.drug : 'Other'}
          onChange={(e) => selectDrug(e.target.value)}
          style={{ width: '100%', fontSize: 16, padding: '8px 10px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}
        >
          {COMMON_DRUGS.map((d) => <option key={d.name} value={d.name}>{d.name}{d.withdrawal > 0 ? ` (${d.withdrawal}d)` : ''}</option>)}
        </select>
      </div>
      {draft.drug === 'Other' && field('Drug Name', 'drug')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {field('Dose', 'dose')}
        {field('Route', 'route')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {field('Withdrawal (days)', 'withdrawalDays', 'number')}
        {field('Head Count', 'headCount', 'number')}
      </div>
      {field('Date', 'dateStr', 'date')}
      {field('Notes', 'notes')}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="act-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={save}>
          {adding ? 'Log' : 'Save'}
        </button>
        <button className="act-btn outline" style={{ flex: 1, justifyContent: 'center' }} onClick={cancel}>Cancel</button>
        {editing && (
          <button className="act-btn outline" style={{ justifyContent: 'center', color: 'var(--bad)', borderColor: 'var(--bad)' }} onClick={() => { remove(editing); cancel(); }}>
            Delete
          </button>
        )}
      </div>
    </div>
  );

  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Health & Records</div>

      {activeCount > 0 && (
        <div className="card" style={{ marginBottom: 12, padding: '12px 16px', background: 'var(--warn-bg)', borderColor: 'transparent' }}>
          <div style={{ font: '600 15px/1.3 var(--sans)', color: 'var(--warn)' }}>
            {activeCount} active withdrawal{activeCount > 1 ? 's' : ''}
          </div>
        </div>
      )}

      <div className="filters" style={{ marginBottom: 12 }}>
        <button className={`filt ${!filterClear ? 'on' : ''}`} onClick={() => setFilterClear(false)}>
          All ({treatments.length})
        </button>
        <button className={`filt ${filterClear ? 'on' : ''}`} onClick={() => setFilterClear(true)}>
          Active Withdrawals ({activeCount})
        </button>
      </div>

      {(adding || editing) && form}

      {sorted.length === 0 && !adding && (
        <p style={{ font: '400 15px/1.4 var(--sans)', color: 'var(--ink3)', textAlign: 'center', padding: 24 }}>
          No treatments logged yet. Tap below to log a treatment.
        </p>
      )}

      {sorted.map((e) => {
        const ws = withdrawalStatus(e);
        return (
          <div
            key={e.id}
            className="health-entry"
            onClick={() => { if (!adding && !editing) startEdit(e); }}
            style={{ cursor: adding || editing ? undefined : 'pointer' }}
          >
            <div className="health-head">
              <div>
                <div className="health-animal">{e.animalLabel} — {e.drug}</div>
                <div className="health-treatment">
                  {e.dose && `${e.dose} `}{e.route && `${e.route} · `}{e.category}{e.headCount > 1 ? ` · ${e.headCount} head` : ''}
                </div>
              </div>
              <span className={`pill ${ws.cls}`}>{ws.label}</span>
            </div>
            <div className="health-date">
              {formatDate(e.dateStr)}{ws.clearStr ? ` · Withdrawal ${ws.cleared ? 'cleared' : 'clears'} ${ws.clearStr}` : ''}
            </div>
          </div>
        );
      })}

      {!adding && !editing && (
        <button className="act-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={startAdd}>
          + Log Treatment
        </button>
      )}
    </section>
  );
}
