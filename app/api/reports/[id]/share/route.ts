import { and, eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { reports } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { error, json, sameOrigin } from "@/lib/http";
import { createShareToken } from "@/lib/share/token";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return error("forbidden", 403);
  const user = await currentUser();
  if (!user) return error("unauthorized", 401);
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return error("not_found", 404);
  const [row] = await db()
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.userId, user.id)));
  if (!row) return error("not_found", 404);
  const { token, expiresAt } = createShareToken(row.id, env().APP_SECRET);
  return json({ url: `${env().APP_URL}/share/${token}`, expiresAt: expiresAt.toISOString() });
}
