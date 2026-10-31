import { ProviderError, type ProviderFn } from "./types";

interface ChatResponse {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** DeepSeek (json_object) and Ollama Cloud (prompt-only JSON) over the OpenAI-compatible chat endpoint. */
export const callOpenAICompatible: ProviderFn = async (cfg, req) => {
  if (!cfg.baseUrl) throw new ProviderError(`${cfg.id} has no base URL configured.`, false);
  const body: Record<string, unknown> = {
    model: cfg.model,
    stream: false,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
  };
  if (cfg.id === "deepseek") body.response_format = { type: "json_object" };

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new ProviderError(timedOut ? `${cfg.id} timed out.` : `Could not reach ${cfg.id}.`, true);
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new ProviderError(`${cfg.id} error ${res.status}: ${detail}`, res.status === 429 || res.status >= 500);
  }
  const json = (await res.json()) as ChatResponse;
  const choice = json.choices?.[0];
  if (choice?.finish_reason === "length") throw new ProviderError("The model ran out of output space.", true);
  return {
    text: choice?.message?.content ?? "",
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
  };
};
