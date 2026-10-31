import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/card";
import { DEFAULT_PROFILE } from "@/config/scoring";
import { currentUser } from "@/lib/auth/session";
import { COPY, fmtDate } from "@/lib/copy";
import { db } from "@/lib/db/client";
import { reports } from "@/lib/db/schema";

export const metadata: Metadata = { title: COPY.reports.title, robots: { index: false } };

export default async function ReportsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/reports");
  const rows = await db()
    .select({ id: reports.id, hostname: reports.hostname, scores: reports.scores, createdAt: reports.createdAt, coverage: reports.coverage, parent: reports.parentReportId })
    .from(reports)
    .where(eq(reports.userId, user.id))
    .orderBy(desc(reports.createdAt))
    .limit(200);
  const L = COPY.reports;

  return (
    <div className="page-x mx-auto max-w-content py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{L.title}</h1>
          <p className="mt-1 text-base text-text-muted">{L.lead}</p>
        </div>
        {rows.length ? <ButtonLink href="/analyse">{L.newCta}</ButtonLink> : null}
      </div>

      {rows.length === 0 ? (
        <section className="mt-8 rounded-card border border-border bg-surface-muted p-6 text-center">
          <svg viewBox="0 0 120 48" className="mx-auto w-32" role="img" aria-label={COPY.landing.howTitle}>
            <rect x="2" y="6" width="44" height="14" rx="7" className="fill-current text-border" />
            <rect x="2" y="28" width="44" height="14" rx="7" className="fill-current text-accent-soft" />
            <path d="M52 24h20" className="stroke-current text-text-muted" strokeWidth="2" />
            <rect x="78" y="10" width="40" height="28" rx="6" className="fill-current text-accent" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold">{L.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-base text-text-muted">{L.emptyBody}</p>
          <ButtonLink href="/analyse" className="mt-6">
            {L.emptyCta}
          </ButtonLink>
        </section>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-card border border-border">
          {rows.map((r) => {
            const p = r.scores.profiles[DEFAULT_PROFILE];
            return (
              <li key={r.id}>
                <Link href={`/report/${r.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{r.hostname}</p>
                    <p className="text-sm text-text-muted">
                      {fmtDate(r.createdAt)} · {COPY.report.coverage[r.coverage]}
                      {r.parent ? ` · ${L.changed}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <Chip tone={p.verdict}>{COPY.report.verdict[p.verdict]}</Chip>
                    <span className="text-sm font-semibold tabular">{L.score(p.overall)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
