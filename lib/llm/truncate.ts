/** Keywords that mark clauses the extractor needs. Weighted by how much money they move. */
const KEYWORDS: [RegExp, number][] = [
  [/wager|playthrough|play-through|rollover|turnover/gi, 6],
  [/bonus|free spin|welcome|promotion/gi, 3],
  [/withdraw|payout|cash ?out|pay out/gi, 4],
  [/maximum|max\.?|cap|limit/gi, 2],
  [/bet|stake/gi, 2],
  [/licen[cs]e|regulat|authority|commission/gi, 4],
  [/verif|kyc|identity|documents?/gi, 2],
  [/fee|charge/gi, 2],
  [/expir|valid for|within \d+ days/gi, 3],
  [/contribut|weighting|count(s)? towards?/gi, 4],
  [/forfeit|void|confiscat|cancel|abuse|multiple accounts?|vpn|irregular|chargeback|sole discretion/gi, 4],
  [/real money|cash balance|deposit/gi, 2],
];

const HEADING = /^(?:(?:section|clause|article|§)\s*)?\d{1,3}(?:\.\d{1,3}){0,3}[.)]?\s+\S/i;

export interface Section {
  index: number;
  text: string;
  score: number;
}

/** Splits on numbered headings ("7.", "7.3", "Section 12") and on blank lines for unnumbered documents. */
export function splitSections(text: string): Section[] {
  const lines = text.split("\n");
  const out: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    const t = buf.join("\n").trim();
    if (t) out.push(t);
    buf = [];
  };
  for (const line of lines) {
    if (HEADING.test(line) && buf.length) flush();
    buf.push(line);
    if (buf.join("\n").length > 4_000 && line === "") flush();
  }
  flush();
  return out.map((t, index) => {
    let score = 0;
    for (const [re, w] of KEYWORDS) score += (t.match(re)?.length ?? 0) * w;
    return { index, text: t, score: score / Math.sqrt(Math.max(t.length, 200) / 200) };
  });
}

/**
 * Clause-aware truncation: keeps whole clauses, highest relevance first, then restores original order.
 * The first section (usually the operator / licence preamble) is always kept.
 */
export function truncateClauses(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  const sections = splitSections(text);
  const keep = new Set<number>();
  let used = 0;
  const first = sections[0];
  if (first && first.text.length <= maxChars / 4) {
    keep.add(first.index);
    used += first.text.length + 2;
  }
  for (const s of [...sections].sort((a, b) => b.score - a.score)) {
    if (keep.has(s.index)) continue;
    const len = s.text.length + 2;
    if (used + len > maxChars) continue;
    keep.add(s.index);
    used += len;
  }
  const kept = sections.filter((s) => keep.has(s.index)).map((s) => s.text);
  if (!kept.length) return { text: text.slice(0, maxChars), truncated: true };
  return { text: kept.join("\n\n"), truncated: true };
}
