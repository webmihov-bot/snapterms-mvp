import OpenAI from "openai";
import { ProviderError, type ProviderFn } from "./types";

const clients = new Map<string, OpenAI>();

function client(apiKey: string, timeoutMs: number): OpenAI {
  const key = `${apiKey.slice(-6)}:${timeoutMs}`;
  let c = clients.get(key);
  if (!c) {
    c = new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 1 });
    clients.set(key, c);
  }
  return c;
}

export const callOpenAI: ProviderFn = async (cfg, req) => {
  try {
    const res = await client(cfg.apiKey, cfg.timeoutMs).chat.completions.create({
      model: cfg.model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: req.schemaName, strict: true, schema: req.jsonSchema },
      },
    });
    const choice = res.choices[0];
    if (!choice) throw new ProviderError("OpenAI returned no choices.", true);
    if (choice.message.refusal) throw new ProviderError("The model declined to process this document.", false);
    if (choice.finish_reason === "length") throw new ProviderError("The model ran out of output space.", true);
    return {
      text: choice.message.content ?? "",
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
    };
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    if (err instanceof OpenAI.RateLimitError) throw new ProviderError("OpenAI rate limit reached.", true);
    if (err instanceof OpenAI.APIConnectionTimeoutError) throw new ProviderError("OpenAI timed out.", true);
    if (err instanceof OpenAI.APIConnectionError) throw new ProviderError("Could not reach OpenAI.", true);
    if (err instanceof OpenAI.APIError) throw new ProviderError(`OpenAI error ${err.status ?? ""}: ${err.message}`, (err.status ?? 500) >= 500);
    throw err;
  }
};
