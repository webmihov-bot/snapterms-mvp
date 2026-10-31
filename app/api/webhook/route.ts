import type Stripe from "stripe";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe/client";
import { grantCredits, revokeUnspent } from "@/lib/stripe/credits";

export const runtime = "nodejs";

function paymentIntentId(pi: string | Stripe.PaymentIntent | null): string | null {
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}

async function handleSession(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "payment" || session.payment_status !== "paid") return;
  const userId = session.client_reference_id;
  const pack = Number(session.metadata?.credits);
  if (!userId || (pack !== 1 && pack !== 3)) {
    console.error("[webhook] session without user or credits", session.id);
    return;
  }
  const n = await grantCredits(db(), {
    sessionId: session.id,
    userId,
    pack,
    paymentIntent: paymentIntentId(session.payment_intent),
    amountTotalCents: session.amount_total,
  });
  console.info(`[webhook] ${session.id}: ${n} credit(s) inserted`);
}

/** Signature verified against the raw body. Replays are no-ops (unique session+seq). */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, env().STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleSession(event.data.object);
        break;
      case "charge.refunded": {
        const pi = paymentIntentId(event.data.object.payment_intent);
        if (pi) await revokeUnspent(db(), pi);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[webhook] handler failed", event.id, err);
    return new Response("handler error", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}
