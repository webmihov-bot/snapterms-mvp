import { COPY } from "@/lib/copy";
import type { Verdict } from "@/lib/pipeline/types";

const TONE: Record<Verdict, string> = { good: "text-success", caution: "text-warn", poor: "text-danger" };

/** Semi-circle gauge 0-100. Traffic-light colour is used only here and in risk chips. */
export function Gauge({ score, verdict, label }: { score: number; verdict: Verdict; label: string }) {
  const s = Math.max(0, Math.min(100, score));
  return (
    <svg viewBox="0 0 200 116" role="img" aria-label={label} className="mx-auto block w-full max-w-[260px]">
      <path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="currentColor" className="text-border" strokeWidth="16" strokeLinecap="round" />
      <path
        d="M 16 100 A 84 84 0 0 1 184 100"
        fill="none"
        stroke="currentColor"
        className={TONE[verdict]}
        strokeWidth="16"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${s} 100`}
      />
      <text x="100" y="92" textAnchor="middle" className="fill-ink tabular" style={{ fontSize: 40, fontWeight: 600 }}>
        {s}
      </text>
      <text x="100" y="112" textAnchor="middle" className="fill-text-muted" style={{ fontSize: 12 }}>
        {COPY.report.outOf}
      </text>
    </svg>
  );
}
