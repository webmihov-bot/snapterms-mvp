import type { Metadata } from "next";
import { PricingTable } from "@/components/site/PricingTable";
import { COPY } from "@/lib/copy";

export const metadata: Metadata = { title: COPY.pricing.title };

export default function PricingPage() {
  const P = COPY.pricing;
  return (
    <div className="page-x mx-auto max-w-page py-10">
      <h1 className="text-xl font-semibold">{P.title}</h1>
      <p className="mt-1 text-lg text-text-muted">{P.lead}</p>
      <div className="mt-6">
        <PricingTable />
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="rounded-card border border-border p-5">
          <h2 className="text-lg font-semibold">{P.contains}</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-base">
            {P.containsList.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-card border border-border p-5">
          <h2 className="text-lg font-semibold">{P.refundTitle}</h2>
          <p className="mt-3 text-base">{P.refundBody}</p>
        </section>
      </div>
    </div>
  );
}
