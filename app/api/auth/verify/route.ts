import { z } from "zod";
import { error, json, safeNext, sameOrigin } from "@/lib/http";
import { supabaseServer } from "@/lib/supabase/server";

const body = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().trim().regex(/^\d{6,10}$/),
  next: z.string().optional(),
});

/** Verifies the emailed code server-side so session cookies stay http-only. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("forbidden", 403);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("code", 400);
  const supabase = await supabaseServer();
  const { error: err } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.token, type: "email" });
  if (err) return error("code", 400);
  return json({ ok: true, next: safeNext(parsed.data.next) });
}
