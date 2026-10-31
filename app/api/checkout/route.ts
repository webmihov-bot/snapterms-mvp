import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { error, json, sameOrigin } from "@/lib/http";
import { priceIdFor, stripe } from "@/lib/stripe/client";

export const runtime = "nodejs";

const body = z.object({ pack: z.union([z.literal(1), z.literal(3)]), returnTo: z.enum(["account", "analyse"]).default("account") });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("forbidden", 403);
  const user = await currentUser();
  if (!user) return error("unauthorized", 401);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("bad_request", 400);
  const { pack, returnTo } = parsed.data;
  const app = env().APP_URL;
  const back = returnTo === "analyse" ? "/analyse" : "/account";

  // same user + pack within the same minute -> same Checkout Session (double-click safe)
  const idempotencyKey = `checkout:${user.id}:${pack}:${Math.floor(Date.now() / 60_000)}`;
  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [{ price: priceIdFor(pack), quantity: 1 }],
        client_reference_id: user.id,
        customer_email: user.email,
        metadata: { credits: String(pack), userId: user.id },
        payment_intent_data: { metadata: { credits: String(pack), userId: user.id } },
        success_url: `${app}${back}?paid=1`,
        cancel_url: `${app}${back}?cancelled=1`,
      },
      { idempotencyKey },
    );
    if (!session.url) return error("checkout", 502);
    return json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return error("checkout", 502);
  }
}
