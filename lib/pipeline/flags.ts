import type { DocRole, Field, FlagId, MergedExtraction, ReportFlag, Severity } from "@/lib/schema/extraction";
import type { Money } from "./types";

const RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

/** Risk flags derived from extracted fields (each carries the field's quote), plus clause flags from the LLM. */
export function buildFlags(x: MergedExtraction, m: Money): ReportFlag[] {
  const out: ReportFlag[] = [];
  const add = (id: FlagId, path: string, f: Field<unknown>, severity: Severity) => {
    if (!f.quote) return;
    const role: DocRole = x.origin[path] ?? "main";
    out.push({ id, severity, quote: f.quote, clauseRef: f.clauseRef, docRole: role });
  };
  const b = x.bonus;
  const w = x.withdrawal;

  if (b.cashFirst.value === true) add("cash_first", "bonus.cashFirst", b.cashFirst, "high");
  if (b.forfeitOnWithdrawal.value === true) add("forfeit_on_withdrawal", "bonus.forfeitOnWithdrawal", b.forfeitOnWithdrawal, "high");
  if (b.maxWinCap.value) add("win_cap", "bonus.maxWinCap", b.maxWinCap, m.capRatio !== null && m.capRatio < 10 ? "high" : "medium");
  if (b.expiryDays.value !== null && b.expiryDays.value <= 7) add("short_expiry", "bonus.expiryDays", b.expiryDays, "medium");
  if (b.maxBet.value) add("max_bet", "bonus.maxBet", b.maxBet, "medium");
  if (b.liveContribution.value !== null && b.liveContribution.value <= 10) add("low_live_contribution", "bonus.liveContribution", b.liveContribution, "medium");
  if (w.splitPayouts.value) add("split_payouts", "withdrawal.splitPayouts", w.splitPayouts, "medium");
  if ((w.feePercent.value ?? 0) > 0) add("withdrawal_fee", "withdrawal.feePercent", w.feePercent, "medium");
  if (b.excludedGamesCount.value !== null && b.excludedGamesCount.value > 0) add("excluded_games", "bonus.excludedGamesCount", b.excludedGamesCount, "low");
  if (w.kycRequired.value === "on_withdrawal" || w.kycRequired.value === "always") add("kyc_on_withdrawal", "withdrawal.kycRequired", w.kycRequired, "low");
  if (w.sameMethodRequired.value === true) add("same_method", "withdrawal.sameMethodRequired", w.sameMethodRequired, "low");

  const derived = new Set(out.map((f) => f.id));
  for (const f of x.flags) {
    if (derived.has(f.id)) continue;
    out.push(f);
  }
  return out.sort((a, b2) => RANK[a.severity] - RANK[b2.severity]);
}

export const VOID_FLAGS: FlagId[] = [
  "void_bonus_abuse",
  "void_multiple_accounts",
  "void_vpn",
  "void_irregular_play",
  "void_chargeback",
  "confiscation_discretion",
  "forfeit_on_withdrawal",
  "max_bet",
];
