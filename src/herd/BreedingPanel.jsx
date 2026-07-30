const ENTRIES = [
  {
    month: 'Sep', day: '14',
    tag: 'Tag #215 — Due', meta: 'Bred to Connealy Consensus · 48 days out',
    status: 'Due', statusClass: 'pill-accent',
  },
  {
    month: 'Sep', day: '22',
    tag: 'Tag #308 — Due', meta: 'Bred to SAV Resource · 56 days out',
    status: 'Due', statusClass: 'pill-accent',
  },
  {
    month: 'Jul', day: '18',
    tag: 'Tag #422 — Calved', meta: 'Bull calf · 82 lb · Tag #447 assigned',
    status: 'Born', statusClass: 'pill-ok',
  },
  {
    month: 'Jul', day: '5',
    tag: 'Tag #190 — Calved', meta: 'Heifer calf · 76 lb · Tag #448 assigned',
    status: 'Born', statusClass: 'pill-ok',
  },
];

export default function BreedingPanel() {
  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Breeding & Calving</div>
      {ENTRIES.map((e, i) => (
        <div key={i} className="breed-entry">
          <div className="breed-date-box">
            <div className="breed-month">{e.month}</div>
            <div className="breed-day">{e.day}</div>
          </div>
          <div className="breed-info">
            <div className="animal-tag">{e.tag}</div>
            <div className="animal-meta">{e.meta}</div>
          </div>
          <span className={`pill ${e.statusClass}`}>{e.status}</span>
        </div>
      ))}
    </section>
  );
}
