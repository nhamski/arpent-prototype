import { useState } from 'react';

const FILTERS = ['All (281)', 'Cattle (247)', 'Sheep (34)'];

const ANIMALS = [
  { id: 422, tag: '#422', meta: 'Black Angus Cow · 1,180 lb · North 80', status: 'Active', statusClass: 'pill-ok' },
  { id: 388, tag: '#388', meta: 'Angus Steer · 650 lb · South Creek', status: 'On feed', statusClass: 'pill-warn' },
  { id: 401, tag: '#401', meta: 'Crossbred Heifer · 580 lb · Highway', status: 'Active', statusClass: 'pill-ok' },
  { id: 215, tag: '#215', meta: 'Angus Cow · 1,240 lb · North 80', status: 'Active', statusClass: 'pill-ok' },
  { id: 'lot', tag: 'Spring Lambs', meta: 'Suffolk Cross · 34 hd · ~85 lb avg · East Pasture', status: 'Active', statusClass: 'pill-ok', avatarText: 'LOT', avatarSmall: true },
];

export default function AnimalsPanel() {
  const [filter, setFilter] = useState(0);

  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Herd</div>
      <div className="filters">
        {FILTERS.map((f, i) => (
          <button key={f} className={`filt ${filter === i ? 'on' : ''}`} onClick={() => setFilter(i)}>
            {f}
          </button>
        ))}
      </div>
      {ANIMALS.map((a) => (
        <div key={a.id} className="animal-row">
          <div className="animal-avatar" style={a.avatarSmall ? { fontSize: 11 } : undefined}>
            {a.avatarText || a.id}
          </div>
          <div className="animal-info">
            <div className="animal-tag">Tag {a.tag}</div>
            <div className="animal-meta">{a.meta}</div>
          </div>
          <span className={`pill ${a.statusClass}`}>{a.status}</span>
        </div>
      ))}
      <div style={{ textAlign: 'center', padding: 16, color: 'var(--ink3)', font: '400 15px/1 var(--sans)' }}>
        Showing 5 of 281 · scroll for more
      </div>
    </section>
  );
}
