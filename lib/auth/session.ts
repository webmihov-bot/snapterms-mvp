import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, type UserRow } from "@/lib/db/schema";
import { supabaseServer } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
  verified: boolean;
  row: UserRow;
}

/** Current user, creating the users row on first sight. null when signed out. */
export async function currentUser(): Promise<SessionUser | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const verifiedAt = user.email_confirmed_at ? new Date(user.email_confirmed_at) : null;

  const database = db();
  let [row] = await database.select().from(users).where(eq(users.id, user.id));
  if (!row) {
    [row] = await database
      .insert(users)
      .values({ id: user.id, email: user.email.toLowerCase(), emailVerifiedAt: verifiedAt })
      .onConflictDoUpdate({ target: users.id, set: { email: user.email.toLowerCase() } })
      .returning();
  } else if (!row.emailVerifiedAt && verifiedAt) {
    [row] = await database.update(users).set({ emailVerifiedAt: verifiedAt }).where(eq(users.id, user.id)).returning();
  }
  if (!row || row.deletedAt) return null;
  return { id: user.id, email: row.email, verified: !!row.emailVerifiedAt, row };
}
