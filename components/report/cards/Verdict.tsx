"use client";

import { Card, Chip } from "@/components/ui/card";
import { COPY } from "@/lib/copy";
import type { ProfileId } from "@/lib/pipeline/types";
import { quoteFor, type ReportData } from "@/lib/report/view";
import { QuoteTrigger } from "../Quote";
import { Gauge } from "../svg/Gauge";

export function VerdictCard({ r, profile }: { r: ReportData; profile: ProfileId }) {
  const R = COPY.report;
  const p = r.scores.profiles[profile];
  const op = r.extraction.operator;
  const tone = op.licenseTier >= 3 ? "accent" : "neutral";
  return (
    <Card id="card-verdict" title={R.verdictTitle} line={R.verdictLine[p.verdict]}>
      <Gauge score={p.overall} verdict={p.verdict} label={R.scoreAria(p.overall, R.verdict[p.verdict])} />
      <p className="mt-2 text-center text-xl font-semibold">{R.verdict[p.verdict]}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <QuoteTrigger quote={quoteFor(r.extraction, "operator.regulator")} className="no-underline">
          <Chip tone={tone}>{R.licenseChip(op.regulator.value, op.licenseTier)}</Chip>
        </QuoteTrigger>
        <Chip tone={r.coverage === 100 ? "accent" : "neutral"}>{R.coverage[r.coverage]}</Chip>
      </div>
    </Card>
  );
}
