import Link from "next/link";
import { COPY, RG_RESOURCES } from "@/lib/copy";

export function resourcesFor(country: string | null) {
  const local = country ? RG_RESOURCES[country.toUpperCase()] : undefined;
  return { local: local ?? null, intl: RG_RESOURCES.INTL ?? [] };
}

export function RgBlock({ country }: { country: string | null }) {
  const { local, intl } = resourcesFor(country);
  const list = [...(local ?? []), ...intl].slice(0, 3);
  return (
    <section aria-labelledby="rg-title" className="rounded-card border border-border bg-surface p-4">
      <h2 id="rg-title" className="text-base font-semibold">
        {COPY.footer.rgTitle}
      </h2>
      <p className="mt-1 text-sm text-text-muted">{COPY.footer.rgBody}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {list.map((r) => (
          <li key={r.url}>
            <a href={r.url} rel="noopener noreferrer" target="_blank" className="font-semibold text-accent hover:underline">
              {r.name}
            </a>
            {r.phone ? <span className="tabular"> · {r.phone}</span> : null}
          </li>
        ))}
      </ul>
      <Link href="/legal/responsible-gaming" className="touch mt-2 inline-flex items-center text-sm font-semibold text-accent hover:underline">
        {COPY.footer.rgCta}
      </Link>
    </section>
  );
}
