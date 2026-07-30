import { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore.js';

const DEFAULT_ANIMALS = [
  { id: 'a-422', tag: '422', species: 'cattle', breed: 'Black Angus', sex: 'Cow', weight: 1180, pasture: 'North 80', status: 'Active', headCount: 1 },
  { id: 'a-388', tag: '388', species: 'cattle', breed: 'Angus', sex: 'Steer', weight: 650, pasture: 'South Creek', status: 'On feed', headCount: 1 },
  { id: 'a-401', tag: '401', species: 'cattle', breed: 'Crossbred', sex: 'Heifer', weight: 580, pasture: 'Highway', status: 'Active', headCount: 1 },
  { id: 'a-215', tag: '215', species: 'cattle', breed: 'Angus', sex: 'Cow', weight: 1240, pasture: 'North 80', status: 'Active', headCount: 1 },
  { id: 'a-lambs', tag: 'Spring Lambs', species: 'sheep', breed: 'Suffolk Cross', sex: 'Mixed', weight: 85, pasture: 'East Pasture', status: 'Active', headCount: 34, isLot: true },
];

function emptyAnimal() {
  return { id: `a-${Date.now()}`, tag: '', species: 'cattle', breed: '', sex: 'Steer', weight: 0, pasture: '', status: 'Active', headCount: 1, isLot: false, notes: '' };
}

export default function AnimalsPanel() {
  const { items: animals, add, update, remove } = useStore('arpent.animals');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyAnimal());

  const list = animals.length > 0 ? animals : DEFAULT_ANIMALS;

  const filtered = useMemo(() => {
    if (filter === 'all') return list;
    return list.filter((a) => a.species === filter);
  }, [list, filter]);

  const counts = useMemo(() => {
    let cattle = 0, sheep = 0;
    list.forEach((a) => {
      const h = a.headCount || 1;
      if (a.species === 'sheep') sheep += h;
      else cattle += h;
    });
    return { total: cattle + sheep, cattle, sheep };
  }, [list]);

  const startAdd = () => { setDraft(emptyAnimal()); setAdding(true); setEditing(null); };
  const startEdit = (a) => { setDraft({ ...a }); setEditing(a.id); setAdding(false); };
  const cancel = () => { setAdding(false); setEditing(null); };

  const save = () => {
    if (!draft.tag.trim()) return;
    if (adding) {
      add(draft);
      if (animals.length === 0) {
        DEFAULT_ANIMALS.forEach((a) => add(a));
        add(draft);
      }
    } else if (editing) {
      update(editing, draft);
    }
    cancel();
  };

  const del = (id) => {
    if (animals.length === 0) {
      DEFAULT_ANIMALS.filter((a) => a.id !== id).forEach((a) => add(a));
    } else {
      remove(id);
    }
    setEditing(null);
  };

  const statusClass = (s) => {
    if (s === 'Active') return 'pill-ok';
    if (s === 'On feed') return 'pill-warn';
    if (s === 'Sold') return 'pill-muted';
    return 'pill-accent';
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
      <div className="card-title">{adding ? 'Add Animal' : 'Edit Animal'}</div>
      {field('Tag / Name', 'tag')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="field" style={{ margin: '0 0 6px' }}>
          <label>Species</label>
          <select value={draft.species} onChange={(e) => setDraft({ ...draft, species: e.target.value })}
            style={{ width: '100%', fontSize: 16, padding: '8px 10px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}>
            <option value="cattle">Cattle</option>
            <option value="sheep">Sheep</option>
          </select>
        </div>
        <div className="field" style={{ margin: '0 0 6px' }}>
          <label>Sex</label>
          <select value={draft.sex} onChange={(e) => setDraft({ ...draft, sex: e.target.value })}
            style={{ width: '100%', fontSize: 16, padding: '8px 10px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}>
            <option value="Bull">Bull</option>
            <option value="Cow">Cow</option>
            <option value="Steer">Steer</option>
            <option value="Heifer">Heifer</option>
            <option value="Ram">Ram</option>
            <option value="Ewe">Ewe</option>
            <option value="Wether">Wether</option>
            <option value="Mixed">Mixed</option>
          </select>
        </div>
      </div>
      {field('Breed', 'breed')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {field('Weight (lb)', 'weight', 'number')}
        {field('Head Count', 'headCount', 'number')}
      </div>
      {field('Pasture', 'pasture')}
      <div className="field" style={{ margin: '0 0 6px' }}>
        <label>Status</label>
        <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          style={{ width: '100%', fontSize: 16, padding: '8px 10px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}>
          <option value="Active">Active</option>
          <option value="On feed">On feed</option>
          <option value="Sold">Sold</option>
          <option value="Deceased">Deceased</option>
        </select>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 15px/1 var(--sans)', color: 'var(--ink)', marginBottom: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={draft.isLot || false} onChange={(e) => setDraft({ ...draft, isLot: e.target.checked })} />
        This is a lot (multiple head)
      </label>
      {field('Notes', 'notes')}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="act-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={save}>
          {adding ? 'Add' : 'Save'}
        </button>
        <button className="act-btn outline" style={{ flex: 1, justifyContent: 'center' }} onClick={cancel}>Cancel</button>
        {editing && (
          <button className="act-btn outline" style={{ justifyContent: 'center', color: 'var(--bad)', borderColor: 'var(--bad)' }} onClick={() => del(editing)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );

  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Herd</div>
      <div className="filters">
        <button className={`filt ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>All ({counts.total})</button>
        <button className={`filt ${filter === 'cattle' ? 'on' : ''}`} onClick={() => setFilter('cattle')}>Cattle ({counts.cattle})</button>
        <button className={`filt ${filter === 'sheep' ? 'on' : ''}`} onClick={() => setFilter('sheep')}>Sheep ({counts.sheep})</button>
      </div>

      {(adding || editing) && form}

      {filtered.map((a) => (
        <div
          key={a.id}
          className="animal-row"
          onClick={() => { if (!adding && !editing) startEdit(a); }}
          style={{ cursor: adding || editing ? undefined : 'pointer' }}
        >
          <div className="animal-avatar" style={a.isLot ? { fontSize: 11 } : undefined}>
            {a.isLot ? 'LOT' : (a.tag || '?')}
          </div>
          <div className="animal-info">
            <div className="animal-tag">{a.isLot ? a.tag : `Tag #${a.tag}`}</div>
            <div className="animal-meta">
              {a.breed} {a.sex} · {a.weight ? `${a.weight.toLocaleString()} lb` : '—'}{a.headCount > 1 ? ` · ${a.headCount} hd` : ''} · {a.pasture || '—'}
            </div>
          </div>
          <span className={`pill ${statusClass(a.status)}`}>{a.status}</span>
        </div>
      ))}

      {!adding && !editing && (
        <button className="act-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={startAdd}>
          + Add Animal
        </button>
      )}
    </section>
  );
}
