import { Card } from "@/components/ui/card";
import { COPY, fmtMoney } from "@/lib/copy";
import type { ReportData } from "@/lib/report/view";
import { HBar } from "../svg/HBar";

export function BonusCostCard({ r }: { r: ReportData }) {
  const C = COPY.report.cost;
  const m = r.money;
  const cur = m.currency;
  const ok = m.bonus !== null && m.expectedLoss !== null;
  return (
    <Card id="card-cost" title={C.title} line={C.caption(m.lossPer100, cur)}>
      {ok ? (
        <HBar
          label={C.aria(fmtMoney(m.bonus, cur), fmtMoney(m.expectedLoss, cur))}
          bars={[
            { label: C.bonusLabel, value: m.bonus!, display: fmtMoney(m.bonus, cur), tone: "accent" },
            { label: C.lossLabel, value: m.expectedLoss!, display: fmtMoney(m.expectedLoss, cur), tone: m.expectedLoss! > m.bonus! ? "danger" : "muted" },
          ]}
        />
      ) : null}
    </Card>
  );
}
