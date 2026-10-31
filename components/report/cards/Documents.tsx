import { Card } from "@/components/ui/card";
import { COPY, fmtChars } from "@/lib/copy";
import type { ReportData } from "@/lib/report/view";

export function DocumentsCard({ r }: { r: ReportData }) {
  const D = COPY.report.documents;
  const read = r.documents.filter((d) => d.status === "read").length;
  return (
    <Card id="card-documents" title={D.title} line={D.line(read)}>
      <ul className="divide-y divide-border">
        {r.documents.map((d) => {
          const ok = d.status === "read";
          const where = d.url ? new URL(d.url).hostname : d.filename ?? (d.sourceType ? D.sourcePaste : D.missing);
          const source = d.sourceType === "url" ? D.sourceUrl : d.sourceType === "file" ? D.sourceFile : d.sourceType === "paste" ? D.sourcePaste : null;
          const reason = d.status === "blocked" ? (d.reason ? COPY.blocked.reasons[d.reason] ?? D.blocked : D.blocked) : d.status === "missing" ? D.missing : null;
          return (
            <li key={d.role} className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 ${ok ? "" : "text-text-muted"}`}>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{d.role === "main" ? D.roleMain : D.roleBonus}</p>
                <p className="truncate text-sm">
                  {where}
                  {source ? ` · ${source}` : ""}
                </p>
              </div>
              <p className="text-sm tabular">{ok ? fmtChars(d.chars) : reason}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
