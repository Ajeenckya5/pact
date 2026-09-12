"use client";

export function ScoreRing({
  value,
  max = 100,
  size = 168,
  label,
  sub,
  color = "#d6ff3f",
  track = "rgba(255,255,255,0.08)",
}: {
  value: number;
  max?: number;
  size?: number;
  label: string;
  sub?: string;
  color?: string;
  track?: string;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = c * (1 - pct);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dash}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-mono text-[42px] leading-none tracking-tight text-cream">{Math.round(value)}</p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-mute">{label}</p>
        {sub ? <p className="mt-1 text-xs text-mute">{sub}</p> : null}
      </div>
    </div>
  );
}

export function Sparkline({
  points,
  color = "#d6ff3f",
  height = 56,
}: {
  points: number[];
  color?: string;
  height?: number;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const w = 160;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = height - ((p - min) / span) * (height - 6) - 3;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-14 w-full">
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Hypnogram() {
  const blocks = [
    { label: "Awake", h: 18, color: "#ff6b4a" },
    { label: "REM", h: 46, color: "#8b7cff" },
    { label: "Light", h: 70, color: "#5cc8ff" },
    { label: "Deep", h: 100, color: "#3b6dff" },
  ];
  const seq = [2, 3, 2, 1, 2, 3, 2, 1, 2, 0, 2, 1, 2, 3, 2, 1, 2, 1, 2, 0];
  return (
    <div>
      <div className="flex h-28 items-end gap-[3px]">
        {seq.map((idx, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${blocks[idx].h}%`, background: blocks[idx].color, opacity: 0.9 }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-mute">
        {blocks.map((b) => (
          <span key={b.label} className="inline-flex items-center gap-2">
            <i className="inline-block h-2 w-2 rounded-full" style={{ background: b.color }} />
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
