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

/** Visitor market from the edge (Vercel), for responsible-gambling resources. */
export async function visitorCountry(): Promise<string | null> {
  const h = await headers();
  const c = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry");
  return c && /^[A-Z]{2}$/i.test(c) ? c.toUpperCase() : null;
}
