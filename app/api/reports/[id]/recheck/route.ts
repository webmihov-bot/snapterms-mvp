import { and, eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { reports } from "@/lib/db/schema";
import { clientIp, fetchStore, hashIp, IP_FETCHES_PER_MINUTE, ipFetchesLastMinute } from "@/lib/fetch/store";
import { error, json, sameOrigin } from "@/lib/http";
import { readDocuments } from "@/lib/pipeline/run";
import type { DocInput } from "@/lib/fetch/getText";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Re-fetches the report's URLs (bypassing cache) and compares content hashes. Costs nothing. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return error("forbidden", 403);
  const user = await currentUser();
  if (!user) return error("unauthorized", 401);
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return error("not_found", 404);

  const database = db();
  const [report] = await database.select().from(reports).where(and(eq(reports.id, id), eq(reports.userId, user.id)));
  if (!report) return error("not_found", 404);
  if (!report.mainUrl) return json({ changed: false, unsupported: true });

  const ipHash = hashIp(clientIp(req.headers));
  const n = report.bonusUrl ? 2 : 1;
  if ((await ipFetchesLastMinute(database, ipHash)) + n > IP_FETCHES_PER_MINUTE) return error("rate_ip", 429);

  const main: DocInput = { role: "main", kind: "url", url: report.mainUrl };
  const bonus: DocInput | null = report.bonusUrl ? { role: "bonus", kind: "url", url: report.bonusUrl } : null;
  const docs = await readDocuments(main, bonus, fetchStore(database, ipHash, user.id), { bypassCache: true });

  const blocked = docs.main.meta.status !== "read" || (docs.bonus !== null && docs.bonus.meta.status !== "read");
  const now = new Date();
  await database.update(reports).set({ lastCheckedAt: now }).where(eq(reports.id, id));
  if (blocked) return json({ changed: false, blocked: true, checkedAt: now.toISOString() });

  const changed = docs.main.meta.contentHash !== report.mainHash || (docs.bonus?.meta.contentHash ?? null) !== (report.bonusHash ?? null);
  return json({
    changed,
    checkedAt: now.toISOString(),
    rerun: { mainUrl: report.mainUrl, bonusUrl: report.bonusUrl, parentReportId: report.id },
  });
}
