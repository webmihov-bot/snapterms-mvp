import { Card } from "@/components/ui/card";
import { COPY } from "@/lib/copy";
import { voidClauses } from "@/lib/report/playbook";
import type { ReportData } from "@/lib/report/view";

export function VoidRisksCard({ r }: { r: ReportData }) {
  const V = COPY.report.void;
  const items = voidClauses(r);
  return (
    <Card id="card-void" title={V.title} line={items.length ? V.line : V.none}>
      {items.length ? (
        <ul className="space-y-4">
          {items.map((f, i) => (
            <li key={`${f.id}-${i}`} className="border-l-2 border-danger pl-3">
              <p className="text-base font-semibold">{COPY.flags[f.id].title}</p>
              <blockquote className="mt-1 text-sm italic">{f.quote}</blockquote>
              {f.clauseRef ? <p className="mt-1 text-formula text-text-muted">{COPY.report.playbook.clause(f.clauseRef)}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
