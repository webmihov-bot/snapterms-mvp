import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";
import { clientIp, fetchStore, hashIp, IP_FETCHES_PER_MINUTE, ipFetchesLastMinute } from "@/lib/fetch/store";
import { error, json, sameOrigin } from "@/lib/http";
import { ExtractError } from "@/lib/llm/extract";
import { docInputSchema, resolveInputs } from "@/lib/pipeline/documents";
import { buildReport, documentList, readDocuments } from "@/lib/pipeline/run";
import { createReportWithQuota, QuotaExhaustedError, quotaStatus, rateLimited } from "@/lib/quota/createReport";

export const runtime = "nodejs";
export const maxDuration = 60;

const body = z.object({
  main: docInputSchema,
  bonus: docInputSchema.nullable(),
  allowPartial: z.boolean().default(false),
  ageConfirmed: z.boolean().default(false),
  parentReportId: z.string().uuid().nullable().default(null),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("forbidden", 403);
  const user = await currentUser();
  if (!user) return error("unauthorized", 401);
  if (!user.verified) return error("unverified", 403);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("bad_request", 400);
  const input = parsed.data;
  const database = db();

  if (!user.row.ageConfirmedAt) {
    if (!input.ageConfirmed) return error("age_required", 403);
    await database.update(users).set({ ageConfirmedAt: new Date() }).where(eq(users.id, user.id));
  }

  const resolved = resolveInputs(input.main, input.bonus);
  if (!resolved.ok) return error("invalid_url", 400, { errors: resolved.errors });

  const limit = await rateLimited(database, user.id);
  if (limit) return error(limit === "hour" ? "rate_hour" : "rate_day", 429);

  const ipHash = hashIp(clientIp(req.headers));
  const urlCount = [resolved.main, resolved.bonus].filter((d) => d?.kind === "url").length;
  if (urlCount && (await ipFetchesLastMinute(database, ipHash)) + urlCount > IP_FETCHES_PER_MINUTE) return error("rate_ip", 429);

  let parent = null;
  if (input.parentReportId) {
    [parent] = await database.select().from(reports).where(and(eq(reports.id, input.parentReportId), eq(reports.userId, user.id)));
  }

  // 1. read both documents in parallel. Blocked documents never consume quota.
  const docs = await readDocuments(resolved.main, resolved.bonus, fetchStore(database, ipHash, user.id));
  const documents = documentList(docs);
  const mainOk = docs.main.meta.status === "read";
  const bonusBlocked = docs.bonus !== null && docs.bonus.meta.status !== "read";
  if (!mainOk || (bonusBlocked && !input.allowPartial)) {
    return json({ error: "needs_input", bothBlocked: !mainOk && (docs.bonus === null || bonusBlocked), documents }, 409);
  }

  // 2. non-binding quota check before any tokens are spent (binding check is the transaction below)
  const status = await quotaStatus(database, user.id);
  if (status.freeLeft === 0 && status.credits === 0) return error("quota_exhausted", 402, { reason: "quota_exhausted", documents });

  // 3. extract -> merge -> score. A failure here consumes nothing.
  let built;
  try {
    built = await buildReport(database, docs, parent ?? null);
  } catch (err) {
    console.error("[analyse] extraction failed", err instanceof ExtractError ? { msg: err.message, meta: err.meta } : err);
    return error("llm_failed", 502);
  }

  // 4. ONE transaction: quota/credit + report + flags commit together
  try {
    const created = await createReportWithQuota(database, user.id, built.values, built.flags);
    return json({ id: created.id, paidWith: created.paidWith });
  } catch (err) {
    if (err instanceof QuotaExhaustedError) return error("quota_exhausted", 402, { reason: "quota_exhausted", documents });
    console.error("[analyse] persist failed", err);
    return error("server", 500);
  }
}
