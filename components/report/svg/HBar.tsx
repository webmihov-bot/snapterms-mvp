export interface Bar {
  label: string;
  value: number;
  display: string;
  tone: "accent" | "danger" | "muted";
}

const FILL = { accent: "text-accent", danger: "text-danger", muted: "text-text-muted" } as const;

/** Horizontal bars drawn to a shared scale. */
export function HBar({ bars, label }: { bars: Bar[]; label: string }) {
  const max = Math.max(1, ...bars.map((b) => Math.abs(b.value)));
  const rowH = 44;
  return (
    <svg viewBox={`0 0 320 ${bars.length * rowH}`} role="img" aria-label={label} className="block w-full">
      {bars.map((b, i) => {
        const w = Math.max(2, (Math.abs(b.value) / max) * 300);
        return (
          <g key={b.label} transform={`translate(0 ${i * rowH})`}>
            <text x="0" y="12" className="fill-text-muted" style={{ fontSize: 12 }}>
              {b.label}
            </text>
            <rect x="0" y="18" width="300" height="14" rx="7" className="fill-current text-surface-muted" />
            <rect x="0" y="18" width={w} height="14" rx="7" className={`fill-current ${FILL[b.tone]}`} />
            <text x="320" y="12" textAnchor="end" className="fill-ink tabular" style={{ fontSize: 12, fontWeight: 600 }}>
              {b.display}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
