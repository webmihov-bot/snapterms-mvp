import { z } from "zod";

type Json = { [k: string]: unknown };

const DROP_KEYS = new Set([
  "$schema",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "minItems",
  "maxItems",
  "default",
]);

function walk(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(walk);
  if (!node || typeof node !== "object") return node;
  const src = node as Json;
  const out: Json = {};
  for (const [k, v] of Object.entries(src)) {
    if (DROP_KEYS.has(k)) continue;
    out[k] = walk(v);
  }
  if (out.type === "object" && out.properties && typeof out.properties === "object") {
    out.required = Object.keys(out.properties as Json);
    out.additionalProperties = false;
  }
  return out;
}

/**
 * Zod -> JSON Schema that both Anthropic structured outputs and OpenAI strict json_schema accept:
 * every object closed, every property required (nullability carries "absent"), no numeric/string constraints.
 */
export function toStrictJsonSchema(schema: z.ZodType): Json {
  const raw = z.toJSONSchema(schema, { target: "draft-7", unrepresentable: "throw" });
  return walk(raw) as Json;
}
