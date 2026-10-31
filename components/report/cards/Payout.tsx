"use client";

import { Card } from "@/components/ui/card";
import { COPY, fmtMoney } from "@/lib/copy";
import { quoteFor, type ReportData } from "@/lib/report/view";
import { QuoteTrigger } from "../Quote";
import { Timeline } from "../svg/Timeline";

export function PayoutCard({ r }: { r: ReportData }) {
  const P = COPY.report.payout;
  const w = r.extraction.withdrawal;
  const days = w.processingDays.value;
  const kyc = w.kycRequired.value;
  const split = w.splitPayouts.value;
  const [request, verification, approval, money] = P.steps;
  return (
    <Card id="card-payout" title={P.title} line={P.line(days?.max ?? null)}>
      <Timeline
        label={P.aria}
        steps={[
          { label: request!, detail: P.instant, known: true },
          { label: verification!, detail: kyc ? P.kyc[kyc] ?? kyc : P.stepDays(null), known: !!kyc },
          { label: approval!, detail: P.stepDays(days), known: !!days },
          { label: money!, detail: P.stepDays(null), known: false },
        ]}
      />
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {days ? (
          <QuoteTrigger quote={quoteFor(r.extraction, "withdrawal.processingDays")}>
            <span>{P.stepDays(days)}</span>
          </QuoteTrigger>
        ) : null}
        {split ? (
          <QuoteTrigger quote={quoteFor(r.extraction, "withdrawal.splitPayouts")}>
            <span>{P.split(fmtMoney(split.limit.amount, split.limit.currency), split.period)}</span>
          </QuoteTrigger>
        ) : null}
        {kyc ? (
          <QuoteTrigger quote={quoteFor(r.extraction, "withdrawal.kycRequired")}>
            <span>{P.kyc[kyc]}</span>
          </QuoteTrigger>
        ) : null}
      </div>
    </Card>
  );
}
