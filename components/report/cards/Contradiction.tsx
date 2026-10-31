import { Card } from "@/components/ui/card";
import { COPY } from "@/lib/copy";
import { fieldLabel, formatValue, type ReportData } from "@/lib/report/view";

export function ContradictionCard({ r }: { r: ReportData }) {
  const C = COPY.report.contradiction;
  if (!r.conflicts.length) return null;
  return (
    <Card id="card-contradiction" title={C.title} line={C.line}>
      <div className="space-y-6">
        {r.conflicts.map((c) => (
          <div key={c.field}>
            <p className="text-base font-semibold">{fieldLabel(c.field)}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(["main", "bonus"] as const).map((side) => (
                <div key={side} className={`rounded-input border p-3 ${c.severity === "high" ? "border-warn" : "border-border"}`}>
                  <p className="text-sm text-text-muted">{side === "main" ? C.main : C.bonus}</p>
                  <p className="text-lg font-semibold tabular">{formatValue(c.field, c[side].value)}</p>
                  {c[side].quote ? <blockquote className="mt-2 text-sm italic">{c[side].quote}</blockquote> : null}
                  {c[side].clauseRef ? <p className="mt-1 text-formula text-text-muted">{COPY.report.playbook.clause(c[side].clauseRef)}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="rounded-input bg-surface-muted p-3">
          <p className="text-sm font-semibold">{C.trust}</p>
          <p className="mt-1 text-sm">{C.trustBody}</p>
        </div>
      </div>
    </Card>
  );
}
