import "server-only";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

/** Cheap check for the header: Supabase session only, no DB. */
export async function isSignedIn(): Promise<boolean> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

/** Netlify sends geo data as base64 JSON in x-nf-geo: {"country":{"code":"GB"},...}. */
export function netlifyCountry(header: string | null): string | null {
  if (!header) return null;
  try {
    const geo = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as { country?: { code?: string } };
    return geo.country?.code ?? null;
  } catch {
    return null;
  }
}

/** Visitor market from the host's edge (Vercel, Netlify, Cloudflare), for responsible-gambling resources. */
export async function visitorCountry(): Promise<string | null> {
  const h = await headers();
  const c = h.get("x-vercel-ip-country") ?? netlifyCountry(h.get("x-nf-geo")) ?? h.get("cf-ipcountry");
  return c && /^[A-Z]{2}$/i.test(c) ? c.toUpperCase() : null;
}
