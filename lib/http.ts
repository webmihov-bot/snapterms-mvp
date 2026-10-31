import "server-only";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export function json<T>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

export function error(code: string, status: number, extra: Record<string, unknown> = {}): NextResponse {
  return json({ error: code, ...extra }, status);
}

/** Rejects cross-site POSTs (CSRF): Origin must be our own host. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const app = new URL(env().APP_URL);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return o.host === app.host || o.host === host;
  } catch {
    return false;
  }
}

/** Only allow relative in-app redirects. */
export function safeNext(next: string | null | undefined, fallback = "/analyse"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
