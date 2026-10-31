import type { ProviderConfig } from "@/config/llm";

export interface ProviderRequest {
  system: string;
  user: string;
  /** Strict JSON Schema; used natively only by schema_strict providers. */
  jsonSchema: Record<string, unknown>;
  schemaName: string;
}

export interface ProviderResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export type ProviderFn = (cfg: ProviderConfig, req: ProviderRequest) => Promise<ProviderResponse>;

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
