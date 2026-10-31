import { COPY, fmtMoney } from "@/lib/copy";
import type { ChangedField, Money, Scores } from "@/lib/pipeline/types";
import type { Conflict, DocRole, DocumentMeta, Field, FlagId, MergedExtraction, Money as SrcMoney, Severity } from "@/lib/schema/extraction";

/** Serialisable report payload handed to the client report view. */
export interface ReportData {
  id: string;
  createdAt: string;
  hostname: string;
  documents: DocumentMeta[];
  extraction: MergedExtraction;
  conflicts: Conflict[];
  money: Money;
  scores: Scores;
  coverage: number;
  flags: { id: FlagId; severity: Severity; quote: string; clauseRef: string | null; docRole: DocRole }[];
  changedFields: ChangedField[] | null;
  parentCreatedAt: string | null;
  lastCheckedAt: string | null;
  mainUrl: string | null;
  bonusUrl: string | null;
  latencyMs: number | null;
}

export interface QuoteRef {
  label: string;
  quote: string | null;
  clauseRef: string | null;
  role: DocRole | null;
  reason?: "not_found" | "ambiguous" | null;
  meaning?: string;
  action?: string;
}

export function fieldLabel(path: string): string {
  return COPY.fields[path] ?? path;
}

export function getField(x: MergedExtraction, path: string): Field<unknown> | null {
  const [group, key] = path.split(".") as [keyof MergedExtraction, string];
  const g = x[group] as unknown as Record<string, Field<unknown>> | undefined;
  const f = g?.[key];
  return f && typeof f === "object" && "value" in f ? f : null;
}

export function quoteFor(x: MergedExtraction, path: string): QuoteRef {
  const f = getField(x, path);
  return { label: fieldLabel(path), quote: f?.quote ?? null, clauseRef: f?.clauseRef ?? null, role: x.origin[path] ?? null, reason: f?.reason ?? "not_found" };
}

function isMoney(v: unknown): v is SrcMoney {
  return !!v && typeof v === "object" && "amount" in v && "currency" in v;
}

/** Human-readable value for any extracted field, in its source currency. */
export function formatValue(path: string, value: unknown): string {
  const V = COPY.values;
  if (value === null || value === undefined) return COPY.report.notFound;
  if (typeof value === "boolean") return value ? V.yes : V.no;
  if (isMoney(value)) return fmtMoney(value.amount, value.currency.toUpperCase());
  if (typeof value === "number") {
    if (path.endsWith("Multiplier")) return V.times(value);
    if (path.endsWith("Contribution") || path.endsWith("percent") || path.endsWith("Percent")) return V.percent(value);
    if (path.endsWith("Days")) return V.days(value);
    return V.count(value);
  }
  if (typeof value === "string") {
    if (path === "bonus.wageringBase") return V.base[value] ?? value;
    if (path === "withdrawal.kycRequired") return V.kyc[value] ?? value;
    return value;
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if ("min" in o && "max" in o) return V.dayRange(Number(o.min), Number(o.max));
    if ("limit" in o && isMoney(o.limit)) return V.perPeriod(fmtMoney(o.limit.amount, o.limit.currency), String(o.period));
    if ("kind" in o) {
      if (o.kind === "fixed" && isMoney(o.amount)) return fmtMoney(o.amount.amount, o.amount.currency);
      if (o.kind === "multiple" && typeof o.x === "number") return V.capMultiple(o.x, String(o.of ?? "bonus"));
    }
  }
  return JSON.stringify(value);
}
