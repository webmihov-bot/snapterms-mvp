import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __snaptermsDb?: Db };

export function db(): Db {
  if (!globalForDb.__snaptermsDb) {
    // prepare:false keeps us compatible with Supabase's transaction pooler on Vercel
    const sql = postgres(env().DATABASE_URL, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 });
    globalForDb.__snaptermsDb = drizzle(sql, { schema });
  }
  return globalForDb.__snaptermsDb;
}
