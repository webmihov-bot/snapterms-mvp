import { LEGAL } from "@/lib/copy";

export function LegalPage({ doc }: { doc: { title: string; sections: readonly { h: string; p: readonly string[] }[] } }) {
  return (
    <article className="page-x mx-auto max-w-content py-10">
      <h1 className="text-xl font-semibold">{doc.title}</h1>
      <p className="mt-1 text-sm text-text-muted">{LEGAL.updated}</p>
      {doc.sections.map((s) => (
        <section key={s.h} className="mt-6">
          <h2 className="text-lg font-semibold">{s.h}</h2>
          {s.p.map((p) => (
            <p key={p.slice(0, 40)} className="mt-2 text-base">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
