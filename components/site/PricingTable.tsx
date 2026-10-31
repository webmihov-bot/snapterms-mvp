import { ButtonLink } from "@/components/ui/button";
import { COPY } from "@/lib/copy";

export function PricingTable() {
  const P = COPY.pricing;
  const plans = [
    { title: P.freeTitle, price: P.freePrice, body: P.freeBody, highlight: false },
    { title: P.oneTitle, price: P.onePrice, body: P.oneBody, highlight: true },
    { title: P.threeTitle, price: P.threePrice, body: P.threeBody, highlight: false },
  ];
  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.title} className={`rounded-card border p-5 ${p.highlight ? "border-accent" : "border-border"}`}>
            <p className="text-sm font-semibold text-text-muted">{p.title}</p>
            <p className="mt-1 text-xl font-semibold tabular">{p.price}</p>
            <p className="mt-2 text-sm">{p.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-input bg-surface-muted p-3 text-sm">{P.compareRow}</p>
      <p className="mt-3 text-sm text-text-muted">{P.signUpLine}</p>
      <ButtonLink href="/analyse" className="mt-4">
        {P.getStarted}
      </ButtonLink>
    </div>
  );
}
