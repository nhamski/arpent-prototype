export default function PriceBars({ months }) {
  const vals = months.map((m) => m.avg).filter((v) => v != null);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const money = (n) => `$${Math.round(n)}`;

  return (
    <div style={s.wrap}>
      <div style={s.row} role="img" aria-label={`Twelve-month price by month, ${money(min)} to ${money(max)} per cwt`}>
        {months.map((m, i) => {
          const last = i === months.length - 1;
          return (
            <div key={m.label + i} style={s.col}>
              <div style={s.track}>
                {m.avg != null && (
                  <div
                    title={`${m.label}: ${money(m.avg)}/cwt`}
                    style={{
                      width: '100%',
                      height: `${(6 + 40 * ((m.avg - min) / (max - min || 1))).toFixed(0)}px`,
                      background: last ? 'var(--accent)' : 'var(--ok)',
                      borderRadius: 2,
                      border: last ? '1.5px solid var(--ink)' : 'none',
                      opacity: last ? 1 : 0.72,
                    }}
                  />
                )}
              </div>
              <div style={{ ...s.tick, color: last ? 'var(--ink)' : 'var(--ink3)', fontWeight: last ? 700 : 400 }}>
                {m.label[0]}
              </div>
            </div>
          );
        })}
      </div>
      <div style={s.scale}>
        <span>{money(min)}</span>
        <span>{money(max)}/cwt over the year</span>
      </div>
    </div>
  );
}

const s = {
  wrap: { marginTop: 12 },
  row: { display: 'flex', gap: 3, alignItems: 'flex-end', height: 48 },
  col: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
  track: { display: 'flex', alignItems: 'flex-end', height: 46, width: '100%' },
  tick: { fontSize: 9, lineHeight: 1 },
  scale: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink3)', marginTop: 4, fontVariantNumeric: 'tabular-nums' },
};
