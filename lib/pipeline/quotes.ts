import type { DocExtraction, Field } from "@/lib/schema/extraction";

/** Normalises punctuation and whitespace so a verbatim quote matches the cleaned source text. */
export function normForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteInSource(quote: string, normalizedSource: string): boolean {
  const q = normForMatch(quote).replace(/^["'.\s]+|["'.\s]+$/g, "");
  if (q.length < 8) return false;
  if (normalizedSource.includes(q)) return true;
  // models sometimes trim or join sentences: accept when both ends match within the source
  const head = q.slice(0, 60);
  const tail = q.slice(-40);
  const at = normalizedSource.indexOf(head);
  return at >= 0 && normalizedSource.indexOf(tail, at) >= 0 && normalizedSource.indexOf(tail, at) - at < q.length + 200;
}

const EMPTY: Field<never> = { value: null, quote: null, clauseRef: null, confidence: 0, reason: "not_found" };

function verifyField<T>(f: Field<T>, src: string): Field<T> {
  if (f.value === null || f.value === undefined) return { ...f, value: null };
  if (!f.quote || !quoteInSource(f.quote, src)) return { ...EMPTY };
  if (f.confidence < 0.5) return { ...EMPTY, reason: "ambiguous" };
  return { ...f, confidence: Math.min(1, Math.max(0, f.confidence)) };
}

function verifyGroup<G extends Record<string, Field<unknown>>>(group: G, src: string): G {
  const out: Record<string, Field<unknown>> = {};
  for (const [k, f] of Object.entries(group)) out[k] = verifyField(f, src);
  return out as G;
}

/** Enforces "a number without a quote is null": drops every value whose quote is not found in the source. */
export function verifyAgainstSource(doc: DocExtraction, sourceText: string): DocExtraction {
  const src = normForMatch(sourceText);
  return {
    operator: verifyGroup(doc.operator, src),
    withdrawal: verifyGroup(doc.withdrawal, src),
    bonus: verifyGroup(doc.bonus, src),
    flags: doc.flags.filter((fl) => quoteInSource(fl.quote, src)),
  };
}
