"use client";

import { Card } from "@/components/ui/card";
import { COPY } from "@/lib/copy";
import { buildPlaybook } from "@/lib/report/playbook";
import { quoteFor, type ReportData } from "@/lib/report/view";
import { QuoteTrigger } from "../Quote";

export function PlaybookCard({ r }: { r: ReportData }) {
  const P = COPY.report.playbook;
  const steps = buildPlaybook(r.extraction, r.money);
  return (
    <Card id="card-playbook" title={P.title} line={P.line}>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.step} className="flex gap-3">
            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-sm font-semibold text-accent tabular">
              {i + 1}
            </span>
            <div>
              <p className="text-base font-semibold">{s.step}</p>
              <p className="text-sm text-text-muted">
                <span className="font-semibold">{P.why}: </span>
                {s.why}
              </p>
              {s.path ? (
                <QuoteTrigger quote={quoteFor(r.extraction, s.path)} className="mt-1 text-formula text-text-muted">
                  <span>{P.clause(s.clauseRef)}</span>
                </QuoteTrigger>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
