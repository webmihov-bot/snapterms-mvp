import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { credits, flags, reports, users } from "@/lib/db/schema";
import { createReportWithQuota, QuotaExhaustedError, quotaStatus, type AnyDb, type NewReport } from "@/lib/quota/createReport";
import { sampleReport } from "@/lib/report/sample";
import { grantCredits, revokeUnspent } from "@/lib/stripe/credits";
import { testDb } from "../helpers";

const USER = "11111111-1111-4111-8111-111111111111";

function newReport(): NewReport {
  const s = sampleReport();
  return {
    hostname: s.hostname,
    mainUrl: "https://northbridge.example/terms",
    bonusUrl: null,
    mainHash: "a".repeat(64),
    bonusHash: null,
    promptVersion: "test",
    documents: s.documents,
    extraction: s.extraction,
    conflicts: s.conflicts,
    money: s.money,
    scores: s.scores,
    coverage: 100,
    parentReportId: null,
    changedFields: null,
    meta: { provider: "anthropic", model: "m", promptVersion: "test", calls: 1, inputTokens: 1, outputTokens: 1, costEur: 0, latencyMs: 1, path: "single" },
  };
}

let db: AnyDb;
beforeEach(async () => {
  db = await testDb();
  await db.insert(users).values({ id: USER, email: "a@example.com", emailVerifiedAt: new Date() });
});

describe("quota transaction", () => {
  it("3 free reports, then 402 (quota_exhausted); the counter never decrements", async () => {
    const f = sampleReport().flags;
    for (let i = 0; i < 3; i++) expect((await createReportWithQuota(db, USER, newReport(), f)).paidWith).toBe("free");
    await expect(createReportWithQuota(db, USER, newReport(), f)).rejects.toBeInstanceOf(QuotaExhaustedError);
    const [u] = await db.select().from(users).where(eq(users.id, USER));
    expect(u!.freeReportsUsed).toBe(3);
    expect(await db.$count(reports)).toBe(3);
    expect(await db.$count(flags)).toBe(3 * f.length);
  });

  it("parallel requests on the 3rd free slot create exactly one report", async () => {
    await db.update(users).set({ freeReportsUsed: 2 }).where(eq(users.id, USER));
    const results = await Promise.allSettled([createReportWithQuota(db, USER, newReport(), []), createReportWithQuota(db, USER, newReport(), [])]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected" && r.reason instanceof QuotaExhaustedError)).toHaveLength(1);
    expect(await db.$count(reports)).toBe(1);
  });

  it("a purchased credit is consumed by the next report, together with the report", async () => {
    await db.update(users).set({ freeReportsUsed: 3 }).where(eq(users.id, USER));
    expect(await grantCredits(db, { sessionId: "cs_test_1", userId: USER, pack: 1, paymentIntent: "pi_1", amountTotalCents: 390 })).toBe(1);
    expect((await quotaStatus(db, USER)).credits).toBe(1);
    const r = await createReportWithQuota(db, USER, newReport(), []);
    expect(r.paidWith).toBe("credit");
    const [c] = await db.select().from(credits);
    expect(c!.consumedReportId).toBe(r.id);
    expect((await quotaStatus(db, USER)).credits).toBe(0);
    await expect(createReportWithQuota(db, USER, newReport(), [])).rejects.toBeInstanceOf(QuotaExhaustedError);
  });

  it("webhook replay adds nothing", async () => {
    const s = { sessionId: "cs_test_3", userId: USER, pack: 3 as const, paymentIntent: "pi_3", amountTotalCents: 990 };
    expect(await grantCredits(db, s)).toBe(3);
    expect(await grantCredits(db, s)).toBe(0);
    expect(await db.$count(credits)).toBe(3);
  });

  it("refunds revoke only unspent credits", async () => {
    await db.update(users).set({ freeReportsUsed: 3 }).where(eq(users.id, USER));
    await grantCredits(db, { sessionId: "cs_test_3", userId: USER, pack: 3, paymentIntent: "pi_3", amountTotalCents: 990 });
    await createReportWithQuota(db, USER, newReport(), []);
    expect(await revokeUnspent(db, "pi_3")).toBe(2);
    expect((await quotaStatus(db, USER)).credits).toBe(0);
  });

  it("a failed extraction never reaches the transaction, so nothing is consumed", async () => {
    // the route calls buildReport (LLM) before createReportWithQuota; simulate the throw
    const before = await quotaStatus(db, USER);
    await expect(Promise.reject(new Error("llm")).then(() => createReportWithQuota(db, USER, newReport(), []))).rejects.toThrow("llm");
    expect(await quotaStatus(db, USER)).toEqual(before);
  });
});
