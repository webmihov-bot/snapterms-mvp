export type UrlError = "empty" | "too_long" | "invalid" | "scheme" | "ip_literal" | "localhost" | "same_url";

export type NormalizeResult = { ok: true; url: string; hostname: string } | { ok: false; error: UrlError };

const MAX_LEN = 2048;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const LOCAL_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];

export function isIpLiteral(hostname: string): boolean {
  return IPV4.test(hostname) || hostname.startsWith("[") || hostname.includes(":") || /^\d+$/.test(hostname) || /^0x[0-9a-f]+$/i.test(hostname);
}

export function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  return h === "localhost" || !h.includes(".") || LOCAL_SUFFIXES.some((s) => h.endsWith(s));
}

/** Pure; runs in the browser (live preview) and on the server (authoritative). */
export function normalizeUrl(input: string): NormalizeResult {
  let raw = input.trim();
  if (!raw) return { ok: false, error: "empty" };
  if (raw.length > MAX_LEN) return { ok: false, error: "too_long" };
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, error: "scheme" };
  if (u.username || u.password) return { ok: false, error: "invalid" };
  const hostname = u.hostname.toLowerCase();
  if (!hostname) return { ok: false, error: "invalid" };
  if (isIpLiteral(hostname)) return { ok: false, error: "ip_literal" };
  if (isLocalHostname(hostname)) return { ok: false, error: "localhost" };
  u.hash = "";
  const url = u.toString();
  if (url.length > MAX_LEN) return { ok: false, error: "too_long" };
  return { ok: true, url, hostname };
}

/** Normalises both fields and rejects the same URL twice. */
export function normalizePair(main: string, bonus: string): { main: NormalizeResult; bonus: NormalizeResult | null } {
  const m = normalizeUrl(main);
  const b = bonus.trim() ? normalizeUrl(bonus) : null;
  if (m.ok && b?.ok && m.url === b.url) return { main: m, bonus: { ok: false, error: "same_url" } };
  return { main: m, bonus: b };
}
