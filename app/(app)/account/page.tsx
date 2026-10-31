import { desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BuyButtons } from "@/components/site/BuyButtons";
import { buttonClass } from "@/components/ui/button";
import { currentUser } from "@/lib/auth/session";
import { COPY, fmtDate } from "@/lib/copy";
import { db } from "@/lib/db/client";
import { credits } from "@/lib/db/schema";
import { FREE_REPORTS, quotaStatus } from "@/lib/quota/createReport";

export const metadata: Metadata = { title: COPY.account.title, robots: { index: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ paid?: string; cancelled?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  const { paid, cancelled } = await searchParams;
  const database = db();
  const [quota, purchases] = await Promise.all([
    quotaStatus(database, user.id),
    database
      .select({ session: credits.stripeSessionId, pack: credits.pack, createdAt: sql<Date>`min(${credits.createdAt})`.mapWith((v) => new Date(v)) })
      .from(credits)
      .where(eq(credits.userId, user.id))
      .groupBy(credits.stripeSessionId, credits.pack)
      .orderBy(desc(sql`min(${credits.createdAt})`))
      .limit(50),
  ]);
  const A = COPY.account;

  return (
    <div className="page-x mx-auto max-w-content py-8">
      <h1 className="text-xl font-semibold">{A.title}</h1>
      <p className="mt-1 text-base text-text-muted">{A.signedInAs(user.email)}</p>

      {paid ? (
        <p role="status" className="mt-4 rounded-input bg-success-soft p-3 text-sm text-success">
          {A.paid}
        </p>
      ) : null}
      {cancelled ? (
        <p role="status" className="mt-4 rounded-input bg-surface-muted p-3 text-sm">
          {A.cancelled}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-card border border-border p-4">
          <p className="text-sm text-text-muted">{A.freeTitle}</p>
          <p className="mt-1 text-lg font-semibold tabular">{A.freeValue(user.row.freeReportsUsed, FREE_REPORTS)}</p>
        </div>
        <div className="rounded-card border border-border p-4">
          <p className="text-sm text-text-muted">{A.creditsTitle}</p>
          <p className="mt-1 text-lg font-semibold tabular">{A.creditsValue(quota.credits)}</p>
        </div>
      </div>

      <section className="mt-6 rounded-card border border-border p-4">
        <h2 className="text-base font-semibold">{A.buyTitle}</h2>
        <div className="mt-3">
          <BuyButtons />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold">{A.history}</h2>
        {purchases.length ? (
          <ul className="mt-2 divide-y divide-border text-sm">
            {purchases.map((p) => (
              <li key={p.session} className="py-2 tabular">
                {A.historyRow(p.pack, fmtDate(p.createdAt))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-text-muted">{A.historyEmpty}</p>
        )}
      </section>

      <section className="mt-6 rounded-card bg-surface-muted p-4">
        <h2 className="text-base font-semibold">{A.deleteTitle}</h2>
        <p className="mt-1 text-sm">{A.deleteBody(process.env.SUPPORT_EMAIL ?? "")}</p>
      </section>

      <form action="/auth/signout" method="post" className="mt-6">
        <button className={buttonClass("secondary")}>{COPY.signOut}</button>
      </form>
    </div>
  );
}
