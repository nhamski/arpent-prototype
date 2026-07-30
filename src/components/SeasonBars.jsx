import { MON } from '../engine/sellTiming.js';

function heatColor(idx) {
  const t = Math.max(-1, Math.min(1, (idx - 100) / 7));
  const lerp = (a, b, f) => Math.round(a + (b - a) * f);
  const neutral = [237, 227, 200];
  if (t >= 0) {
    const green = [85, 100, 59];
    return `rgb(${lerp(neutral[0], green[0], t)},${lerp(neutral[1], green[1], t)},${lerp(neutral[2], green[2], t)})`;
  }
  const red = [168, 62, 44];
  const f = -t;
  return `rgb(${lerp(neutral[0], red[0], f)},${lerp(neutral[1], red[1], f)},${lerp(neutral[2], red[2], f)})`;
}

export { heatColor };

export default function SeasonBars({ index, month, window: win = [], compact = false }) {
  const min = Math.min(...index);
  const max = Math.max(...index);
  const w = compact ? 14 : 22;

  return (
    <div style={s.row} role="img" aria-label={`Seasonal index by month, January to December. Highest ${MON[index.indexOf(max)]}, lowest ${MON[index.indexOf(min)]}.`}>
      {index.map((idx, i) => (
        <div key={MON[i]} style={s.col}>
          <div style={{ ...s.track, width: w, background: win.includes(i) ? 'var(--line)' : 'transparent' }}>
            <div
              title={`${MON[i]}: ${idx.toFixed(1)}`}
              style={{
                width: w,
                height: `${(12 + 22 * ((idx - min) / (max - min || 1))).toFixed(0)}px`,
                background: heatColor(idx),
                borderRadius: 2,
                flexShrink: 0,
                border: i === month - 1 ? '1.5px solid var(--ink)' : '1px solid rgba(0,0,0,0.05)',
              }}
            />
          </div>
          {!compact && (
            <div style={{ ...s.tick, color: i === month - 1 ? 'var(--ink)' : 'var(--ink3)', fontWeight: i === month - 1 ? 700 : 400 }}>
              {MON[i][0]}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const s = {
  row: { display: 'flex', gap: 3, alignItems: 'flex-end' },
  col: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
  track: { display: 'flex', alignItems: 'flex-end', height: 34, borderRadius: 3 },
  tick: { fontSize: 9, lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
};
