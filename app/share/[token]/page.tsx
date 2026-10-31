import type { Metadata } from "next";
import { ReportView } from "@/components/report/ReportView";
import { ButtonLink } from "@/components/ui/button";
import { COPY } from "@/lib/copy";
import { env } from "@/lib/env";
import { loadReportById } from "@/lib/report/load";
import { verifyShareToken } from "@/lib/share/token";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const id = verifyShareToken(token, env().APP_SECRET);
  const report = id ? await loadReportById(id) : null;
  if (!report) {
    return (
      <div className="page-x mx-auto max-w-content py-16 text-center">
        <h1 className="text-xl font-semibold">{COPY.shareExpired.title}</h1>
        <ButtonLink href="/" className="mt-6">
          {COPY.shareExpired.cta}
        </ButtonLink>
      </div>
    );
  }
  const C = COPY.report.shareCta;
  return (
    <div className="page-x mx-auto max-w-content py-6">
      <p className="text-sm text-text-muted">{COPY.report.sharedLabel}</p>
      <h1 className="mb-4 truncate text-xl font-semibold">{report.hostname}</h1>
      <ReportView report={report} mode="share" />
      <section className="mt-6 rounded-card border border-accent bg-accent-soft p-6 text-center">
        <h2 className="text-lg font-semibold">{C.title}</h2>
        <p className="mt-1 text-base">{C.body}</p>
        <ButtonLink href="/analyse" className="mt-4">
          {C.button}
        </ButtonLink>
      </section>
    </div>
  );
}
