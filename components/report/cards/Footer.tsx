import Link from "next/link";
import { COPY } from "@/lib/copy";

export function ReportFooterCard() {
  const F = COPY.report.footer;
  return (
    <section aria-label={F.disclaimer} className="rounded-card border border-border bg-surface-muted p-4 text-sm sm:p-6">
      <p>
        <span className="mr-2 inline-flex rounded-pill border border-ink px-2 font-semibold">{F.age}</span>
        {F.disclaimer}
      </p>
      <p className="mt-2">{F.verify}</p>
      <Link href="/legal/responsible-gaming" className="touch mt-2 inline-flex items-center font-semibold text-accent hover:underline">
        {F.rg}
      </Link>
    </section>
  );
}
