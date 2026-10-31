import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { ProviderConfig } from "@/config/llm";
import * as schema from "@/lib/db/schema";
import { cleanPlainText } from "@/lib/fetch/clean";
import type { AnyDb } from "@/lib/quota/createReport";

export function fixture(name: string): string {
  return cleanPlainText(readFileSync(path.join(__dirname, "fixtures", name), "utf8"));
}

export async function testDb(): Promise<AnyDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(__dirname, "..", "drizzle") });
  return db as unknown as AnyDb;
}

export const fakeProvider = (id: ProviderConfig["id"] = "anthropic"): ProviderConfig => ({
  id,
  tier: "schema_strict",
  model: "test-model",
  apiKey: "k",
  maxInputChars: 60_000,
  timeoutMs: 1000,
  priceEurPerMTok: { input: 1, output: 2 },
});
