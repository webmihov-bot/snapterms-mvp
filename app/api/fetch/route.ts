import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { clientIp, fetchStore, hashIp, IP_FETCHES_PER_MINUTE, ipFetchesLastMinute } from "@/lib/fetch/store";
import { error, json, sameOrigin } from "@/lib/http";
import { docInputSchema, resolveInputs } from "@/lib/pipeline/documents";
import { documentList, readDocuments } from "@/lib/pipeline/run";

export const runtime = "nodejs";
export const maxDuration = 30;

const body = z.object({ main: docInputSchema, bonus: docInputSchema.nullable(), includeText: z.boolean().default(false) });

/** Reads both documents (no LLM, no quota). Powers the raw text view and the pre-flight document check. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("forbidden", 403);
  const user = await currentUser();
  if (!user) return error("unauthorized", 401);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("bad_request", 400);
  const resolved = resolveInputs(parsed.data.main, parsed.data.bonus);
  if (!resolved.ok) return error("invalid_url", 400, { errors: resolved.errors });

  const database = db();
  const ipHash = hashIp(clientIp(req.headers));
  const urlCount = [resolved.main, resolved.bonus].filter((d) => d?.kind === "url").length;
  if (urlCount && (await ipFetchesLastMinute(database, ipHash)) + urlCount > IP_FETCHES_PER_MINUTE) return error("rate_ip", 429);

  const docs = await readDocuments(resolved.main, resolved.bonus, fetchStore(database, ipHash, user.id));
  return json({
    documents: documentList(docs),
    text: parsed.data.includeText ? { main: docs.main.text, bonus: docs.bonus?.text ?? null } : undefined,
  });
}
