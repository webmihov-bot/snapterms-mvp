import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { flags, reports, type ReportRow } from "@/lib/db/schema";
import type { DocRole, FlagId, Severity } from "@/lib/schema/extraction";
import type { ReportData } from "./view";

export async function toReportData(row: ReportRow): Promise<ReportData> {
  const database = db();
  const [flagRows, parent] = await Promise.all([
    database.select().from(flags).where(eq(flags.reportId, row.id)).orderBy(asc(flags.sort)),
    row.parentReportId
      ? database
          .select({ createdAt: reports.createdAt })
          .from(reports)
          .where(eq(reports.id, row.parentReportId))
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    hostname: row.hostname,
    documents: row.documents,
    extraction: row.extraction,
    conflicts: row.conflicts,
    money: row.money,
    scores: row.scores,
    coverage: row.coverage,
    flags: flagRows.map((f) => ({ id: f.flagId as FlagId, severity: f.severity as Severity, quote: f.quote, clauseRef: f.clauseRef, docRole: f.docRole as DocRole })),
    changedFields: row.changedFields,
    parentCreatedAt: parent?.createdAt.toISOString() ?? null,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    mainUrl: row.mainUrl,
    bonusUrl: row.bonusUrl,
    latencyMs: row.meta.latencyMs ?? null,
  };
}

export async function loadOwnReport(id: string, userId: string): Promise<ReportData | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db()
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.userId, userId)));
  return row ? toReportData(row) : null;
}

export async function loadReportById(id: string): Promise<ReportData | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db().select().from(reports).where(eq(reports.id, id));
  return row ? toReportData(row) : null;
}
