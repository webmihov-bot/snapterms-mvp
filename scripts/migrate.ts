import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** pnpm db:migrate — applies drizzle/*.sql to DATABASE_URL (use the direct/session connection, not the transaction pooler). */
async function main() {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (or DIRECT_DATABASE_URL) before running migrations.");
  const sql = postgres(url, { max: 1, prepare: false });
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
