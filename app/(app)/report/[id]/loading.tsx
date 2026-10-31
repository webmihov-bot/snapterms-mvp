import { ReportSkeleton } from "@/components/report/ReportSkeleton";

export default function Loading() {
  return (
    <div className="page-x mx-auto max-w-content py-6">
      <div className="mb-4 h-8 w-48 animate-pulse rounded-input bg-surface-muted" />
      <ReportSkeleton />
    </div>
  );
}
