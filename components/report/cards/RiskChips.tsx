"use client";

import { Card } from "@/components/ui/card";
import { COPY } from "@/lib/copy";
import type { ReportData } from "@/lib/report/view";
import { useQuote } from "../Quote";

const TONE = { high: "bg-danger-soft text-danger", medium: "bg-warn-soft text-warn", low: "bg-surface-muted text-ink" } as const;

export function RiskChipsCard({ r }: { r: ReportData }) {
  const open = useQuote();
  const chips = r.flags.slice(0, 10);
  return (
    <Card id="card-risks" title={COPY.report.risks.title} line={COPY.report.risks.line(chips.length)}>
      {chips.length ? (
        <ul className="flex flex-wrap gap-2">
          {chips.map((f, i) => {
            const c = COPY.flags[f.id];
            return (
              <li key={`${f.id}-${i}`}>
                <button
                  type="button"
                  onClick={() => open({ label: c.title, quote: f.quote, clauseRef: f.clauseRef, role: f.docRole, meaning: c.meaning, action: c.action })}
                  className={`touch inline-flex items-center rounded-pill px-4 text-sm font-semibold ${TONE[f.severity]}`}
                  aria-label={COPY.report.quote.open(c.title)}
                >
                  {c.title}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}
