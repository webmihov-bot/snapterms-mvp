import { COPY } from "@/lib/copy";

export default function Loading() {
  return (
    <div className="page-x mx-auto max-w-content py-8" role="status" aria-label={COPY.a11y.loading}>
      <div className="h-8 w-40 animate-pulse rounded-input bg-surface-muted" />
      <div className="mt-6 divide-y divide-border rounded-card border border-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-4">
            <div className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded-input bg-surface-muted" />
              <div className="h-3 w-28 animate-pulse rounded-input bg-surface-muted" />
            </div>
            <div className="h-7 w-24 animate-pulse rounded-pill bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
