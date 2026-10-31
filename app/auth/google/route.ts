import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/http";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${env().APP_URL}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) return NextResponse.redirect(`${env().APP_URL}/login?error=oauth`);
  return NextResponse.redirect(data.url);
}
