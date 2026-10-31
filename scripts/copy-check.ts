import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * pnpm copy:check — fails when a .tsx file contains user-facing text outside lib/copy.ts:
 * JSX text nodes with letters, or literal aria-label / placeholder / title / alt attributes.
 */
const ROOT = process.cwd();
const DIRS = ["app", "components"];
const JSX_TEXT = />\s*([A-Za-z][^<>{}]*[A-Za-z.!?])\s*</g;
const ATTR = /\b(aria-label|placeholder|title|alt)="([^"]*[A-Za-z][^"]*)"/g;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

const problems: string[] = [];
for (const d of DIRS) {
  for (const file of files(path.join(ROOT, d))) {
    const src = readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file);
    for (const m of src.matchAll(JSX_TEXT)) {
      const text = m[1]!.trim();
      // generics like Record<A, B> and arrow functions are code, not copy
      if (/^(extends|as|typeof|keyof)\b/.test(text) || /=>|[;()]/.test(text)) continue;
      problems.push(`${rel}: text "${text}"`);
    }
    for (const m of src.matchAll(ATTR)) problems.push(`${rel}: ${m[1]}="${m[2]}"`);
  }
}

if (problems.length) {
  console.error(`Hardcoded user-facing strings found (move them to lib/copy.ts):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log("copy:check passed — no user-facing strings outside lib/copy.ts.");
