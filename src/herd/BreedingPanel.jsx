import { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore.js';

function emptyEntry() {
  return {
    id: `b-${Date.now()}`, ts: Date.now(),
    tag: '', sire: '', type: 'bred',
    dueDate: '', birthDate: '', calfTag: '', calfSex: '', birthWeight: 0,
    notes: '',
  };
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function shortDate(str) {
  if (!str) return { month: '—', day: '—' };
  const d = new Date(str + 'T00:00:00');
  return { month: d.toLocaleDateString('en-US', { month: 'short' }), day: String(d.getDate()) };
}

function daysOut(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / 86400000);
}

export default function BreedingPanel() {
  const { items: entries, add, update, remove } = useStore('arpent.breeding');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyEntry());
  const [filterType, setFilterType] = useState('all');

  const sorted = useMemo(() => {
    const s = [...entries].sort((a, b) => {
      const dateA = a.type === 'calved' ? a.birthDate : a.dueDate;
      const dateB = b.type === 'calved' ? b.birthDate : b.dueDate;
      if (!dateA && !dateB) return (b.ts || 0) - (a.ts || 0);
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.localeCompare(dateB);
    });
    if (filterType === 'all') return s;
    return s.filter((e) => e.type === filterType);
  }, [entries, filterType]);

  const dueCount = useMemo(() => entries.filter((e) => e.type === 'bred').length, [entries]);
  const bornCount = useMemo(() => entries.filter((e) => e.type === 'calved').length, [entries]);

  const startAdd = () => { setDraft(emptyEntry()); setAdding(true); setEditing(null); };
  const startEdit = (e) => { setDraft({ ...e }); setEditing(e.id); setAdding(false); };
  const cancel = () => { setAdding(false); setEditing(null); };

  const save = () => {
    if (!draft.tag.trim()) return;
    const entry = { ...draft, ts: Date.now() };
    if (adding) add(entry);
    else if (editing) update(editing, entry);
    cancel();
  };

  const markCalved = (e) => {
    const today = new Date().toISOString().slice(0, 10);
    setDraft({ ...e, type: 'calved', birthDate: today, calfTag: '', calfSex: '', birthWeight: 0 });
    setEditing(e.id);
    setAdding(false);
  };

  const field = (label, key, type = 'text') => (
    <div className="field" style={{ margin: '0 0 6px' }}>
      <label>{label}</label>
      <input
        type={type}
        value={draft[key] ?? ''}
        onChange={(e) => setDraft({ ...draft, [key]: type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value })}
      />
    </div>
  );

  const form = (
    <div className="card" style={{ marginBottom: 16, padding: 16 }}>
      <div className="card-title">{adding ? 'Add Record' : 'Edit Record'}</div>
      {field('Dam Tag', 'tag')}
      {field('Sire', 'sire')}
      <div className="field" style={{ margin: '0 0 6px' }}>
        <label>Type</label>
        <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}
          style={{ width: '100%', fontSize: 16, padding: '8px 10px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}>
          <option value="bred">Bred (due)</option>
          <option value="calved">Calved (born)</option>
        </select>
      </div>
      {draft.type === 'bred' && field('Due Date', 'dueDate', 'date')}
      {draft.type === 'calved' && (
        <>
          {field('Birth Date', 'birthDate', 'date')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {field('Calf Tag', 'calfTag')}
            <div className="field" style={{ margin: '0 0 6px' }}>
              <label>Calf Sex</label>
              <select value={draft.calfSex || ''} onChange={(e) => setDraft({ ...draft, calfSex: e.target.value })}
                style={{ width: '100%', fontSize: 16, padding: '8px 10px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}>
                <option value="">—</option>
                <option value="Bull">Bull calf</option>
                <option value="Heifer">Heifer calf</option>
              </select>
            </div>
          </div>
          {field('Birth Weight (lb)', 'birthWeight', 'number')}
        </>
      )}
      {field('Notes', 'notes')}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="act-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={save}>
          {adding ? 'Add' : 'Save'}
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
      <div className="sh" style={{ marginTop: 0 }}>Breeding & Calving</div>

      <div className="filters" style={{ marginBottom: 12 }}>
        <button className={`filt ${filterType === 'all' ? 'on' : ''}`} onClick={() => setFilterType('all')}>All ({entries.length})</button>
        <button className={`filt ${filterType === 'bred' ? 'on' : ''}`} onClick={() => setFilterType('bred')}>Due ({dueCount})</button>
        <button className={`filt ${filterType === 'calved' ? 'on' : ''}`} onClick={() => setFilterType('calved')}>Born ({bornCount})</button>
      </div>

      {(adding || editing) && form}

      {sorted.length === 0 && !adding && (
        <p style={{ font: '400 15px/1.4 var(--sans)', color: 'var(--ink3)', textAlign: 'center', padding: 24 }}>
          No breeding records yet. Tap below to add one.
        </p>
      )}

      {sorted.map((e) => {
        const isBred = e.type === 'bred';
        const dateStr = isBred ? e.dueDate : e.birthDate;
        const sd = shortDate(dateStr);
        const days = isBred ? daysOut(e.dueDate) : null;

        return (
          <div
            key={e.id}
            className="breed-entry"
            onClick={() => { if (!adding && !editing) startEdit(e); }}
            style={{ cursor: adding || editing ? undefined : 'pointer' }}
          >
            <div className="breed-date-box">
              <div className="breed-month">{sd.month}</div>
              <div className="breed-day">{sd.day}</div>
            </div>
            <div className="breed-info">
              <div className="animal-tag">
                Tag #{e.tag} — {isBred ? 'Due' : 'Calved'}
              </div>
              <div className="animal-meta">
                {e.sire ? `Bred to ${e.sire}` : '—'}
                {isBred && days != null ? ` · ${days > 0 ? `${days} days out` : days === 0 ? 'Due today' : `${Math.abs(days)} days overdue`}` : ''}
                {!isBred && e.calfSex ? ` · ${e.calfSex} calf` : ''}
                {!isBred && e.birthWeight ? ` · ${e.birthWeight} lb` : ''}
                {!isBred && e.calfTag ? ` · Tag #${e.calfTag}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span className={`pill ${isBred ? 'pill-accent' : 'pill-ok'}`}>{isBred ? 'Due' : 'Born'}</span>
              {isBred && !adding && !editing && (
                <button
                  className="act-btn outline"
                  style={{ fontSize: 11, padding: '3px 8px', lineHeight: 1 }}
                  onClick={(ev) => { ev.stopPropagation(); markCalved(e); }}
                >
                  Calved
                </button>
              )}
            </div>
          </div>
        );
      })}

      {!adding && !editing && (
        <button className="act-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={startAdd}>
          + Add Record
        </button>
      )}
    </section>
  );
}
