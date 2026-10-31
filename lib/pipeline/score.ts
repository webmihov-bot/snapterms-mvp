import { PROFILES, WEIGHTS, verdictFor } from "@/config/scoring";
import type { Money, ProfileScore, Scores, SubscoreId } from "./types";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Each metric -> 0-100, higher is better for the player. null = not stated in the documents. */
export function subscores(m: Money): Record<SubscoreId, number | null> {
  let wagering: number | null = null;
  if (m.wageringMultiplier !== null) {
    // effective multiplier relative to the bonus amount
    const eff = m.turnover !== null && m.bonus ? m.turnover / m.bonus : m.wageringMultiplier;
    wagering = clamp(100 - eff * 2);
  }
  return {
    bonusValue: m.bonusEV !== null && m.bonus ? clamp(50 + 50 * (m.bonusEV / m.bonus)) : null,
    wagering,
    winCap: m.capRatio !== null ? clamp(Math.min(90, m.capRatio * 5)) : m.bonus !== null ? 100 : null,
    cashLock: m.cashLock === null ? null : m.cashLock ? 20 : 100,
    payout: m.payoutFriction,
    license: clamp((m.licenseTier / 3) * 100),
    coverage: m.coverage,
  };
}

/** Weighted sum per profile; missing subscores are dropped and the remaining weights renormalised. */
export function score(m: Money): Scores {
  const subs = subscores(m);
  const profiles = {} as Scores["profiles"];
  for (const p of PROFILES) {
    let sum = 0;
    let weight = 0;
    for (const [id, w] of Object.entries(WEIGHTS[p]) as [SubscoreId, number][]) {
      const v = subs[id];
      if (v === null) continue;
      sum += v * w;
      weight += w;
    }
    const overall = weight > 0 ? clamp(sum / weight) : 0;
    profiles[p] = { overall, verdict: verdictFor(overall) } satisfies ProfileScore;
  }
  return { subscores: subs, profiles };
}
