export type ProfileId = "risky" | "balanced" | "protected";

export type SubscoreId = "bonusValue" | "wagering" | "winCap" | "cashLock" | "payout" | "license" | "coverage";

export type Verdict = "good" | "caution" | "poor";

export interface ProfileScore {
  overall: number;
  verdict: Verdict;
}

export interface Scores {
  /** null when the input for that metric was not found in the documents */
  subscores: Record<SubscoreId, number | null>;
  profiles: Record<ProfileId, ProfileScore>;
}

/** All derived amounts in `currency` (EUR when conversion was possible). */
export interface Money {
  currency: string;
  /** ECB reference rate used: 1 EUR = rate * source currency. null when the source was EUR or no rate was available. */
  fx: { source: string; rate: number; date: string } | null;
  bonus: number | null;
  depositForBonus: number | null;
  wageringMultiplier: number | null;
  wageringBase: "bonus" | "deposit_plus_bonus" | "winnings" | null;
  turnover: number | null;
  houseEdge: number;
  expectedLoss: number | null;
  bonusEV: number | null;
  lossPer100: number | null;
  maxWinCap: number | null;
  minDeposit: number | null;
  capRatio: number | null;
  cashLock: boolean | null;
  betSize: number;
  spins: number | null;
  expiryDays: number | null;
  payoutFriction: number | null;
  licenseTier: 0 | 1 | 2 | 3;
  coverage: 0 | 60 | 100;
}

export interface ChangedField {
  field: string;
  before: unknown;
  after: unknown;
}
