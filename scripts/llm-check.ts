import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildLlmConfig, type ProviderConfig } from "../config/llm";
import { cleanPlainText } from "../lib/fetch/clean";
import { analyse } from "../lib/pipeline/analyse";
import { computeMoney } from "../lib/pipeline/money";

/**
 * pnpm llm:check — runs the conflict fixture through the configured provider (and fallback, if set)
 * and checks the extraction against known values. Exit code 1 on any mismatch.
 *   pnpm llm:check            primary + fallback from .env
 *   pnpm llm:check openai     only that provider (uses OPENAI_API_KEY and LLM_MODEL_OPENAI / prices from env)
 */
const read = (f: string) => cleanPlainText(readFileSync(path.join(process.cwd(), "tests", "fixtures", "conflict-pair", f), "utf8"));

const EXPECT = {
  "bonus.maxAmount": 200,
  "bonus.wageringMultiplier": 35,
  "bonus.maxBet": 5,
  "bonus.expiryDays": 7,
  "withdrawal.processingDays.max": 5,
  "operator.licenseTier": 3,
  turnover: 7000,
  expectedLoss: 280,
  bonusEV: -80,
};

async function check(provider: ProviderConfig, base: ReturnType<typeof buildLlmConfig>): Promise<boolean> {
  const cfg = { ...base, primary: provider, fallback: null };
  const started = Date.now();
  const { merged, meta } = await analyse({ main: read("main.md"), bonus: read("bonus.md") }, cfg);
  const money = computeMoney(merged, 100, null);
  const got: Record<string, unknown> = {
    "bonus.maxAmount": merged.bonus.maxAmount.value?.amount ?? null,
    "bonus.wageringMultiplier": merged.bonus.wageringMultiplier.value,
    "bonus.maxBet": merged.bonus.maxBet.value?.amount ?? null,
    "bonus.expiryDays": merged.bonus.expiryDays.value,
    "withdrawal.processingDays.max": merged.withdrawal.processingDays.value?.max ?? null,
    "operator.licenseTier": merged.operator.licenseTier,
    turnover: money.turnover,
    expectedLoss: money.expectedLoss,
    bonusEV: money.bonusEV,
  };
  const conflict = merged.conflicts.find((c) => c.field === "bonus.wageringMultiplier");
  let ok = true;
  console.log(`\n▶ ${provider.id} · ${provider.model}`);
  for (const [k, want] of Object.entries(EXPECT)) {
    const pass = got[k] === want;
    ok &&= pass;
    console.log(`  ${pass ? "✓" : "✗"} ${k}: ${String(got[k])}${pass ? "" : ` (expected ${want})`}`);
  }
  const conflictOk = !!conflict?.main.quote && !!conflict.bonus.quote && conflict.main.value === 40;
  ok &&= conflictOk;
  console.log(`  ${conflictOk ? "✓" : "✗"} conflict 40× vs 35× reported with both quotes`);
  console.log(`  calls ${meta.calls} · tokens ${meta.inputTokens}/${meta.outputTokens} · €${meta.costEur.toFixed(4)} · ${((Date.now() - started) / 1000).toFixed(1)} s`);
  if (meta.costEur > 0.08) {
    ok = false;
    console.log("  ✗ cost above €0.08 target");
  }
  return ok;
}

async function main() {
  const only = process.argv[2];
  const env = { ...process.env };
  if (only) {
    env.LLM_PROVIDER = only;
    env.LLM_MODEL = process.env[`LLM_MODEL_${only.toUpperCase()}`] ?? process.env.LLM_MODEL;
    env.LLM_FALLBACK = "";
  }
  const base = buildLlmConfig(env);
  const providers = [base.primary, ...(base.fallback ? [base.fallback] : [])];
  let all = true;
  for (const p of providers) all = (await check(p, base).catch((e) => (console.error(`  ✗ ${p.id} failed:`, e.message), false))) && all;
  console.log(all ? "\nAll providers pass the fixture." : "\nSome checks failed.");
  process.exit(all ? 0 : 1);
}

void main();
