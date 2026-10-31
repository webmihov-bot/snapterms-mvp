import { COPY, fmtMoney } from "@/lib/copy";
import { VOID_FLAGS } from "@/lib/pipeline/flags";
import type { Money } from "@/lib/pipeline/types";
import type { MergedExtraction } from "@/lib/schema/extraction";
import type { ReportData } from "./view";

export interface PlaybookStep {
  step: string;
  why: string;
  clauseRef: string | null;
  path: string | null;
}

/** 4-6 compliant steps, each tied to a clause. Built from extracted fields only. */
export function buildPlaybook(x: MergedExtraction, m: Money): PlaybookStep[] {
  const P = COPY.playbook;
  const b = x.bonus;
  const w = x.withdrawal;
  const steps: PlaybookStep[] = [];
  const push = (s: { step: string; why: string }, path: string | null) => {
    const f = path ? (x[path.split(".")[0] as "bonus" | "withdrawal"] as unknown as Record<string, { clauseRef: string | null }>)[path.split(".")[1]!] : null;
    steps.push({ ...s, clauseRef: f?.clauseRef ?? null, path });
  };

  if (m.bonusEV !== null && m.bonusEV < 0 && m.expectedLoss !== null && m.bonus !== null)
    push(P.declineEv(fmtMoney(m.expectedLoss, m.currency), fmtMoney(m.bonus, m.currency)), "bonus.wageringMultiplier");
  if (b.maxBet.value) push(P.maxBet(fmtMoney(b.maxBet.value.amount, b.maxBet.value.currency)), "bonus.maxBet");
  if (m.turnover !== null) push(P.turnover(fmtMoney(m.turnover, m.currency), m.expiryDays), "bonus.wageringMultiplier");
  if (b.slotsContribution.value !== null || b.liveContribution.value !== null)
    push(P.contribution(b.slotsContribution.value, b.liveContribution.value), b.slotsContribution.value !== null ? "bonus.slotsContribution" : "bonus.liveContribution");
  if (b.cashFirst.value === true) push(P.cashFirst(), "bonus.cashFirst");
  if (m.maxWinCap !== null) push(P.cap(fmtMoney(m.maxWinCap, m.currency)), "bonus.maxWinCap");
  if (b.forfeitOnWithdrawal.value === true) push(P.forfeit(), "bonus.forfeitOnWithdrawal");
  if (w.kycRequired.value === "on_withdrawal" || w.kycRequired.value === "always") push(P.kyc(), "withdrawal.kycRequired");
  if (w.sameMethodRequired.value === true) push(P.sameMethod(), "withdrawal.sameMethodRequired");
  if ((w.feePercent.value ?? 0) > 0) push(P.fee(w.feePercent.value!), "withdrawal.feePercent");

  const out = steps.slice(0, 5);
  out.push({ ...P.readAll(), clauseRef: null, path: null });
  return out;
}

/** 3-5 void clauses: dedicated void flags first, then forfeit and max-bet rules. */
export function voidClauses(r: Pick<ReportData, "flags">) {
  return r.flags.filter((f) => VOID_FLAGS.includes(f.id)).sort((a, b) => VOID_FLAGS.indexOf(a.id) - VOID_FLAGS.indexOf(b.id)).slice(0, 5);
}
