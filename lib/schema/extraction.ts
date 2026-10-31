import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export const money = z.object({
  amount: z.number().describe("Numeric amount exactly as stated, no currency symbol"),
  currency: z.string().describe("ISO-4217 code, e.g. EUR, GBP, USD, CAD"),
});
export type Money = z.infer<typeof money>;

const reason = z.enum(["not_found", "ambiguous"]);

/** Every extracted value travels with its verbatim quote. A value without a quote is discarded in code. */
export function field<T extends z.ZodType>(value: T) {
  return z.object({
    value: value.nullable(),
    quote: z.string().nullable(),
    clauseRef: z.string().nullable(),
    confidence: z.number(),
    reason: reason.nullable(),
  });
}

export type Field<T> = {
  value: T | null;
  quote: string | null;
  clauseRef: string | null;
  confidence: number;
  reason: "not_found" | "ambiguous" | null;
};

const dayRange = z.object({ min: z.number(), max: z.number() });
const split = z.object({ limit: money, period: z.enum(["day", "week", "month"]) });
const winCap = z.object({
  kind: z.enum(["fixed", "multiple"]),
  amount: money.nullable().describe("Set when kind=fixed"),
  of: z.enum(["bonus", "deposit"]).nullable().describe("Set when kind=multiple"),
  x: z.number().nullable().describe("Multiplier when kind=multiple, e.g. 10 for '10 times the bonus'"),
});

export const FLAG_IDS = [
  "cash_first",
  "win_cap",
  "split_payouts",
  "low_live_contribution",
  "excluded_games",
  "max_bet",
  "short_expiry",
  "withdrawal_fee",
  "forfeit_on_withdrawal",
  "kyc_on_withdrawal",
  "same_method",
  "confiscation_discretion",
  "dormancy_fee",
  "void_bonus_abuse",
  "void_multiple_accounts",
  "void_vpn",
  "void_irregular_play",
  "void_chargeback",
] as const;
export type FlagId = (typeof FLAG_IDS)[number];
export const severity = z.enum(["low", "medium", "high"]);
export type Severity = z.infer<typeof severity>;

/* ------------------------------------------------------------------ */
/* What the LLM returns for ONE document                               */
/* ------------------------------------------------------------------ */

export const operatorSchema = z.object({
  name: field(z.string()),
  domain: field(z.string()),
  regulator: field(z.string()).describe("Licensing authority, e.g. 'Malta Gaming Authority'"),
  licenseNumber: field(z.string()),
});

export const withdrawalSchema = z.object({
  minAmount: field(money),
  feePercent: field(z.number()),
  feeCondition: field(z.string()).describe("When the fee applies, in English"),
  processingDays: field(dayRange).describe("Business days the operator takes to process a withdrawal"),
  splitPayouts: field(split).describe("Maximum paid out per period; larger wins are paid in instalments"),
  sameMethodRequired: field(z.boolean()),
  kycRequired: field(z.enum(["none", "on_withdrawal", "above_threshold", "always"])),
});

export const bonusSchema = z.object({
  maxAmount: field(money).describe("Largest bonus amount offered"),
  percent: field(z.number()).describe("Match percentage, e.g. 100 for a 100% match"),
  minDeposit: field(money),
  wageringMultiplier: field(z.number()).describe("e.g. 35 for '35x'"),
  wageringBase: field(z.enum(["bonus", "deposit_plus_bonus", "winnings"])),
  maxBet: field(money).describe("Maximum stake per spin/round while the bonus is active"),
  slotsContribution: field(z.number()).describe("Percent of slot stakes counted toward wagering, 0-100"),
  liveContribution: field(z.number()).describe("Percent of live casino stakes counted toward wagering, 0-100"),
  excludedGamesCount: field(z.number()).describe("Number of games or game types excluded, if listed"),
  expiryDays: field(z.number()).describe("Days to complete wagering"),
  maxWinCap: field(winCap).describe("Maximum withdrawable winnings from the bonus"),
  cashFirst: field(z.boolean()).describe("true when real money balance is used before bonus funds"),
  forfeitOnWithdrawal: field(z.boolean()).describe("true when withdrawing before wagering is complete forfeits the bonus"),
  maxWinNoDeposit: field(money).describe("Maximum withdrawable from a no-deposit bonus"),
});

export const llmFlagSchema = z.object({
  id: z.enum(FLAG_IDS),
  severity,
  quote: z.string().describe("Verbatim sentence that triggers the flag"),
  clauseRef: z.string().nullable(),
});

export const docExtractionSchema = z.object({
  operator: operatorSchema,
  withdrawal: withdrawalSchema,
  bonus: bonusSchema,
  flags: z.array(llmFlagSchema),
});
export type DocExtraction = z.infer<typeof docExtractionSchema>;

/** One call, both documents: each document is extracted separately; code merges and finds conflicts. */
export const dualDocSchema = z.object({
  main: docExtractionSchema,
  bonus: docExtractionSchema.nullable(),
});
export type DualDocExtraction = z.infer<typeof dualDocSchema>;

/* ------------------------------------------------------------------ */
/* Stored report shapes (filled by code, never by the LLM)             */
/* ------------------------------------------------------------------ */

export type DocRole = "main" | "bonus";
export type SourceType = "url" | "paste" | "file";
export type DocStatus = "read" | "blocked" | "missing";

export interface DocumentMeta {
  role: DocRole;
  sourceType: SourceType | null;
  url: string | null;
  filename: string | null;
  fetchedAt: string | null;
  contentHash: string | null;
  chars: number;
  status: DocStatus;
  reason: string | null;
}

export type Operator = z.infer<typeof operatorSchema> & { licenseTier: 0 | 1 | 2 | 3 };
export type Withdrawal = z.infer<typeof withdrawalSchema>;
export type Bonus = z.infer<typeof bonusSchema>;

export interface ConflictSide {
  quote: string | null;
  clauseRef: string | null;
  value: unknown;
}
export interface Conflict {
  field: string;
  main: ConflictSide;
  bonus: ConflictSide;
  severity: Severity;
}

export interface ReportFlag {
  id: FlagId;
  severity: Severity;
  quote: string;
  clauseRef: string | null;
  docRole: DocRole;
}

export interface MergedExtraction {
  operator: Operator;
  withdrawal: Withdrawal;
  bonus: Bonus;
  /** Which document each bonus/withdrawal/operator value came from, keyed "bonus.maxBet". */
  origin: Record<string, DocRole>;
  conflicts: Conflict[];
  flags: ReportFlag[];
}

export interface ReportMeta {
  provider: string;
  model: string;
  promptVersion: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costEur: number;
  latencyMs: number;
  path: "single" | "dual" | "main_only" | "cache";
}
