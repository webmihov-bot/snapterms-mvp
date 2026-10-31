import { and, eq, isNull } from "drizzle-orm";
import { credits, users } from "@/lib/db/schema";
import type { AnyDb } from "@/lib/quota/createReport";

export interface PaidSession {
  sessionId: string;
  userId: string;
  pack: 1 | 3;
  paymentIntent: string | null;
  amountTotalCents: number | null;
}

/** Inserts N credit rows. unique(stripe_session_id, seq) makes webhook replays a no-op. Returns rows inserted. */
export async function grantCredits(db: AnyDb, s: PaidSession): Promise<number> {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, s.userId));
  if (!user) return 0;
  const unit = s.amountTotalCents !== null ? Math.round(s.amountTotalCents / s.pack) : s.pack === 1 ? 390 : 330;
  const rows = Array.from({ length: s.pack }, (_, i) => ({
    userId: s.userId,
    stripeSessionId: s.sessionId,
    stripePaymentIntent: s.paymentIntent,
    seq: i + 1,
    pack: s.pack,
    unitPriceCents: unit,
  }));
  const inserted = await db.insert(credits).values(rows).onConflictDoNothing({ target: [credits.stripeSessionId, credits.seq] }).returning({ id: credits.id });
  return inserted.length;
}

/** Refund: revoke only the unspent credits of that payment. */
export async function revokeUnspent(db: AnyDb, paymentIntent: string): Promise<number> {
  const revoked = await db
    .update(credits)
    .set({ revokedAt: new Date() })
    .where(and(eq(credits.stripePaymentIntent, paymentIntent), isNull(credits.consumedAt), isNull(credits.revokedAt)))
    .returning({ id: credits.id });
  return revoked.length;
}
