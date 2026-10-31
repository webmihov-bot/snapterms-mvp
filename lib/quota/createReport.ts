import { and, asc, count, eq, gt, isNull, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/lib/db/schema";
import { credits, flags, reports, users } from "@/lib/db/schema";
import type { ReportFlag } from "@/lib/schema/extraction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDb = PgDatabase<PgQueryResultHKT, typeof schema, any>;

export const FREE_REPORTS = 3;
export const LIMIT_PER_HOUR = 6;
export const LIMIT_PER_DAY = 20;

export class QuotaExhaustedError extends Error {
  constructor() {
    super("quota_exhausted");
  }
}

export type NewReport = Omit<typeof reports.$inferInsert, "id" | "userId" | "paidWith" | "creditId" | "createdAt">;

export interface QuotaStatus {
  freeLeft: number;
  credits: number;
}

export async function quotaStatus(db: AnyDb, userId: string): Promise<QuotaStatus> {
  const [u] = await db.select({ used: users.freeReportsUsed }).from(users).where(eq(users.id, userId));
  const [c] = await db
    .select({ n: count() })
    .from(credits)
    .where(and(eq(credits.userId, userId), isNull(credits.consumedAt), isNull(credits.revokedAt)));
  return { freeLeft: Math.max(0, FREE_REPORTS - (u?.used ?? FREE_REPORTS)), credits: c?.n ?? 0 };
}

export async function rateLimited(db: AnyDb, userId: string): Promise<"hour" | "day" | null> {
  const now = Date.now();
  const [day] = await db
    .select({
      day: count(),
      hour: sql<number>`count(*) filter (where ${reports.createdAt} > ${new Date(now - 3_600_000).toISOString()}::timestamptz)`.mapWith(Number),
    })
    .from(reports)
    .where(and(eq(reports.userId, userId), gt(reports.createdAt, new Date(now - 86_400_000))));
  if ((day?.hour ?? 0) >= LIMIT_PER_HOUR) return "hour";
  if ((day?.day ?? 0) >= LIMIT_PER_DAY) return "day";
  return null;
}

/**
 * ONE transaction: lock the user row, spend a free slot or the oldest open credit, insert report + flags.
 * Throws QuotaExhaustedError (-> HTTP 402) when neither exists. Free counter never decrements.
 */
export async function createReportWithQuota(db: AnyDb, userId: string, report: NewReport, reportFlags: ReportFlag[]): Promise<{ id: string; paidWith: "free" | "credit" }> {
  return db.transaction(async (tx) => {
    const [u] = await tx.select({ used: users.freeReportsUsed }).from(users).where(eq(users.id, userId)).for("update");
    if (!u) throw new Error("user_not_found");

    let paidWith: "free" | "credit";
    let creditId: string | null = null;
    if (u.used < FREE_REPORTS) {
      await tx.update(users).set({ freeReportsUsed: u.used + 1 }).where(eq(users.id, userId));
      paidWith = "free";
    } else {
      const [credit] = await tx
        .select({ id: credits.id })
        .from(credits)
        .where(and(eq(credits.userId, userId), isNull(credits.consumedAt), isNull(credits.revokedAt)))
        .orderBy(asc(credits.createdAt), asc(credits.seq))
        .limit(1)
        .for("update");
      if (!credit) throw new QuotaExhaustedError();
      creditId = credit.id;
      paidWith = "credit";
    }

    const [row] = await tx
      .insert(reports)
      .values({ ...report, userId, paidWith, creditId })
      .returning({ id: reports.id });
    if (!row) throw new Error("report_insert_failed");

    if (creditId) {
      await tx.update(credits).set({ consumedAt: new Date(), consumedReportId: row.id }).where(eq(credits.id, creditId));
    }
    if (reportFlags.length) {
      await tx.insert(flags).values(
        reportFlags.map((f, i) => ({ reportId: row.id, flagId: f.id, severity: f.severity, quote: f.quote, clauseRef: f.clauseRef, docRole: f.docRole, sort: i })),
      );
    }
    return { id: row.id, paidWith };
  });
}
