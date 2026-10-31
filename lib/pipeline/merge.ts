import { licenseTier } from "@/config/scoring";
import type { Conflict, DocExtraction, DocRole, Field, MergedExtraction, ReportFlag, Severity } from "@/lib/schema/extraction";

/** Fields where a disagreement changes the money math. */
const HIGH_SEVERITY = new Set([
  "bonus.wageringMultiplier",
  "bonus.wageringBase",
  "bonus.maxWinCap",
  "bonus.maxBet",
  "bonus.cashFirst",
  "bonus.expiryDays",
  "bonus.maxAmount",
  "withdrawal.splitPayouts",
  "withdrawal.feePercent",
]);

/** Order-independent deep equality for extracted values (numbers compared to 1e-9). */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  if (typeof a === "string" && typeof b === "string") return a.trim().toLowerCase() === b.trim().toLowerCase();
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every((k) => sameValue((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

const EMPTY: Field<never> = { value: null, quote: null, clauseRef: null, confidence: 0, reason: "not_found" };

type Group = "operator" | "withdrawal" | "bonus";

function mergeGroup<G extends Record<string, Field<unknown>>>(
  group: Group,
  main: G,
  bonus: G | null,
  winner: DocRole,
  origin: Record<string, DocRole>,
  conflicts: Conflict[],
): G {
  const out: Record<string, Field<unknown>> = {};
  for (const key of Object.keys(main)) {
    const path = `${group}.${key}`;
    const m = main[key] ?? EMPTY;
    const b = bonus?.[key] ?? EMPTY;
    const mHas = m.value !== null;
    const bHas = b.value !== null;
    const preferred = winner === "main" ? m : b;
    const other = winner === "main" ? b : m;
    const otherRole: DocRole = winner === "main" ? "bonus" : "main";

    if (mHas && bHas && !sameValue(m.value, b.value)) {
      const severity: Severity = HIGH_SEVERITY.has(path) ? "high" : "medium";
      conflicts.push({
        field: path,
        main: { quote: m.quote, clauseRef: m.clauseRef, value: m.value },
        bonus: { quote: b.quote, clauseRef: b.clauseRef, value: b.value },
        severity,
      });
    }
    if (preferred.value !== null) {
      out[key] = preferred;
      origin[path] = winner;
    } else if (other.value !== null) {
      out[key] = other;
      origin[path] = otherRole;
    } else {
      out[key] = { ...EMPTY, reason: m.reason === "ambiguous" || b.reason === "ambiguous" ? "ambiguous" : "not_found" };
    }
  }
  return out as G;
}

function mergeFlags(main: DocExtraction, bonus: DocExtraction | null): ReportFlag[] {
  const seen = new Set<string>();
  const out: ReportFlag[] = [];
  const add = (role: DocRole, list: DocExtraction["flags"]) => {
    for (const f of list) {
      const key = `${f.id}|${f.quote.slice(0, 80).toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id: f.id, severity: f.severity, quote: f.quote, clauseRef: f.clauseRef, docRole: role });
    }
  };
  if (bonus) add("bonus", bonus.flags);
  add("main", main.flags);
  return out;
}

/**
 * Deterministic merge.
 *   operator.*, withdrawal.*  <- main wins (bonus fills gaps)
 *   bonus.*                   <- bonus wins when present, else main
 *   conflicts[]               <- same field, differing values, both quotes
 */
export function merge(main: DocExtraction, bonus: DocExtraction | null): MergedExtraction {
  const origin: Record<string, DocRole> = {};
  const conflicts: Conflict[] = [];
  const operator = mergeGroup("operator", main.operator, bonus?.operator ?? null, "main", origin, conflicts);
  const withdrawal = mergeGroup("withdrawal", main.withdrawal, bonus?.withdrawal ?? null, "main", origin, conflicts);
  const bonusGroup = mergeGroup("bonus", main.bonus, bonus?.bonus ?? null, bonus ? "bonus" : "main", origin, conflicts);
  conflicts.sort((a, b) => (a.severity === b.severity ? a.field.localeCompare(b.field) : a.severity === "high" ? -1 : 1));
  return {
    operator: { ...operator, licenseTier: licenseTier(operator.regulator.value) },
    withdrawal,
    bonus: bonusGroup,
    origin,
    conflicts,
    flags: mergeFlags(main, bonus),
  };
}
