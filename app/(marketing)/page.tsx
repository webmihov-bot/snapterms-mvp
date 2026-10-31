import Link from "next/link";
import { ReportView } from "@/components/report/ReportView";
import { PricingTable } from "@/components/site/PricingTable";
import { ButtonLink } from "@/components/ui/button";
import { COPY } from "@/lib/copy";
import { loadReportById } from "@/lib/report/load";
import { sampleReport } from "@/lib/report/sample";

async function sample() {
  const id = process.env.SAMPLE_REPORT_ID;
  if (id) {
    const real = await loadReportById(id).catch(() => null);
    if (real) return { report: real, real: true };
  }
  return { report: sampleReport(), real: false };
}

function HowVisual() {
  const L = COPY.landing;
  return (
    <svg viewBox="0 0 320 96" role="img" aria-label={`${L.howLinkMain}, ${L.howLinkBonus}: ${L.howArrow}`} className="block w-full max-w-[420px]">
      <rect x="0" y="8" width="150" height="32" rx="16" className="fill-current text-surface-muted" />
      <text x="16" y="29" className="fill-ink" style={{ fontSize: 13 }}>
        {L.howLinkMain}
      </text>
      <rect x="0" y="56" width="150" height="32" rx="16" className="fill-current text-accent-soft" />
      <text x="16" y="77" className="fill-accent" style={{ fontSize: 13, fontWeight: 600 }}>
        {L.howLinkBonus}
      </text>
      <path d="M160 24 C 190 24, 190 48, 214 48 M160 72 C 190 72, 190 48, 214 48" fill="none" className="stroke-current text-border" strokeWidth="2" />
      <rect x="218" y="28" width="102" height="40" rx="10" className="fill-current text-accent" />
      <text x="269" y="53" textAnchor="middle" className="fill-surface" style={{ fontSize: 14, fontWeight: 600 }}>
        {L.howArrow}
      </text>
    </svg>
  );
}

export default async function Landing() {
  const L = COPY.landing;
  const s = await sample();
  const seconds = s.real && s.report.latencyMs ? Math.max(1, Math.round(s.report.latencyMs / 1000)) : null;

  return (
    <>
      <section className="bg-hero-tint">
        <div className="page-x mx-auto max-w-page py-14 md:py-20">
          <h1 className="max-w-[720px] text-2xl font-semibold">{L.h1}</h1>
          <p className="mt-4 max-w-[560px] text-lg text-text-muted">
            {L.sub1}
            <br />
            {L.sub2}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink href="/analyse">{L.cta}</ButtonLink>
            <Link href="#sample" className="touch inline-flex items-center font-semibold text-accent hover:underline">
              {L.sample}
            </Link>
          </div>
        </div>
      </section>

      <section id="sample" aria-labelledby="sample-title" className="page-x mx-auto max-w-content py-12">
        <h2 id="sample-title" className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          {L.sampleCaption(seconds)}
        </h2>
        {!s.real ? <p className="mt-1 text-sm text-text-muted">{L.sampleIllustrative}</p> : null}
        <div className="mt-4">
          <ReportView report={s.report} mode="sample" cards="sample" />
        </div>
      </section>

      <section aria-labelledby="how-title" className="border-y border-border bg-surface-muted">
        <div className="page-x mx-auto max-w-page py-12">
          <h2 id="how-title" className="text-xl font-semibold">
            {L.howTitle}
          </h2>
          <div className="mt-6">
            <HowVisual />
          </div>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {L.how.map((h, i) => (
              <li key={h.title}>
                <p className="text-sm font-semibold text-accent tabular">{i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold">{h.title}</h3>
                <p className="mt-1 text-base text-text-muted">{h.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="get-title" className="page-x mx-auto max-w-page py-12">
        <h2 id="get-title" className="text-xl font-semibold">
          {L.getTitle}
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {L.get.map((g) => (
            <li key={g.title} className="rounded-card border border-border p-5 shadow-card">
              <h3 className="text-base font-semibold">{g.title}</h3>
              <p className="mt-1 text-sm text-text-muted">{g.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pricing-title" className="border-y border-border bg-surface-muted">
        <div className="page-x mx-auto max-w-page py-12">
          <h2 id="pricing-title" className="text-xl font-semibold">
            {L.pricingTitle}
          </h2>
          <div className="mt-6">
            <PricingTable />
          </div>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="page-x mx-auto max-w-content py-12">
        <h2 id="faq-title" className="text-xl font-semibold">
          {L.faqTitle}
        </h2>
        <div className="mt-6 divide-y divide-border rounded-card border border-border">
          {L.faq.map((f) => (
            <details key={f.q} className="group px-4">
              <summary className="touch flex cursor-pointer items-center justify-between gap-4 py-3 text-base font-semibold">
                {f.q}
                <span aria-hidden="true" className="text-text-muted transition-transform duration-150 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-4 text-base text-text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
