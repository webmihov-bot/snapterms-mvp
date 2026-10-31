import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) client = new Stripe(env().STRIPE_SECRET_KEY, { maxNetworkRetries: 2, appInfo: { name: "SnapTerms" } });
  return client;
}

export const PACKS = {
  1: { credits: 1, unitPriceCents: 390, priceVar: "STRIPE_PRICE_1" },
  3: { credits: 3, unitPriceCents: 330, priceVar: "STRIPE_PRICE_3" },
} as const;
export type PackSize = keyof typeof PACKS;

export function priceIdFor(pack: PackSize): string {
  return pack === 1 ? env().STRIPE_PRICE_1 : env().STRIPE_PRICE_3;
}
