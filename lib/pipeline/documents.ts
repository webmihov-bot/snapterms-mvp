import { z } from "zod";
import { MAX_TEXT_CHARS, type DocInput } from "@/lib/fetch/getText";
import { normalizeUrl } from "@/lib/url/normalize";

export const docInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("url"), url: z.string().max(4096) }),
  z.object({
    kind: z.literal("text"),
    text: z.string().max(MAX_TEXT_CHARS + 10_000),
    sourceType: z.enum(["paste", "file"]),
    filename: z
      .string()
      .max(200)
      .regex(/\.(md|markdown|txt|text)$/i)
      .nullable(),
  }),
]);
export type DocInputBody = z.infer<typeof docInputSchema>;

export type ResolveError = { role: "main" | "bonus"; error: string };

/** Normalises URL inputs server-side and rejects the same URL in both fields. */
export function resolveInputs(main: DocInputBody, bonus: DocInputBody | null): { ok: true; main: DocInput; bonus: DocInput | null } | { ok: false; errors: ResolveError[] } {
  const errors: ResolveError[] = [];
  const toInput = (role: "main" | "bonus", d: DocInputBody): DocInput | null => {
    if (d.kind === "text") return { role, kind: "text", text: d.text, sourceType: d.sourceType, filename: d.filename };
    const n = normalizeUrl(d.url);
    if (!n.ok) {
      errors.push({ role, error: n.error });
      return null;
    }
    return { role, kind: "url", url: n.url };
  };
  const m = toInput("main", main);
  const b = bonus ? toInput("bonus", bonus) : null;
  if (m?.kind === "url" && b?.kind === "url" && m.url === b.url) errors.push({ role: "bonus", error: "same_url" });
  if (errors.length || !m) return { ok: false, errors };
  return { ok: true, main: m, bonus: b };
}
