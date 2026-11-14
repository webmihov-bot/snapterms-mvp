import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * pnpm db:migrate — applies drizzle/*.sql to DATABASE_URL (or DIRECT_DATABASE_URL).
 * With --soft (used by the Netlify build) a missing or unreachable database only logs a warning,
 * so a bad connection string never blocks the deploy. Never prints the connection string itself.
 */
// Soft on Netlify builds too, so the deploy never depends on the database being reachable.
const soft = process.argv.includes("--soft") || process.env.NETLIFY === "true" || Boolean(process.env.CONTEXT && process.env.DEPLOY_ID);

function hostOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}`;
  } catch {
    return "(unparseable URL)";
  }
}

function hint(host: string): string {
  if (/^[a-z0-9]{20}\.supabase\.co:/.test(host))
    return "This is the Supabase API host, not Postgres. Use Supabase → Connect → Transaction pooler (host like aws-0-<region>.pooler.supabase.com, port 6543).";
  if (/^db\.[a-z0-9]{20}\.supabase\.co:/.test(host))
    return "The direct db.<ref>.supabase.co host is IPv6-only and unreachable from Netlify. Use the Transaction pooler (port 6543) or Session pooler (port 5432) string instead.";
  return "Check the host, port, password and that the database accepts external connections.";
}

async function main() {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    if (soft) {
      console.warn("[migrate] DATABASE_URL is not set; skipping migrations.");
      return;
    }
    throw new Error("Set DATABASE_URL (or DIRECT_DATABASE_URL) before running migrations.");
  }
  const host = hostOf(url);
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
    console.log(`[migrate] Migrations applied to ${host}.`);
  } catch (err) {
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    const reason = cause?.code ?? cause?.message ?? (err as Error).message;
    const msg = `[migrate] Could not apply migrations to ${host} (${reason}). ${hint(host)}`;
    if (!soft) throw new Error(msg);
    console.warn(`${msg}\n[migrate] Continuing the build; the app will not be able to reach the database until this is fixed.`);
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(soft ? 0 : 1);
});
