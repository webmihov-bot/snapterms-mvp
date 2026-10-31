import type { ReactNode } from "react";

/** Report card shell: title, visual, one sentence of plain English. */
export function Card({ id, title, line, children, className = "" }: { id?: string; title: string; line?: ReactNode; children?: ReactNode; className?: string }) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={`animate-fade rounded-card border border-border bg-surface p-4 shadow-card sm:p-6 ${className}`}>
      <h2 id={headingId} className="text-sm font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </h2>
      {children ? <div className="mt-4">{children}</div> : null}
      {line ? <p className="mt-4 text-base">{line}</p> : null}
    </section>
  );
}

export function Chip({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "good" | "caution" | "poor"; children: ReactNode }) {
  const tones = {
    neutral: "bg-surface-muted text-ink border-border",
    accent: "bg-accent-soft text-accent border-transparent",
    good: "bg-success-soft text-success border-transparent",
    caution: "bg-warn-soft text-warn border-transparent",
    poor: "bg-danger-soft text-danger border-transparent",
  } as const;
  return <span className={`inline-flex items-center rounded-pill border px-3 py-1 text-sm font-semibold ${tones[tone]}`}>{children}</span>;
}
