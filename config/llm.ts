import { z } from "zod";

export type ProviderId = "anthropic" | "openai" | "deepseek" | "ollama_cloud";
export type Tier = "schema_strict" | "json_only";

export interface ProviderConfig {
  id: ProviderId;
  tier: Tier;
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxInputChars: number;
  timeoutMs: number;
  priceEurPerMTok: { input: number; output: number };
}

export interface LlmConfig {
  primary: ProviderConfig;
  fallback: ProviderConfig | null;
  promptVersion: string;
  /** Combined length up to which both documents go into ONE call. */
  singleCallMaxChars: number;
  /** Per-document cap on the two-call path. */
  perDocMaxChars: number;
  maxRepairAttempts: 1;
}

export const PROMPT_VERSION = "extract-2026-10-31";

/** Room kept for the system prompt + schema text inside each provider's char cap. */
const PROMPT_OVERHEAD_CHARS = 9_000;

const PROVIDER_DEFAULTS: Record<ProviderId, { tier: Tier; maxInputChars: number; timeoutMs: number; keyVar: string; baseUrlVar?: string }> = {
  anthropic: { tier: "schema_strict", maxInputChars: 60_000, timeoutMs: 45_000, keyVar: "ANTHROPIC_API_KEY" },
  openai: { tier: "schema_strict", maxInputChars: 60_000, timeoutMs: 45_000, keyVar: "OPENAI_API_KEY" },
  deepseek: { tier: "json_only", maxInputChars: 40_000, timeoutMs: 60_000, keyVar: "DEEPSEEK_API_KEY", baseUrlVar: "DEEPSEEK_BASE_URL" },
  ollama_cloud: { tier: "json_only", maxInputChars: 25_000, timeoutMs: 90_000, keyVar: "OLLAMA_API_KEY", baseUrlVar: "OLLAMA_BASE_URL" },
};

const providerId = z.enum(["anthropic", "openai", "deepseek", "ollama_cloud"]);

function readProvider(
  source: Record<string, string | undefined>,
  idVar: string,
  modelVar: string,
  priceInVar: string,
  priceOutVar: string,
  errors: string[],
): ProviderConfig | null {
  const parsedId = providerId.safeParse(source[idVar]);
  if (!parsedId.success) {
    errors.push(`${idVar} must be one of anthropic | openai | deepseek | ollama_cloud`);
    return null;
  }
  const id = parsedId.data;
  const d = PROVIDER_DEFAULTS[id];
  const model = source[modelVar]?.trim();
  const apiKey = source[d.keyVar]?.trim();
  const priceIn = Number(source[priceInVar]);
  const priceOut = Number(source[priceOutVar]);
  if (!model) errors.push(`${modelVar} is required`);
  if (!apiKey) errors.push(`${d.keyVar} is required because ${idVar}=${id}`);
  if (!Number.isFinite(priceIn) || priceIn < 0 || source[priceInVar] === undefined || source[priceInVar] === "")
    errors.push(`${priceInVar} must be a number (EUR per 1M input tokens)`);
  if (!Number.isFinite(priceOut) || priceOut < 0 || source[priceOutVar] === undefined || source[priceOutVar] === "")
    errors.push(`${priceOutVar} must be a number (EUR per 1M output tokens)`);
  const baseUrl = d.baseUrlVar ? source[d.baseUrlVar]?.trim() : undefined;
  if (d.baseUrlVar && !baseUrl) errors.push(`${d.baseUrlVar} is required because ${idVar}=${id}`);
  if (!model || !apiKey) return null;
  return {
    id,
    tier: d.tier,
    model,
    apiKey,
    baseUrl,
    maxInputChars: d.maxInputChars,
    timeoutMs: d.timeoutMs,
    priceEurPerMTok: { input: priceIn, output: priceOut },
  };
}

export function buildLlmConfig(source: Record<string, string | undefined>): LlmConfig {
  const errors: string[] = [];
  const primary = readProvider(source, "LLM_PROVIDER", "LLM_MODEL", "LLM_PRICE_IN_EUR_PER_MTOK", "LLM_PRICE_OUT_EUR_PER_MTOK", errors);
  let fallback: ProviderConfig | null = null;
  if (source.LLM_FALLBACK?.trim()) {
    fallback = readProvider(
      source,
      "LLM_FALLBACK",
      "LLM_FALLBACK_MODEL",
      "LLM_FALLBACK_PRICE_IN_EUR_PER_MTOK",
      "LLM_FALLBACK_PRICE_OUT_EUR_PER_MTOK",
      errors,
    );
  }
  if (errors.length || !primary) {
    throw new Error(`SnapTerms LLM configuration error. Fix these environment variables:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
  const usable = primary.maxInputChars - PROMPT_OVERHEAD_CHARS;
  return {
    primary,
    fallback,
    promptVersion: PROMPT_VERSION,
    singleCallMaxChars: Math.min(55_000, usable),
    perDocMaxChars: Math.min(45_000, usable),
    maxRepairAttempts: 1,
  };
}

let cached: LlmConfig | null = null;

/** Read once from process.env. Missing keys throw a readable error at boot (see instrumentation.ts). */
export function llmConfig(): LlmConfig {
  if (!cached) cached = buildLlmConfig(process.env);
  return cached;
}
