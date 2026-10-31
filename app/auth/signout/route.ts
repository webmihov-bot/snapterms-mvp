import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sameOrigin } from "@/lib/http";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return new NextResponse(null, { status: 403 });
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${env().APP_URL}/`, { status: 303 });
}
