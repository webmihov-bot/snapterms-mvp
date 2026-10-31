import "server-only";
import { createHmac } from "node:crypto";
import { and, count, desc, eq, gt } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { fetches } from "@/lib/db/schema";
import { env } from "@/lib/env";
import type { FetchStore } from "./getText";

const CACHE_MS = 7 * 24 * 60 * 60 * 1000;
export const IP_FETCHES_PER_MINUTE = 12;

export function hashIp(ip: string): string {
  return createHmac("sha256", env().APP_SECRET).update(ip).digest("hex");
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "0.0.0.0";
}

export function fetchStore(database: Db, ipHash: string, userId: string | null): FetchStore {
  return {
    async getCached(urlNorm) {
      const [row] = await database
        .select({ text: fetches.text, contentHash: fetches.contentHash, fetchedAt: fetches.fetchedAt, finalUrl: fetches.finalUrl })
        .from(fetches)
        .where(and(eq(fetches.urlNorm, urlNorm), eq(fetches.status, "ok"), gt(fetches.fetchedAt, new Date(Date.now() - CACHE_MS))))
        .orderBy(desc(fetches.fetchedAt))
        .limit(1);
      if (!row?.text || !row.contentHash) return null;
      return { text: row.text, contentHash: row.contentHash, fetchedAt: row.fetchedAt, finalUrl: row.finalUrl };
    },
    async record(r) {
      await database.insert(fetches).values({ ...r, ipHash, userId, chars: r.text?.length ?? 0 });
    },
  };
}

/** Outbound fetches in the last minute from this IP. Cache hits do not count. */
export async function ipFetchesLastMinute(database: Db, ipHash: string): Promise<number> {
  const [row] = await database
    .select({ n: count() })
    .from(fetches)
    .where(and(eq(fetches.ipHash, ipHash), gt(fetches.fetchedAt, new Date(Date.now() - 60_000))));
  return row?.n ?? 0;
}
