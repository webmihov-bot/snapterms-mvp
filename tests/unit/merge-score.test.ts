import { describe, expect, it } from "vitest";
import { buildFlags } from "@/lib/pipeline/flags";
import { merge, sameValue } from "@/lib/pipeline/merge";
import { computeMoney } from "@/lib/pipeline/money";
import { verifyAgainstSource } from "@/lib/pipeline/quotes";
import { score } from "@/lib/pipeline/score";
import { SAMPLE_BONUS, SAMPLE_MAIN } from "@/lib/report/sampleFixture";
import type { DocExtraction } from "@/lib/schema/extraction";
import { fixture } from "../helpers";

const main = fixture("conflict-pair/main.md");
const bonus = fixture("conflict-pair/bonus.md");

describe("verifyAgainstSource", () => {
  it("keeps every fixture value because every quote is in the source", () => {
    expect(verifyAgainstSource(SAMPLE_MAIN, main)).toEqual(SAMPLE_MAIN);
    expect(verifyAgainstSource(SAMPLE_BONUS, bonus)).toEqual(SAMPLE_BONUS);
  });
  it("drops a number whose quote is not in the document", () => {
    const invented: DocExtraction = structuredClone(SAMPLE_BONUS);
    invented.bonus.wageringMultiplier = { value: 20, quote: "Bonuses must be wagered 20 times.", clauseRef: "9.9", confidence: 1, reason: null };
    const v = verifyAgainstSource(invented, bonus);
    expect(v.bonus.wageringMultiplier.value).toBeNull();
    expect(v.bonus.wageringMultiplier.quote).toBeNull();
  });
  it("drops a value without a quote", () => {
    const d: DocExtraction = structuredClone(SAMPLE_BONUS);
    d.bonus.maxBet = { value: { amount: 5, currency: "EUR" }, quote: null, clauseRef: null, confidence: 1, reason: null };
    expect(verifyAgainstSource(d, bonus).bonus.maxBet.value).toBeNull();
  });
  it("drops low-confidence values", () => {
    const d: DocExtraction = structuredClone(SAMPLE_BONUS);
    d.bonus.expiryDays.confidence = 0.3;
    expect(verifyAgainstSource(d, bonus).bonus.expiryDays.value).toBeNull();
  });
});

describe("merge", () => {
  const m = merge(SAMPLE_MAIN, SAMPLE_BONUS);

  it("reports the wagering conflict with both quotes and high severity", () => {
    const c = m.conflicts.find((x) => x.field === "bonus.wageringMultiplier");
    expect(c).toBeDefined();
    expect(c!.main.value).toBe(40);
    expect(c!.bonus.value).toBe(35);
    expect(c!.main.quote).toContain("40 times");
    expect(c!.bonus.quote).toContain("35 times");
    expect(c!.severity).toBe("high");
  });
  it("bonus document wins for bonus fields", () => {
    expect(m.bonus.wageringMultiplier.value).toBe(35);
    expect(m.origin["bonus.wageringMultiplier"]).toBe("bonus");
  });
  it("main document wins for operator and withdrawal fields", () => {
    expect(m.operator.regulator.value).toBe("Malta Gaming Authority");
    expect(m.operator.licenseTier).toBe(3);
    expect(m.origin["withdrawal.processingDays"]).toBe("main");
  });
  it("equal values do not create a conflict", () => {
    expect(m.conflicts.find((x) => x.field === "bonus.minDeposit")).toBeUndefined();
  });
  it("is deterministic", () => {
    expect(merge(SAMPLE_MAIN, SAMPLE_BONUS)).toEqual(m);
  });
  it("main only: bonus values come from main when present, never invented", () => {
    const solo = merge(SAMPLE_MAIN, null);
    expect(solo.conflicts).toEqual([]);
    expect(solo.bonus.maxAmount.value).toBeNull();
  });
  it("sameValue compares objects and strings loosely", () => {
    expect(sameValue({ a: 1, b: { c: "X " } }, { b: { c: "x" }, a: 1 })).toBe(true);
    expect(sameValue({ amount: 5, currency: "EUR" }, { amount: 5, currency: "GBP" })).toBe(false);
  });
});

describe("money + score", () => {
  const m = merge(SAMPLE_MAIN, SAMPLE_BONUS);
  const money = computeMoney(m, 100, null);

  it("computes the four numbers", () => {
    expect(money.bonus).toBe(200);
    expect(money.turnover).toBe(7000);
    expect(money.expectedLoss).toBe(280);
    expect(money.bonusEV).toBe(-80);
    expect(money.lossPer100).toBe(140);
  });
  it("computes cap ratio, spins and coverage", () => {
    expect(money.maxWinCap).toBe(1000);
    expect(money.capRatio).toBe(50);
    expect(money.spins).toBe(1400);
    expect(money.betSize).toBe(5);
    expect(money.cashLock).toBe(true);
    expect(money.coverage).toBe(100);
  });
  it("deposit+bonus base doubles the turnover for a 100% match", () => {
    const x = structuredClone(m);
    x.bonus.wageringBase.value = "deposit_plus_bonus";
    expect(computeMoney(x, 100, null).turnover).toBe(14000);
  });
  it("converts non-EUR amounts with the ECB rate", () => {
    const x = structuredClone(m);
    x.bonus.maxAmount.value = { amount: 172, currency: "GBP" };
    const r = computeMoney(x, 100, { date: "2026-10-30", rates: { EUR: 1, GBP: 0.86 } });
    expect(r.currency).toBe("EUR");
    expect(r.bonus).toBe(200);
    expect(r.fx).toEqual({ source: "GBP", rate: 0.86, date: "2026-10-30" });
  });
  it("scores are within 0-100 and profiles differ", () => {
    const s = score(money);
    for (const p of Object.values(s.profiles)) {
      expect(p.overall).toBeGreaterThanOrEqual(0);
      expect(p.overall).toBeLessThanOrEqual(100);
    }
    expect(s.subscores.cashLock).toBe(20);
    expect(s.subscores.license).toBe(100);
  });
  it("same extraction yields identical money math regardless of provider meta", () => {
    expect(computeMoney(merge(SAMPLE_MAIN, SAMPLE_BONUS), 100, null)).toEqual(money);
  });
  it("derives risk chips with quotes", () => {
    const flags = buildFlags(m, money);
    const ids = flags.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["cash_first", "win_cap", "split_payouts", "low_live_contribution", "excluded_games", "max_bet", "forfeit_on_withdrawal", "void_vpn"]));
    expect(flags.every((f) => f.quote.length > 10)).toBe(true);
    expect(flags[0]!.severity).toBe("high");
  });
});
