import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/http";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${env().APP_URL}${next}`);
  }
  return NextResponse.redirect(`${env().APP_URL}/login?error=oauth`);
}
