import { describe, expect, it, vi } from "vitest";
import { extract, ExtractError, parseJsonLoose } from "@/lib/llm/extract";
import { toStrictJsonSchema } from "@/lib/llm/jsonSchema";
import { DOC_SCHEMA_TEXT } from "@/lib/llm/prompt";
import type { ProviderFn } from "@/lib/llm/providers/types";
import { docExtractionSchema, dualDocSchema } from "@/lib/schema/extraction";
import { SAMPLE_MAIN } from "@/lib/report/sampleFixture";
import { fakeProvider } from "../helpers";

const ok = (text: string) => ({ text, inputTokens: 1000, outputTokens: 500 });
const args = (fn: ProviderFn, fallbackFn?: ProviderFn) => ({
  systemPrompt: "s",
  userText: "u",
  schema: docExtractionSchema,
  meta: { schemaName: "doc" },
  config: { primary: fakeProvider("anthropic"), fallback: fallbackFn ? fakeProvider("openai") : null },
  providers: { anthropic: fn, ...(fallbackFn ? { openai: fallbackFn } : {}) },
});

describe("extract", () => {
  it("parses a valid response and prices tokens", async () => {
    const fn = vi.fn<ProviderFn>(async () => ok(JSON.stringify(SAMPLE_MAIN)));
    const r = await extract(args(fn));
    expect(r.data).toEqual(SAMPLE_MAIN);
    expect(r.meta.calls).toBe(1);
    expect(r.meta.costEur).toBeCloseTo((1000 * 1 + 500 * 2) / 1e6);
  });

  it("makes exactly one repair call carrying the zod error", async () => {
    const fn = vi.fn<ProviderFn>().mockResolvedValueOnce(ok('{"operator": 1}')).mockResolvedValueOnce(ok(JSON.stringify(SAMPLE_MAIN)));
    const r = await extract(args(fn));
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[1]![1].user).toContain("Validation errors");
    expect(r.meta.calls).toBe(2);
  });

  it("uses the fallback after a second failure, then throws", async () => {
    const bad = vi.fn<ProviderFn>(async () => ok("not json"));
    const good = vi.fn<ProviderFn>(async () => ok("```json\n" + JSON.stringify(SAMPLE_MAIN) + "\n```"));
    const r = await extract(args(bad, good));
    expect(bad).toHaveBeenCalledTimes(2);
    expect(r.meta.provider).toBe("openai");
    await expect(extract(args(bad))).rejects.toBeInstanceOf(ExtractError);
  });

  it("parseJsonLoose strips fences and prose", () => {
    expect(parseJsonLoose('Here:\n{"a":1}\nThanks')).toEqual({ a: 1 });
  });
});

describe("schemas", () => {
  it("strict JSON schema closes every object and requires every key", () => {
    const walk = (n: unknown): void => {
      if (Array.isArray(n)) return n.forEach(walk);
      if (!n || typeof n !== "object") return;
      const o = n as Record<string, unknown>;
      if (o.type === "object") {
        expect(o.additionalProperties).toBe(false);
        expect(o.required).toEqual(Object.keys(o.properties as object));
      }
      for (const k of ["minimum", "maximum", "minLength", "maxLength", "$schema"]) expect(o[k]).toBeUndefined();
      Object.values(o).forEach(walk);
    };
    walk(toStrictJsonSchema(dualDocSchema));
  });

  it("the prompt's schema text names every schema key", () => {
    for (const group of ["operator", "withdrawal", "bonus"] as const) {
      for (const key of Object.keys(docExtractionSchema.shape[group].shape)) expect(DOC_SCHEMA_TEXT).toContain(`"${key}"`);
    }
  });
});
