import type { LlmConfig } from "@/config/llm";
import { extract, type CallMeta } from "@/lib/llm/extract";
import { dualUserText, singleUserText, systemPrompt } from "@/lib/llm/prompt";
import { truncateClauses } from "@/lib/llm/truncate";
import { docExtractionSchema, dualDocSchema, type DocExtraction, type MergedExtraction, type ReportMeta } from "@/lib/schema/extraction";
import { merge } from "./merge";
import { verifyAgainstSource } from "./quotes";

export type ExtractFn = typeof extract;

export interface AnalyseInput {
  main: string;
  bonus: string | null;
}

function addMeta(a: CallMeta, b: CallMeta): CallMeta {
  return {
    provider: b.provider,
    model: b.model,
    calls: a.calls + b.calls,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    costEur: a.costEur + b.costEur,
    latencyMs: Math.max(a.latencyMs, b.latencyMs),
  };
}

/** Bonus fields are only read from a bonus document; with general terms only they stay null. */
function blankBonus(doc: DocExtraction): DocExtraction {
  const bonus = Object.fromEntries(
    Object.keys(doc.bonus).map((k) => [k, { value: null, quote: null, clauseRef: null, confidence: 0, reason: "not_found" as const }]),
  ) as DocExtraction["bonus"];
  return { ...doc, bonus };
}

/**
 * extract -> verify quotes against source -> deterministic merge.
 *   both docs, combined <= singleCallMaxChars  -> ONE call returning {main, bonus}
 *   both docs, longer                          -> two parallel calls, each clause-truncated
 *   main only                                  -> one call, bonus.* null
 */
export async function analyse(
  input: AnalyseInput,
  cfg: Pick<LlmConfig, "primary" | "fallback" | "singleCallMaxChars" | "perDocMaxChars" | "promptVersion">,
  run: ExtractFn = extract,
): Promise<{ merged: MergedExtraction; meta: ReportMeta }> {
  const config = { primary: cfg.primary, fallback: cfg.fallback };

  if (!input.bonus) {
    const main = truncateClauses(input.main, cfg.singleCallMaxChars).text;
    const r = await run({
      systemPrompt: systemPrompt("single_doc"),
      userText: singleUserText("main", main),
      schema: docExtractionSchema,
      meta: { schemaName: "doc_extraction" },
      config,
    });
    const verified = blankBonus(verifyAgainstSource(r.data, input.main));
    return { merged: merge(verified, null), meta: { ...r.meta, promptVersion: cfg.promptVersion, path: "main_only" } };
  }

  if (input.main.length + input.bonus.length <= cfg.singleCallMaxChars) {
    const r = await run({
      systemPrompt: systemPrompt("dual"),
      userText: dualUserText(input.main, input.bonus),
      schema: dualDocSchema,
      meta: { schemaName: "dual_doc_extraction" },
      config,
    });
    const main = verifyAgainstSource(r.data.main, input.main);
    const bonus = r.data.bonus ? verifyAgainstSource(r.data.bonus, input.bonus) : null;
    return { merged: merge(main, bonus), meta: { ...r.meta, promptVersion: cfg.promptVersion, path: "single" } };
  }

  const [m, b] = await Promise.all(
    (["main", "bonus"] as const).map((role) =>
      run({
        systemPrompt: systemPrompt("single_doc"),
        userText: singleUserText(role, truncateClauses(role === "main" ? input.main : input.bonus!, cfg.perDocMaxChars).text),
        schema: docExtractionSchema,
        meta: { schemaName: "doc_extraction" },
        config,
      }),
    ),
  );
  const main = verifyAgainstSource(m!.data, input.main);
  const bonus = verifyAgainstSource(b!.data, input.bonus);
  return { merged: merge(main, bonus), meta: { ...addMeta(m!.meta, b!.meta), promptVersion: cfg.promptVersion, path: "dual" } };
}
