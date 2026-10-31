import { describe, expect, it, vi } from "vitest";
import { buildLlmConfig } from "@/config/llm";
import { analyse, type ExtractFn } from "@/lib/pipeline/analyse";
import { SAMPLE_BONUS, SAMPLE_MAIN } from "@/lib/report/sampleFixture";
import { fixture, fakeProvider } from "../helpers";

const main = fixture("conflict-pair/main.md");
const bonus = fixture("conflict-pair/bonus.md");
const meta = { provider: "anthropic", model: "m", calls: 1, inputTokens: 100, outputTokens: 50, costEur: 0.001, latencyMs: 10 };

/** Fake LLM: returns the fixture extraction for whichever document(s) the prompt contains. */
const fakeExtract = vi.fn(async (args: Parameters<ExtractFn>[0]) => {
  const hasMain = args.userText.includes('role="main"');
  const hasBonus = args.userText.includes('role="bonus"');
  if (hasMain && hasBonus) return { data: { main: SAMPLE_MAIN, bonus: SAMPLE_BONUS }, meta };
  return { data: hasBonus ? SAMPLE_BONUS : SAMPLE_MAIN, meta };
});
const run = fakeExtract as unknown as ExtractFn;

const cfg = { primary: fakeProvider(), fallback: null, singleCallMaxChars: 55_000, perDocMaxChars: 45_000, promptVersion: "test" };

describe("analyse paths", () => {
  it("single call when combined text fits", async () => {
    fakeExtract.mockClear();
    const r = await analyse({ main, bonus }, cfg, run);
    expect(fakeExtract).toHaveBeenCalledTimes(1);
    expect(r.meta.path).toBe("single");
    expect(r.merged.conflicts.map((c) => c.field)).toContain("bonus.wageringMultiplier");
  });

  it("two calls over 55,000 chars, merging to the same result as one call", async () => {
    const pad = `\n\n99. Appendix\n${"Lorem ipsum dolor sit amet. ".repeat(2200)}`;
    const longMain = main + pad;
    fakeExtract.mockClear();
    const dual = await analyse({ main: longMain, bonus }, cfg, run);
    expect(fakeExtract).toHaveBeenCalledTimes(2);
    expect(dual.meta.path).toBe("dual");
    expect(dual.meta.calls).toBe(2);
    const single = await analyse({ main, bonus }, cfg, run);
    expect(dual.merged).toEqual(single.merged);
  });

  it("main only: one call and every bonus field null with not_found", async () => {
    fakeExtract.mockClear();
    const r = await analyse({ main, bonus: null }, cfg, run);
    expect(fakeExtract).toHaveBeenCalledTimes(1);
    expect(r.meta.path).toBe("main_only");
    for (const f of Object.values(r.merged.bonus)) {
      expect(f.value).toBeNull();
      expect(f.reason).toBe("not_found");
    }
    expect(r.merged.operator.regulator.value).toBe("Malta Gaming Authority");
  });
});

describe("llm config", () => {
  it("fails with a readable error listing every missing variable", () => {
    expect(() => buildLlmConfig({ LLM_PROVIDER: "anthropic" })).toThrowError(/LLM_MODEL is required[\s\S]*ANTHROPIC_API_KEY is required[\s\S]*LLM_PRICE_IN_EUR_PER_MTOK/);
  });
  it("caps char limits by provider", () => {
    const base = { LLM_MODEL: "m", LLM_PRICE_IN_EUR_PER_MTOK: "1", LLM_PRICE_OUT_EUR_PER_MTOK: "1" };
    const a = buildLlmConfig({ ...base, LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k" });
    expect(a.singleCallMaxChars).toBe(51_000);
    const o = buildLlmConfig({ ...base, LLM_PROVIDER: "ollama_cloud", OLLAMA_API_KEY: "k", OLLAMA_BASE_URL: "https://ollama.com/v1" });
    expect(o.primary.tier).toBe("json_only");
    expect(o.singleCallMaxChars).toBe(16_000);
    expect(o.perDocMaxChars).toBe(16_000);
  });
  it("rejects an unknown provider", () => {
    expect(() => buildLlmConfig({ LLM_PROVIDER: "gemini" })).toThrowError(/LLM_PROVIDER must be one of/);
  });
});
