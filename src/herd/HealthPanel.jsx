const ENTRIES = [
  {
    animal: 'Tag #422 — Draxxin',
    treatment: '1.1 mL subcutaneous · Respiratory',
    status: '34 days', statusClass: 'pill-bad',
    date: 'Jul 26, 2026 · Withdrawal clears Aug 29',
  },
  {
    animal: 'Tag #388 — Ivermectin Pour-on',
    treatment: '10 mL topical · Parasite',
    status: 'Clear', statusClass: 'pill-ok',
    date: 'Jul 15, 2026 · Withdrawal cleared Jul 29',
  },
  {
    animal: 'Spring Lambs — CDT Vaccine',
    treatment: '2 mL subcutaneous · 34 head',
    status: 'No withdrawal', statusClass: 'pill-muted',
    date: 'Jul 10, 2026',
  },
  {
    animal: 'Tag #401 — LA-200',
    treatment: '15 mL intramuscular · Foot rot',
    status: 'Clear', statusClass: 'pill-ok',
    date: 'Jun 28, 2026 · Withdrawal cleared Jul 26',
  },
];

export default function HealthPanel() {
  return (
    <section className="screen on">
      <div className="sh" style={{ marginTop: 0 }}>Health & Records</div>
      {ENTRIES.map((e, i) => (
        <div key={i} className="health-entry">
          <div className="health-head">
            <div>
              <div className="health-animal">{e.animal}</div>
              <div className="health-treatment">{e.treatment}</div>
            </div>
            <span className={`pill ${e.statusClass}`}>{e.status}</span>
          </div>
          <div className="health-date">{e.date}</div>
        </div>
      ))}
    </section>
  );
}
