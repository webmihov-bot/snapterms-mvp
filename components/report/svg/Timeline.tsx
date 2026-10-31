export interface Step {
  label: string;
  detail: string;
  known: boolean;
}

/** Four-step horizontal timeline; stacks vertically under 480px via viewBox-free HTML+SVG dots. */
export function Timeline({ steps, label }: { steps: Step[]; label: string }) {
  return (
    <ol aria-label={label} className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.label} className="relative">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className={s.known ? "text-accent" : "text-border"}>
              <circle cx="10" cy="10" r="8" fill="currentColor" />
              <text x="10" y="14" textAnchor="middle" className="fill-surface" style={{ fontSize: 11, fontWeight: 600 }}>
                {i + 1}
              </text>
            </svg>
            <span className="text-sm font-semibold">{s.label}</span>
          </div>
          <p className={`mt-1 pl-7 text-sm tabular ${s.known ? "text-ink" : "text-text-muted"}`}>{s.detail}</p>
        </li>
      ))}
    </ol>
  );
}
