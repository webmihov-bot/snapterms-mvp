import type { MergedExtraction } from "@/lib/schema/extraction";
import { sameValue } from "./merge";
import type { ChangedField } from "./types";

/** Field-level diff between two reports' extracted values ("the terms have changed"). */
export function diffExtractions(before: MergedExtraction, after: MergedExtraction): ChangedField[] {
  const out: ChangedField[] = [];
  for (const group of ["bonus", "withdrawal", "operator"] as const) {
    const a = before[group] as unknown as Record<string, { value: unknown }>;
    const b = after[group] as unknown as Record<string, { value: unknown }>;
    for (const key of Object.keys(b)) {
      const va = a[key]?.value ?? null;
      const vb = b[key]?.value ?? null;
      if (!sameValue(va, vb)) out.push({ field: `${group}.${key}`, before: va, after: vb });
    }
  }
  return out;
}
