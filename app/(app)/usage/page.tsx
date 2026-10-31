import { gt, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { llmConfig } from "@/config/llm";
import { currentUser } from "@/lib/auth/session";
import { COPY, fmtMoney } from "@/lib/copy";
import { db } from "@/lib/db/client";
import { reports } from "@/lib/db/schema";
import { isAdmin } from "@/lib/env";

export const metadata: Metadata = { title: COPY.usage.title, robots: { index: false } };

/** Read-only. Config is never editable from the web app. */
export default async function UsagePage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/usage");
  const U = COPY.usage;
  if (!isAdmin(user.email)) {
    return (
      <div className="page-x mx-auto max-w-content py-16">
        <h1 className="text-xl font-semibold">{U.forbidden}</h1>
      </div>
    );
  }
  const cfg = llmConfig();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [stats] = await db()
    .select({
      n: sql<number>`count(*)`.mapWith(Number),
      avgCost: sql<number>`coalesce(avg((${reports.meta}->>'costEur')::numeric) filter (where ${reports.meta}->>'path' <> 'cache'), 0)`.mapWith(Number),
      p95: sql<number>`coalesce(percentile_cont(0.95) within group (order by (${reports.meta}->>'latencyMs')::numeric) filter (where ${reports.meta}->>'path' <> 'cache'), 0)`.mapWith(Number),
    })
    .from(reports)
    .where(gt(reports.createdAt, since));

  const rows: [string, string][] = [
    [U.provider, cfg.primary.id],
    [U.model, cfg.primary.model],
    [U.fallback, cfg.fallback ? `${cfg.fallback.id} · ${cfg.fallback.model}` : U.none],
    [U.reports, String(stats?.n ?? 0)],
    [U.avgCost, fmtMoney(stats?.avgCost ?? 0, "EUR", 4)],
    [U.p95, `${((stats?.p95 ?? 0) / 1000).toFixed(1)} s`],
  ];
  return (
    <div className="page-x mx-auto max-w-content py-8">
      <h1 className="text-xl font-semibold">{U.title}</h1>
      <dl className="mt-6 divide-y divide-border rounded-card border border-border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-text-muted">{k}</dt>
            <dd className="font-semibold tabular">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-text-muted">{U.target}</p>
    </div>
  );
}
