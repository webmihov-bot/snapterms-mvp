"use client";

import { Card } from "@/components/ui/card";
import { COPY, fmtNumber } from "@/lib/copy";
import { quoteFor, type ReportData } from "@/lib/report/view";
import { QuoteTrigger } from "../Quote";
import { SquareGrid } from "../svg/SquareGrid";

export function WageringCard({ r }: { r: ReportData }) {
  const W = COPY.report.wagering;
  const m = r.money;
  const mult = m.wageringMultiplier;
  return (
    <Card id="card-wagering" title={W.title} line={W.caption(m.betSize, m.spins, m.expiryDays, m.currency)}>
      {mult !== null ? (
        <div className="flex flex-wrap items-center gap-4">
          <SquareGrid filled={mult} label={W.aria(mult)} />
          <QuoteTrigger quote={quoteFor(r.extraction, "bonus.wageringMultiplier")}>
            <span className="text-xl font-semibold tabular">{fmtNumber(mult)}</span>
            <span className="ml-1 text-sm text-text-muted">{W.multiplierUnit}</span>
          </QuoteTrigger>
          {mult > 40 ? <p className="w-full text-sm text-text-muted">{W.over(mult)}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
