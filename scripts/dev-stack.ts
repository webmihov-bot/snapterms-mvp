import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { SAMPLE_BONUS, SAMPLE_MAIN } from "../lib/report/sampleFixture";

/**
 * pnpm dev:stack — local stand-ins so the whole app runs without any account:
 *   - Postgres (in-memory PGlite, migrated) on 127.0.0.1:54329
 *   - Supabase Auth mock + OpenAI-compatible LLM mock on 127.0.0.1:54330
 * Sign in with any email; the code is always 123456. The LLM mock answers with the Northbridge fixture extraction.
 * Never deploy this. Copy the printed variables into .env.local, then `pnpm dev` (or build + start).
 */
const DB_PORT = 54329;
const HTTP_PORT = 54330;
const OTP = "123456";

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const userId = (email: string) => {
  const h = createHash("sha256").update(email).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const userFor = (email: string) => ({
  id: userId(email),
  aud: "authenticated",
  role: "authenticated",
  email,
  email_confirmed_at: "2026-01-01T00:00:00Z",
  confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});
function sessionFor(email: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const access_token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: userId(email), email, aud: "authenticated", role: "authenticated", exp })}.devstack`;
  return { access_token, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: `refresh.${Buffer.from(email).toString("base64url")}`, user: userFor(email) };
}
function emailFromBearer(req: IncomingMessage): string | null {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  try {
    return (JSON.parse(Buffer.from(token!.split(".")[1]!, "base64url").toString()) as { email?: string }).email ?? null;
  } catch {
    return null;
  }
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || "{}");
  } catch {
    return {};
  }
}
const send = (res: ServerResponse, status: number, data: unknown) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
};

let llmCalls = 0;

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://x");
  const p = url.pathname;
  const data = req.method === "POST" ? await body(req) : {};

  if (p === "/auth/v1/otp") return send(res, 200, {});
  if (p === "/auth/v1/verify") {
    if (data.token !== OTP || typeof data.email !== "string") return send(res, 403, { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" });
    return send(res, 200, sessionFor(data.email));
  }
  if (p === "/auth/v1/token") {
    const email = Buffer.from(String(data.refresh_token ?? "").replace(/^refresh\./, ""), "base64url").toString();
    return email.includes("@") ? send(res, 200, sessionFor(email)) : send(res, 400, { error: "invalid_grant" });
  }
  if (p === "/auth/v1/user") {
    const email = emailFromBearer(req);
    return email ? send(res, 200, userFor(email)) : send(res, 401, { code: 401, msg: "invalid JWT" });
  }
  if (p === "/auth/v1/logout") {
    res.writeHead(204);
    return res.end();
  }

  if (p === "/llm/chat/completions") {
    llmCalls += 1;
    const messages = (data.messages ?? []) as { role: string; content: string }[];
    const user = messages.find((m) => m.role === "user")?.content ?? "";
    if (user.includes("LLM_FAIL")) return send(res, 500, { error: "simulated failure" });
    const hasMain = user.includes('role="main"');
    const hasBonus = user.includes('role="bonus"');
    const out = hasMain && hasBonus ? { main: SAMPLE_MAIN, bonus: SAMPLE_BONUS } : hasBonus ? SAMPLE_BONUS : SAMPLE_MAIN;
    return send(res, 200, { choices: [{ message: { content: JSON.stringify(out) }, finish_reason: "stop" }], usage: { prompt_tokens: Math.ceil(user.length / 4), completion_tokens: 2400 } });
  }
  if (p === "/llm/calls") return send(res, 200, { calls: llmCalls });

  send(res, 404, { error: "not_found", path: p });
}

async function main() {
  const db = new PGlite();
  await migrate(drizzle(db), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await new PGLiteSocketServer({ db, port: DB_PORT, host: "127.0.0.1", maxConnections: 4 }).start();
  createServer((req, res) => void handle(req, res).catch((e) => send(res, 500, { error: String(e) }))).listen(HTTP_PORT, "127.0.0.1");

  console.log(`dev stack ready. Put this in .env.local (sign-in code is ${OTP}):\n`);
  console.log(
    [
      "APP_URL=http://localhost:3000",
      "APP_SECRET=dev-stack-only-dev-stack-only-dev-stack-0000",
      "SUPPORT_EMAIL=support@example.com",
      "ADMIN_EMAILS=admin@example.com",
      `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${HTTP_PORT}`,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-stack",
      `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:${DB_PORT}/postgres?sslmode=disable`,
      // PGlite is one session shared by every connection, so the app must use a single connection here
      "DATABASE_POOL_MAX=1",
      "LLM_PROVIDER=ollama_cloud",
      "LLM_MODEL=dev-stack-fixture",
      "OLLAMA_API_KEY=dev-stack",
      `OLLAMA_BASE_URL=http://127.0.0.1:${HTTP_PORT}/llm`,
      "LLM_PRICE_IN_EUR_PER_MTOK=0.09",
      "LLM_PRICE_OUT_EUR_PER_MTOK=0.45",
      "STRIPE_SECRET_KEY=sk_test_devstack",
      "STRIPE_WEBHOOK_SECRET=whsec_devstack",
      "STRIPE_PRICE_1=price_devstack1",
      "STRIPE_PRICE_3=price_devstack3",
    ].join("\n"),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
