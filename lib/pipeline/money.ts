import { DEFAULT_BET_EUR, FRICTION, HOUSE_EDGE } from "@/config/scoring";
import type { FxTable } from "@/lib/fx/ecb";
import type { MergedExtraction, Money as SrcMoney } from "@/lib/schema/extraction";
import type { Money } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Picks the report currency: EUR when every amount converts, else the dominant source currency. */
function currencyPlan(amounts: (SrcMoney | null)[], fx: FxTable | null): { currency: string; convert: (m: SrcMoney | null) => number | null; fx: Money["fx"] } {
  const present = amounts.filter((a): a is SrcMoney => !!a);
  const sources = [...new Set(present.map((a) => a.currency.toUpperCase()))];
  const allConvertible = sources.every((c) => c === "EUR" || (fx?.rates[c] ?? 0) > 0);
  if (allConvertible) {
    const foreign = sources.find((c) => c !== "EUR");
    const rate = foreign && fx ? fx.rates[foreign] : undefined;
    return {
      currency: "EUR",
      fx: foreign && rate && fx ? { source: foreign, rate, date: fx.date } : null,
      convert: (m) => {
        if (!m) return null;
        const c = m.currency.toUpperCase();
        if (c === "EUR") return m.amount;
        const r = fx?.rates[c];
        return r ? m.amount / r : null;
      },
    };
  }
  const currency = sources[0] ?? "EUR";
  return { currency, fx: null, convert: (m) => (m && m.currency.toUpperCase() === currency ? m.amount : null) };
}

export function payoutFriction(w: MergedExtraction["withdrawal"]): number | null {
  const known = [w.processingDays.value, w.splitPayouts.value, w.feePercent.value, w.sameMethodRequired.value, w.kycRequired.value].some((v) => v !== null);
  if (!known) return null;
  let score = 100;
  const days = w.processingDays.value?.max;
  if (days !== undefined) score -= Math.min(FRICTION.maxProcessingPenalty, Math.max(0, days - 1) * FRICTION.perProcessingDayOver1);
  if (w.splitPayouts.value) score -= FRICTION.splitPayouts;
  if ((w.feePercent.value ?? 0) > 0) score -= FRICTION.fee;
  if (w.sameMethodRequired.value) score -= FRICTION.sameMethod;
  if (w.kycRequired.value) score -= FRICTION.kyc[w.kycRequired.value] ?? 0;
  return Math.max(0, Math.min(100, score));
}

/** Pure money math. No LLM, no I/O. */
export function computeMoney(x: MergedExtraction, coverage: 0 | 60 | 100, fx: FxTable | null): Money {
  const b = x.bonus;
  const cap = b.maxWinCap.value;
  const plan = currencyPlan([b.maxAmount.value, b.minDeposit.value, b.maxBet.value, cap?.amount ?? null], fx);

  const bonus = plan.convert(b.maxAmount.value);
  const minDeposit = plan.convert(b.minDeposit.value);
  const m = b.wageringMultiplier.value;
  const base = b.wageringBase.value;
  const pct = b.percent.value;
  const depositForBonus = bonus !== null ? (pct && pct > 0 ? bonus / (pct / 100) : bonus) : null;

  let turnover: number | null = null;
  if (bonus !== null && m !== null) {
    turnover = base === "deposit_plus_bonus" && depositForBonus !== null ? (bonus + depositForBonus) * m : bonus * m;
  }
  const expectedLoss = turnover !== null ? turnover * HOUSE_EDGE : null;
  const bonusEV = bonus !== null && expectedLoss !== null ? bonus - expectedLoss : null;

  let maxWinCap: number | null = null;
  if (cap) {
    if (cap.kind === "fixed") maxWinCap = plan.convert(cap.amount);
    else if (cap.x !== null) maxWinCap = cap.of === "deposit" ? (minDeposit !== null ? minDeposit * cap.x : null) : bonus !== null ? bonus * cap.x : null;
  }
  const capRatio = maxWinCap !== null && minDeposit && minDeposit > 0 ? maxWinCap / minDeposit : null;

  const maxBet = plan.convert(b.maxBet.value);
  const betSize = maxBet !== null && maxBet > 0 ? Math.min(maxBet, DEFAULT_BET_EUR) : DEFAULT_BET_EUR;
  const spins = turnover !== null ? Math.ceil(turnover / betSize) : null;

  return {
    currency: plan.currency,
    fx: plan.fx,
    bonus: bonus !== null ? round2(bonus) : null,
    depositForBonus: depositForBonus !== null ? round2(depositForBonus) : null,
    wageringMultiplier: m,
    wageringBase: base,
    turnover: turnover !== null ? round2(turnover) : null,
    houseEdge: HOUSE_EDGE,
    expectedLoss: expectedLoss !== null ? round2(expectedLoss) : null,
    bonusEV: bonusEV !== null ? round2(bonusEV) : null,
    lossPer100: bonus && expectedLoss !== null ? round2((expectedLoss / bonus) * 100) : null,
    maxWinCap: maxWinCap !== null ? round2(maxWinCap) : null,
    minDeposit: minDeposit !== null ? round2(minDeposit) : null,
    capRatio: capRatio !== null ? round2(capRatio) : null,
    cashLock: b.cashFirst.value,
    betSize,
    spins,
    expiryDays: b.expiryDays.value,
    payoutFriction: payoutFriction(x.withdrawal),
    licenseTier: x.operator.licenseTier,
    coverage,
  };
}
