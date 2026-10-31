export interface FxTable {
  date: string;
  /** 1 EUR = rates[CUR] units of CUR */
  rates: Record<string, number>;
}

const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const TTL_MS = 12 * 60 * 60 * 1000;
let cache: { at: number; table: FxTable } | null = null;

export function parseEcbXml(xml: string): FxTable | null {
  const date = /time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml)?.[1];
  if (!date) return null;
  const rates: Record<string, number> = { EUR: 1 };
  for (const m of xml.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)) {
    const rate = Number(m[2]);
    if (m[1] && Number.isFinite(rate) && rate > 0) rates[m[1]] = rate;
  }
  return { date, rates };
}

/** ECB euro reference rates, cached 12h in memory. Returns null when the ECB is unreachable. */
export async function ecbRates(): Promise<FxTable | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.table;
  try {
    const res = await fetch(ECB_URL, { signal: AbortSignal.timeout(4_000) });
    if (!res.ok) return cache?.table ?? null;
    const table = parseEcbXml(await res.text());
    if (table) cache = { at: Date.now(), table };
    return table ?? cache?.table ?? null;
  } catch {
    return cache?.table ?? null;
  }
}
