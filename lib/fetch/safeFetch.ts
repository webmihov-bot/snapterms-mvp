import { lookup } from "node:dns/promises";
import { isIpLiteral, isLocalHostname } from "@/lib/url/normalize";

export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;

export class UnsafeHostError extends Error {}
export class TooLargeError extends Error {}

function privateV4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  const [a = 0, b = 0] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPrivateAddress(ip: string, family: number): boolean {
  if (family === 4) return privateV4(ip);
  const v = ip.toLowerCase();
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("::ffff:")) return privateV4(v.slice(7));
  return v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
}

async function assertPublicHost(hostname: string): Promise<void> {
  if (isIpLiteral(hostname) || isLocalHostname(hostname)) throw new UnsafeHostError(hostname);
  const addrs = await lookup(hostname, { all: true, verbatim: true });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address, a.family))) throw new UnsafeHostError(hostname);
}

async function readCapped(res: Response): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new TooLargeError();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

function charsetOf(contentType: string): string {
  const m = /charset=["']?([\w-]+)/i.exec(contentType);
  try {
    return m?.[1] ? new TextDecoder(m[1]).encoding : "utf-8";
  } catch {
    return "utf-8";
  }
}

export interface SafeFetchResult {
  status: number;
  finalUrl: string;
  contentType: string;
  body: string;
}

/** GET with a browser UA, manual redirects (every hop re-checked against private networks), 10s budget, 5 MB cap. */
export async function safeFetch(url: string, timeoutMs = 10_000): Promise<SafeFetchResult> {
  const signal = AbortSignal.timeout(timeoutMs);
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = new URL(current);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new UnsafeHostError(u.protocol);
    await assertPublicHost(u.hostname);
    const res = await fetch(current, {
      redirect: "manual",
      signal,
      headers: {
        "user-agent": BROWSER_UA,
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "accept-language": "en-GB,en;q=0.9",
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current).toString();
      await res.body?.cancel();
      continue;
    }
    const contentType = res.headers.get("content-type") ?? "";
    const bytes = await readCapped(res);
    return { status: res.status, finalUrl: current, contentType, body: new TextDecoder(charsetOf(contentType)).decode(bytes) };
  }
  throw new UnsafeHostError("too many redirects");
}
