"use client";

import { Card } from "@/components/ui/card";
import { COPY, fmtMoney } from "@/lib/copy";
import { formatValue, quoteFor, type QuoteRef, type ReportData } from "@/lib/report/view";
import { QuoteTrigger } from "../Quote";

function Tile({ label, value, formula, quote, negative, sourceNote }: { label: string; value: string; formula: string; quote: QuoteRef; negative?: boolean; sourceNote?: string | null }) {
  return (
    <div className="rounded-input bg-surface-muted p-3">
      <p className="text-sm text-text-muted">{label}</p>
      <QuoteTrigger quote={quote}>
        <span className={`text-lg font-semibold tabular ${negative ? "text-danger" : ""}`}>{value}</span>
      </QuoteTrigger>
      <p className="mt-1 text-formula text-text-muted">{formula}</p>
      {sourceNote ? <p className="text-formula text-text-muted">{sourceNote}</p> : null}
    </div>
  );
}

export function MoneyCard({ r }: { r: ReportData }) {
  const M = COPY.report.money;
  const m = r.money;
  const x = r.extraction;
  const cur = m.currency;
  const wq = quoteFor(x, "bonus.wageringMultiplier");
  const src = x.bonus.maxAmount.value;
  const sourceNote = src && src.currency.toUpperCase() !== cur ? M.sourceAmount(formatValue("bonus.maxAmount", src)) : null;
  const neg = m.bonusEV !== null && m.bonusEV < 0;
  const scale = m.bonus && m.expectedLoss !== null ? Math.max(m.bonus, m.expectedLoss) : 0;

  return (
    <Card id="card-money" title={M.title} line={M.line(m.bonusEV, cur)}>
      <div className="grid grid-cols-2 gap-3">
        <Tile label={M.bonus} value={fmtMoney(m.bonus, cur)} formula={M.fBonus(x.bonus.percent.value)} quote={quoteFor(x, "bonus.maxAmount")} sourceNote={sourceNote} />
        <Tile label={M.turnover} value={fmtMoney(m.turnover, cur)} formula={M.fTurnover(m.wageringMultiplier, m.wageringBase)} quote={wq} />
        <Tile label={M.loss} value={fmtMoney(m.expectedLoss, cur)} formula={M.fLoss(m.houseEdge)} quote={wq} />
        <Tile label={M.ev} value={fmtMoney(m.bonusEV, cur)} formula={M.fEv} quote={quoteFor(x, "bonus.maxAmount")} negative={neg} />
      </div>
      {neg && scale > 0 && m.bonus !== null && m.expectedLoss !== null ? (
        <svg viewBox="0 0 300 20" role="img" aria-label={M.negAria(m.expectedLoss, m.bonus, cur)} className="mt-4 block w-full">
          <rect x="0" y="4" width={(m.bonus / scale) * 300} height="12" rx="6" className="fill-current text-accent" />
          <rect x={(m.bonus / scale) * 300} y="4" width={Math.max(2, ((m.expectedLoss - m.bonus) / scale) * 300)} height="12" rx="6" className="fill-current text-danger" />
        </svg>
      ) : null}
      {m.fx ? <p className="mt-3 text-formula text-text-muted">{M.fx(m.fx.source, m.fx.rate, m.fx.date)}</p> : null}
    </Card>
  );
}
