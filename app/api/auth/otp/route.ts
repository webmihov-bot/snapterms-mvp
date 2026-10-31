import { z } from "zod";
import { error, json, sameOrigin } from "@/lib/http";
import { supabaseServer } from "@/lib/supabase/server";

const body = z.object({ email: z.string().trim().toLowerCase().email().max(320) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("forbidden", 403);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("email", 400);
  const supabase = await supabaseServer();
  const { error: err } = await supabase.auth.signInWithOtp({ email: parsed.data.email, options: { shouldCreateUser: true } });
  if (err) return error("send", err.status === 429 ? 429 : 400);
  return json({ ok: true });
}
