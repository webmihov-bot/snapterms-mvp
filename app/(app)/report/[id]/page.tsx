import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReportView } from "@/components/report/ReportView";
import { currentUser } from "@/lib/auth/session";
import { loadOwnReport } from "@/lib/report/load";

export const metadata: Metadata = { robots: { index: false } };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/report/${id}`);
  const report = await loadOwnReport(id, user.id);
  if (!report) notFound();
  return (
    <div className="page-x mx-auto max-w-content py-6">
      <h1 className="mb-4 truncate text-xl font-semibold">{report.hostname}</h1>
      <ReportView report={report} mode="owner" />
    </div>
  );
}
