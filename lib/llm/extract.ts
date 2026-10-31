import type { z } from "zod";
import { llmConfig, type ProviderConfig } from "@/config/llm";
import { toStrictJsonSchema } from "./jsonSchema";
import { repairText } from "./prompt";
import { callAnthropic } from "./providers/anthropic";
import { callOpenAI } from "./providers/openai";
import { callOpenAICompatible } from "./providers/openaiCompatible";
import { ProviderError, type ProviderFn } from "./providers/types";

/** The only place a provider is chosen. Nothing else imports a provider SDK. */
const PROVIDERS: Record<ProviderConfig["id"], ProviderFn> = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  deepseek: callOpenAICompatible,
  ollama_cloud: callOpenAICompatible,
};

export interface CallMeta {
  provider: string;
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costEur: number;
  latencyMs: number;
}

export class ExtractError extends Error {
  constructor(
    message: string,
    readonly meta: CallMeta,
  ) {
    super(message);
    this.name = "ExtractError";
  }
}

export interface ExtractArgs<S extends z.ZodType> {
  systemPrompt: string;
  userText: string;
  schema: S;
  meta: { schemaName: string };
  /** Test seam: replace the provider registry. */
  providers?: Partial<Record<ProviderConfig["id"], ProviderFn>>;
  config?: { primary: ProviderConfig; fallback: ProviderConfig | null };
}

export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Response is not JSON");
  }
}

function formatZodError(err: z.ZodError): string {
  return err.issues
    .slice(0, 25)
    .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}

function cost(cfg: ProviderConfig, inTok: number, outTok: number): number {
  return (inTok * cfg.priceEurPerMTok.input + outTok * cfg.priceEurPerMTok.output) / 1_000_000;
}

async function attempt<S extends z.ZodType>(
  cfg: ProviderConfig,
  fn: ProviderFn,
  args: ExtractArgs<S>,
  jsonSchema: Record<string, unknown>,
  meta: CallMeta,
): Promise<z.infer<S> | null> {
  const record = (inTok: number, outTok: number) => {
    meta.calls += 1;
    meta.inputTokens += inTok;
    meta.outputTokens += outTok;
    meta.costEur += cost(cfg, inTok, outTok);
  };

  const req = { system: args.systemPrompt, user: args.userText, jsonSchema, schemaName: args.meta.schemaName };
  let first;
  try {
    first = await fn(cfg, req);
  } catch (err) {
    // one retry for transient provider errors counts as the repair slot
    if (err instanceof ProviderError && err.retryable) {
      first = await fn(cfg, req).catch(() => null);
      if (!first) return null;
    } else {
      return null;
    }
  }
  record(first.inputTokens, first.outputTokens);

  let errorText: string;
  try {
    const parsed = args.schema.safeParse(parseJsonLoose(first.text));
    if (parsed.success) return parsed.data;
    errorText = formatZodError(parsed.error);
  } catch (e) {
    errorText = e instanceof Error ? e.message : "Response is not JSON";
  }

  // exactly one repair call carrying the validation error
  try {
    const repaired = await fn(cfg, { ...req, user: repairText(first.text, errorText) });
    record(repaired.inputTokens, repaired.outputTokens);
    const parsed = args.schema.safeParse(parseJsonLoose(repaired.text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function extract<S extends z.ZodType>(args: ExtractArgs<S>): Promise<{ data: z.infer<S>; meta: CallMeta }> {
  const cfg = args.config ?? llmConfig();
  const registry = { ...PROVIDERS, ...args.providers };
  const jsonSchema = toStrictJsonSchema(args.schema);
  const started = Date.now();
  const meta: CallMeta = { provider: cfg.primary.id, model: cfg.primary.model, calls: 0, inputTokens: 0, outputTokens: 0, costEur: 0, latencyMs: 0 };

  const chain = [cfg.primary, ...(cfg.fallback ? [cfg.fallback] : [])];
  for (const provider of chain) {
    meta.provider = provider.id;
    meta.model = provider.model;
    const data = await attempt(provider, registry[provider.id], args, jsonSchema, meta);
    if (data !== null) {
      meta.latencyMs = Date.now() - started;
      return { data, meta };
    }
  }
  meta.latencyMs = Date.now() - started;
  throw new ExtractError(`extract_failed after ${meta.calls} calls (${chain.map((p) => p.id).join(" -> ")})`, meta);
}
