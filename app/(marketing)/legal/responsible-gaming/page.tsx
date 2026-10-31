import type { Metadata } from "next";
import { resourcesFor } from "@/components/site/RgBlock";
import { visitorCountry } from "@/lib/auth/signedIn";
import { RG_COPY, type RgResource } from "@/lib/copy";

export const metadata: Metadata = { title: RG_COPY.title };

function List({ items }: { items: RgResource[] }) {
  return (
    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
      {items.map((r) => (
        <li key={r.url} className="rounded-card border border-border p-4">
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-base font-semibold text-accent hover:underline">
            {r.name}
          </a>
          {r.phone ? (
            <p className="mt-1 text-lg font-semibold tabular">
              <a href={`tel:${r.phone.replace(/[^\d+A-Z]/gi, "")}`}>{r.phone}</a>
            </p>
          ) : null}
          <p className="mt-1 text-sm text-text-muted">{r.note}</p>
        </li>
      ))}
    </ul>
  );
}

/** Help resources first, resolved by visitor market with an international fallback. */
export default async function RgPage() {
  const country = await visitorCountry();
  const { local, intl } = resourcesFor(country);
  return (
    <article className="page-x mx-auto max-w-content py-10">
      <h1 className="text-xl font-semibold">{RG_COPY.title}</h1>
      <p className="mt-2 text-lg">{RG_COPY.lead}</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{RG_COPY.helpFirst}</h2>
        {local ? (
          <>
            <p className="mt-1 text-sm text-text-muted">{RG_COPY.near(country)}</p>
            <List items={local} />
          </>
        ) : null}
        <p className="mt-4 text-sm text-text-muted">{RG_COPY.international}</p>
        <List items={intl} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{RG_COPY.signs}</h2>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {RG_COPY.signsList.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-lg font-semibold">{RG_COPY.tools}</h2>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {RG_COPY.toolsList.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
      <section className="mt-8 rounded-card bg-surface-muted p-4">
        <h2 className="text-base font-semibold">{RG_COPY.ourRole}</h2>
        <p className="mt-1 text-sm">{RG_COPY.ourRoleBody}</p>
      </section>
    </article>
  );
}
