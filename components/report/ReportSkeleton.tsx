import { COPY } from "@/lib/copy";

function Block({ h }: { h: string }) {
  return <div className={`animate-pulse rounded-input bg-surface-muted ${h}`} />;
}

/** Skeleton of the real card layout — never a spinner alone. */
export function ReportSkeleton({ label = COPY.a11y.loading }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      <div className="rounded-card border border-border p-6">
        <Block h="h-3 w-20" />
        <div className="mx-auto mt-6 h-[120px] w-[240px] rounded-t-full bg-surface-muted" />
        <div className="mx-auto mt-4 h-6 w-40 rounded-input bg-surface-muted" />
        <div className="mt-4 flex justify-center gap-2">
          <Block h="h-8 w-32 rounded-pill" />
          <Block h="h-8 w-32 rounded-pill" />
        </div>
      </div>
      <div className="rounded-card border border-border p-6">
        <Block h="h-3 w-24" />
        <div className="mt-4 space-y-3">
          <Block h="h-10 w-full" />
          <Block h="h-10 w-full" />
        </div>
      </div>
      <div className="rounded-card border border-border p-6">
        <Block h="h-3 w-24" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Block key={i} h="h-20 w-full" />
          ))}
        </div>
      </div>
      <div className="rounded-card border border-border p-6">
        <Block h="h-3 w-28" />
        <Block h="mt-4 h-16 w-full" />
      </div>
    </div>
  );
}
