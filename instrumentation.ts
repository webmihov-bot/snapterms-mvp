/** Fails the server at boot with a readable message when configuration is missing. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { env } = await import("@/lib/env");
  const { llmConfig } = await import("@/config/llm");
  env();
  llmConfig();
}
