import Anthropic from "@anthropic-ai/sdk";
import { ProviderError, type ProviderFn } from "./types";

const clients = new Map<string, Anthropic>();

function client(apiKey: string, timeoutMs: number): Anthropic {
  const key = `${apiKey.slice(-6)}:${timeoutMs}`;
  let c = clients.get(key);
  if (!c) {
    c = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 1 });
    clients.set(key, c);
  }
  return c;
}

export const callAnthropic: ProviderFn = async (cfg, req) => {
  try {
    const res = await client(cfg.apiKey, cfg.timeoutMs).messages.create({
      model: cfg.model,
      max_tokens: 16_000,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: req.jsonSchema },
      },
    });
    if (res.stop_reason === "refusal") throw new ProviderError("The model declined to process this document.", false);
    if (res.stop_reason === "max_tokens") throw new ProviderError("The model ran out of output space.", true);
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return { text, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    if (err instanceof Anthropic.RateLimitError) throw new ProviderError("Anthropic rate limit reached.", true);
    if (err instanceof Anthropic.APIConnectionTimeoutError) throw new ProviderError("Anthropic timed out.", true);
    if (err instanceof Anthropic.APIConnectionError) throw new ProviderError("Could not reach Anthropic.", true);
    if (err instanceof Anthropic.APIError) throw new ProviderError(`Anthropic error ${err.status ?? ""}: ${err.message}`, (err.status ?? 500) >= 500);
    throw err;
  }
};
