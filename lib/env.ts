import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  APP_URL: z.string().url(),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
  ADMIN_EMAILS: optional,
  SUPPORT_EMAIL: z.string().email(),
  SAMPLE_REPORT_ID: optional,
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_PRICE_1: z.string().startsWith("price_"),
  STRIPE_PRICE_3: z.string().startsWith("price_"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Validated server env. Throws one readable error listing every missing variable. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`SnapTerms configuration error. Fix these environment variables:\n${lines.join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (env().ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}
