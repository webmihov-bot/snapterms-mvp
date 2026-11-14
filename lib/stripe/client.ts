import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

/** True once STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_1 and STRIPE_PRICE_3 are all set. */
export function stripeConfigured(): boolean {
  const e = env();
  return Boolean(e.STRIPE_SECRET_KEY && e.STRIPE_WEBHOOK_SECRET && e.STRIPE_PRICE_1 && e.STRIPE_PRICE_3);
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Payments are not configured: set ${name}.`);
  return value;
}

export function stripe(): Stripe {
  if (!client) client = new Stripe(required(env().STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY"), { maxNetworkRetries: 2, appInfo: { name: "SnapTerms" } });
  return client;
}

export const PACKS = {
  1: { credits: 1, unitPriceCents: 390, priceVar: "STRIPE_PRICE_1" },
  3: { credits: 3, unitPriceCents: 330, priceVar: "STRIPE_PRICE_3" },
} as const;
export type PackSize = keyof typeof PACKS;

export function priceIdFor(pack: PackSize): string {
  return pack === 1 ? required(env().STRIPE_PRICE_1, "STRIPE_PRICE_1") : required(env().STRIPE_PRICE_3, "STRIPE_PRICE_3");
}
