import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";
import type { FetchStore } from "@/lib/fetch/getText";
import { SAMPLE_BONUS, SAMPLE_MAIN } from "@/lib/report/sampleFixture";
import { fixture, testDb } from "../helpers";

const extract = vi.hoisted(() => vi.fn());
vi.mock("@/lib/llm/extract", () => ({ extract, ExtractError: class extends Error {} }));

const USER = "22222222-2222-4222-8222-222222222222";
const store: FetchStore = { getCached: async () => null, record: async () => {} };
const meta = { provider: "anthropic", model: "m", calls: 1, inputTokens: 900, outputTokens: 400, costEur: 0.002, latencyMs: 5 };

let db: Db;
beforeAll(() => {
  Object.assign(process.env, { LLM_PROVIDER: "anthropic", LLM_MODEL: "m", ANTHROPIC_API_KEY: "k", LLM_PRICE_IN_EUR_PER_MTOK: "1", LLM_PRICE_OUT_EUR_PER_MTOK: "2" });
});
beforeEach(async () => {
  db = (await testDb()) as unknown as Db;
  await db.insert(users).values({ id: USER, email: "b@example.com", emailVerifiedAt: new Date() });
  extract.mockReset();
  extract.mockImplementation(async (args: { userText: string }) => {
    const both = args.userText.includes('role="main"') && args.userText.includes('role="bonus"');
    return { data: both ? { main: SAMPLE_MAIN, bonus: SAMPLE_BONUS } : SAMPLE_MAIN, meta };
  });
});

async function run(mainText: string, bonusText: string | null, parentId: string | null = null) {
  const { buildReport, readDocuments } = await import("@/lib/pipeline/run");
  const { createReportWithQuota } = await import("@/lib/quota/createReport");
  const docs = await readDocuments(
    { role: "main", kind: "text", text: mainText, sourceType: "paste", filename: null },
    bonusText ? { role: "bonus", kind: "text", text: bonusText, sourceType: "file", filename: "bonus.md" } : null,
    store,
  );
  const parent = parentId ? ((await db.select().from(reports).where(eq(reports.id, parentId)))[0] ?? null) : null;
  const built = await buildReport(db, docs, parent);
  const created = await createReportWithQuota(db, USER, built.values, built.flags);
  return { built, created };
}

describe("documents -> extraction -> report -> quota (end to end, fake LLM)", () => {
  const main = fixture("conflict-pair/main.md");
  const bonus = fixture("conflict-pair/bonus.md");

  it("builds and stores a complete report from two pasted documents", async () => {
    const { built, created } = await run(main, bonus);
    expect(created.paidWith).toBe("free");
    expect(built.values.coverage).toBe(100);
    expect(built.values.hostname).toBe("northbridge.example");
    expect(built.values.money.turnover).toBe(7000);
    expect(built.values.conflicts[0]?.field).toBe("bonus.wageringMultiplier");
    expect(built.values.meta.path).toBe("single");
    expect(built.values.documents.map((d) => d.status)).toEqual(["read", "read"]);
    const [row] = await db.select().from(reports).where(eq(reports.id, created.id));
    expect(row!.scores.profiles.balanced.overall).toBeGreaterThan(0);
  });

  it("same documents again cost zero tokens and still use quota", async () => {
    await run(main, bonus);
    const second = await run(main, bonus);
    expect(extract).toHaveBeenCalledTimes(1);
    expect(second.built.values.meta).toMatchObject({ path: "cache", calls: 0, inputTokens: 0, outputTokens: 0, costEur: 0 });
    expect(second.built.values.money).toEqual((await run(main, bonus)).built.values.money);
    const [u] = await db.select().from(users).where(eq(users.id, USER));
    expect(u!.freeReportsUsed).toBe(3);
  });

  it("general terms only: coverage 60, bonus numbers stay empty, bonus row is 'missing'", async () => {
    const { built } = await run(main, null);
    expect(built.values.coverage).toBe(60);
    expect(built.values.money.bonus).toBeNull();
    expect(built.values.money.turnover).toBeNull();
    expect(built.values.extraction.bonus.wageringMultiplier.value).toBeNull();
    expect(built.values.documents[1]).toMatchObject({ role: "bonus", status: "missing" });
    expect(built.values.meta.path).toBe("main_only");
    expect(Object.values(built.values.scores.profiles).map((p) => p.verdict)).toEqual(["unknown", "unknown", "unknown"]);
  });

  it("an updated report records which numbers changed since its parent", async () => {
    const first = await run(main, bonus);
    const changed = structuredClone(SAMPLE_BONUS);
    changed.bonus.wageringMultiplier = { value: 50, quote: "The bonus amount must be wagered 50 times before it can be converted into withdrawable cash.", clauseRef: "2.1", confidence: 1, reason: null };
    extract.mockImplementation(async () => ({ data: { main: SAMPLE_MAIN, bonus: changed }, meta }));
    const second = await run(main, bonus.replace("wagered 35 times", "wagered 50 times"), first.created.id);
    expect(second.built.values.parentReportId).toBe(first.created.id);
    expect(second.built.values.changedFields).toEqual([{ field: "bonus.wageringMultiplier", before: 35, after: 50 }]);
    expect(second.built.values.money.turnover).toBe(10000);
  });

  it("a failing LLM consumes nothing", async () => {
    extract.mockRejectedValue(new Error("extract_failed"));
    await expect(run(main, bonus)).rejects.toThrow("extract_failed");
    const [u] = await db.select().from(users).where(eq(users.id, USER));
    expect(u!.freeReportsUsed).toBe(0);
    expect(await db.$count(reports)).toBe(0);
  });
});
