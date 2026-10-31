import { buildFlags } from "@/lib/pipeline/flags";
import { merge } from "@/lib/pipeline/merge";
import { computeMoney } from "@/lib/pipeline/money";
import { score } from "@/lib/pipeline/score";
import { SAMPLE_BONUS, SAMPLE_MAIN } from "./sampleFixture";
import type { ReportData } from "./view";

/** Illustrative report computed by the real pipeline from the fictional fixture. */
export function sampleReport(): ReportData {
  const merged = merge(SAMPLE_MAIN, SAMPLE_BONUS);
  const money = computeMoney(merged, 100, null);
  return {
    id: "00000000-0000-0000-0000-000000000000",
    createdAt: "2026-10-31T09:00:00.000Z",
    hostname: "northbridge.example",
    documents: [
      { role: "main", sourceType: "url", url: "https://northbridge.example/terms", filename: null, fetchedAt: null, contentHash: null, chars: 1742, status: "read", reason: null },
      { role: "bonus", sourceType: "url", url: "https://northbridge.example/welcome-bonus-terms", filename: null, fetchedAt: null, contentHash: null, chars: 1295, status: "read", reason: null },
    ],
    extraction: merged,
    conflicts: merged.conflicts,
    money,
    scores: score(money),
    coverage: 100,
    flags: buildFlags(merged, money),
    changedFields: null,
    parentCreatedAt: null,
    lastCheckedAt: null,
    mainUrl: null,
    bonusUrl: null,
    latencyMs: null,
  };
}
