import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AnalyseForm } from "@/components/input/AnalyseForm";
import { currentUser } from "@/lib/auth/session";
import { COPY } from "@/lib/copy";
import { db } from "@/lib/db/client";
import { reports } from "@/lib/db/schema";
import { quotaStatus } from "@/lib/quota/createReport";

export const metadata: Metadata = { title: COPY.analyse.title, robots: { index: false } };

export default async function AnalysePage({ searchParams }: { searchParams: Promise<{ from?: string; paid?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/analyse");
  const { from } = await searchParams;
  const database = db();

  let prefill = { mainUrl: "", host: null as string | null };
  if (from && /^[0-9a-f-]{36}$/i.test(from)) {
    const [r] = await database
      .select({ mainUrl: reports.mainUrl, hostname: reports.hostname })
      .from(reports)
      .where(and(eq(reports.id, from), eq(reports.userId, user.id)));
    if (r) prefill = { mainUrl: r.mainUrl ?? "", host: r.hostname };
  }
  const quota = await quotaStatus(database, user.id);

  return (
    <div className="page-x mx-auto max-w-content py-8">
      <h1 className="text-xl font-semibold">{COPY.analyse.title}</h1>
      <p className="mt-1 text-base text-text-muted">{COPY.analyse.lead}</p>
      {!user.verified ? (
        <p role="alert" className="mt-4 rounded-input bg-warn-soft p-3 text-sm text-warn">
          {COPY.analyse.errors.unverified}
        </p>
      ) : null}
      <div className="mt-6">
        <AnalyseForm needAge={!user.row.ageConfirmedAt} quota={quota} prefill={prefill} />
      </div>
    </div>
  );
}
