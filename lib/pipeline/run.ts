import "server-only";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { llmConfig } from "@/config/llm";
import type { Db } from "@/lib/db/client";
import { reports, type ReportRow } from "@/lib/db/schema";
import { getText, type DocInput, type FetchStore, type ReadDoc } from "@/lib/fetch/getText";
import { ecbRates } from "@/lib/fx/ecb";
import type { DocumentMeta, MergedExtraction, ReportMeta } from "@/lib/schema/extraction";
import { analyse } from "./analyse";
import { diffExtractions } from "./diff";
import { buildFlags } from "./flags";
import { computeMoney } from "./money";
import { score } from "./score";
import type { NewReport } from "@/lib/quota/createReport";
import type { ReportFlag } from "@/lib/schema/extraction";

const CACHE_MS = 7 * 24 * 60 * 60 * 1000;

export interface ReadDocs {
  main: ReadDoc;
  bonus: ReadDoc | null;
}

export async function readDocuments(main: DocInput, bonus: DocInput | null, store: FetchStore, opts: { bypassCache?: boolean } = {}): Promise<ReadDocs> {
  const [m, b] = await Promise.all([getText(main, store, opts), bonus ? getText(bonus, store, opts) : Promise.resolve(null)]);
  return { main: m, bonus: b };
}

export function documentList(docs: ReadDocs): DocumentMeta[] {
  const missing: DocumentMeta = {
    role: "bonus",
    sourceType: null,
    url: null,
    filename: null,
    fetchedAt: null,
    contentHash: null,
    chars: 0,
    status: "missing",
    reason: null,
  };
  return [docs.main.meta, docs.bonus?.meta ?? missing];
}

/** Same documents + same prompt within 7 days -> reuse the extraction, zero tokens. */
async function cachedExtraction(database: Db, mainHash: string, bonusHash: string | null, promptVersion: string): Promise<ReportRow | null> {
  const [row] = await database
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.mainHash, mainHash),
        bonusHash ? eq(reports.bonusHash, bonusHash) : isNull(reports.bonusHash),
        eq(reports.promptVersion, promptVersion),
        gt(reports.createdAt, new Date(Date.now() - CACHE_MS)),
      ),
    )
    .orderBy(desc(reports.createdAt))
    .limit(1);
  return row ?? null;
}

function hostnameFor(docs: ReadDocs, merged: MergedExtraction): string {
  for (const d of [docs.main.meta, docs.bonus?.meta]) {
    if (d?.url) return new URL(d.url).hostname.replace(/^www\./, "");
  }
  const domain = merged.operator.domain.value;
  if (domain) return domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? domain;
  return merged.operator.name.value ?? "pasted-terms";
}

export interface BuiltReport {
  values: NewReport;
  flags: ReportFlag[];
}

/** Extraction (or cache) -> merge -> money -> score -> flags. Nothing is persisted here. */
export async function buildReport(database: Db, docs: ReadDocs, parent: ReportRow | null): Promise<BuiltReport> {
  const cfg = llmConfig();
  const mainText = docs.main.text!;
  const bonusText = docs.bonus?.meta.status === "read" ? docs.bonus.text : null;
  const mainHash = docs.main.meta.contentHash!;
  const bonusHash = bonusText ? docs.bonus!.meta.contentHash : null;

  let merged: MergedExtraction;
  let meta: ReportMeta;
  const hit = await cachedExtraction(database, mainHash, bonusHash, cfg.promptVersion);
  if (hit) {
    merged = hit.extraction;
    meta = { ...hit.meta, calls: 0, inputTokens: 0, outputTokens: 0, costEur: 0, latencyMs: 0, path: "cache" };
  } else {
    ({ merged, meta } = await analyse({ main: mainText, bonus: bonusText }, cfg));
  }

  const coverage: 0 | 60 | 100 = bonusText ? 100 : 60;
  const needsFx = [merged.bonus.maxAmount.value, merged.bonus.minDeposit.value, merged.bonus.maxBet.value, merged.bonus.maxWinCap.value?.amount ?? null].some(
    (m) => m && m.currency.toUpperCase() !== "EUR",
  );
  const money = computeMoney(merged, coverage, needsFx ? await ecbRates() : null);
  const scores = score(money);
  const reportFlags = buildFlags(merged, money);

  return {
    flags: reportFlags,
    values: {
      hostname: hostnameFor(docs, merged),
      mainUrl: docs.main.meta.url,
      bonusUrl: docs.bonus?.meta.url ?? null,
      mainHash,
      bonusHash,
      promptVersion: cfg.promptVersion,
      documents: documentList(docs),
      extraction: merged,
      conflicts: merged.conflicts,
      money,
      scores,
      coverage,
      parentReportId: parent?.id ?? null,
      changedFields: parent ? diffExtractions(parent.extraction, merged) : null,
      meta,
    },
  };
}
