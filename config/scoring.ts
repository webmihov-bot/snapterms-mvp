import type { ProfileId, SubscoreId, Verdict } from "@/lib/pipeline/types";

/** Average house edge assumed on wagering. 4% = typical slot RTP of 96%. */
export const HOUSE_EDGE = 0.04;

/** Default stake per spin used for the "N spins" caption, capped by the extracted max bet. */
export const DEFAULT_BET_EUR = 5;

export const PROFILES: ProfileId[] = ["risky", "balanced", "protected"];
export const DEFAULT_PROFILE: ProfileId = "balanced";

/** Weights per profile. Each row sums to 1. Missing subscores are dropped and the rest renormalised. */
export const WEIGHTS: Record<ProfileId, Record<SubscoreId, number>> = {
  risky: { bonusValue: 0.3, wagering: 0.2, winCap: 0.15, cashLock: 0.05, payout: 0.1, license: 0.1, coverage: 0.1 },
  balanced: { bonusValue: 0.2, wagering: 0.2, winCap: 0.15, cashLock: 0.1, payout: 0.15, license: 0.1, coverage: 0.1 },
  protected: { bonusValue: 0.1, wagering: 0.15, winCap: 0.1, cashLock: 0.15, payout: 0.2, license: 0.2, coverage: 0.1 },
};

export const VERDICT_THRESHOLDS: { min: number; verdict: Verdict }[] = [
  { min: 70, verdict: "good" },
  { min: 45, verdict: "caution" },
  { min: 0, verdict: "poor" },
];

/** Payout friction deductions (from 100). */
export const FRICTION = {
  perProcessingDayOver1: 5,
  maxProcessingPenalty: 40,
  splitPayouts: 20,
  fee: 10,
  sameMethod: 5,
  kyc: { none: 0, above_threshold: 3, on_withdrawal: 5, always: 10 } as Record<string, number>,
};

/**
 * Licence tiers: 3 EU/UK regulators, 2 recognised offshore, 1 tribal/sovereign, 0 none stated.
 * Matched case-insensitively against the extracted regulator name.
 */
const TIER_PATTERNS: [RegExp, 1 | 2 | 3][] = [
  [/\bUK ?GC\b|gambling commission(?! of)|great britain/i, 3],
  [/malta gaming authority|\bMGA\b/i, 3],
  [/spelinspektionen|swedish gambling authority/i, 3],
  [/kansspelautoriteit|\bKSA\b/i, 3],
  [/gemeinsame gl[uü]cksspielbeh[oö]rde|\bGGL\b/i, 3],
  [/spillemyndigheden|danish gambling authority/i, 3],
  [/\bADM\b|agenzia delle dogane e dei monopoli/i, 3],
  [/dirección general de ordenación del juego|\bDGOJ\b/i, 3],
  [/\bANJ\b|autorité nationale des jeux/i, 3],
  [/gambling regulatory authority of ireland|\bGRAI\b/i, 3],
  [/\bSRIJ\b|serviço de regulação e inspeção de jogos/i, 3],
  [/gibraltar/i, 2],
  [/isle of man|gambling supervision commission/i, 2],
  [/alderney/i, 2],
  [/curaçao|curacao|\bCGA\b|gaming control board/i, 2],
  [/anjouan/i, 2],
  [/kahnawake/i, 1],
  [/tribal|sovereign|first nation/i, 1],
];

export function licenseTier(regulator: string | null | undefined): 0 | 1 | 2 | 3 {
  if (!regulator) return 0;
  for (const [re, tier] of TIER_PATTERNS) if (re.test(regulator)) return tier;
  return 1;
}

export function verdictFor(score: number): Verdict {
  return VERDICT_THRESHOLDS.find((t) => score >= t.min)?.verdict ?? "poor";
}
