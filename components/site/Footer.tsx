import Link from "next/link";
import { COPY } from "@/lib/copy";
import { RgBlock } from "./RgBlock";

export function Footer({ country, supportEmail }: { country: string | null; supportEmail: string }) {
  return (
    <footer className="mt-16 border-t border-border bg-surface-muted">
      <div className="page-x mx-auto grid max-w-page gap-8 py-10 md:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">{COPY.footer.legal}</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <Link className="touch inline-flex items-center hover:text-accent" href="/legal/terms">
                {COPY.footer.terms}
              </Link>
            </li>
            <li>
              <Link className="touch inline-flex items-center hover:text-accent" href="/legal/privacy">
                {COPY.footer.privacy}
              </Link>
            </li>
            <li>
              <Link className="touch inline-flex items-center hover:text-accent" href="/legal/responsible-gaming">
                {COPY.footer.rg}
              </Link>
            </li>
            <li>
              <Link className="touch inline-flex items-center hover:text-accent" href="/pricing">
                {COPY.footer.pricing}
              </Link>
            </li>
            <li>
              <a className="touch inline-flex items-center hover:text-accent" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
            </li>
          </ul>
          <p className="mt-6 text-sm text-text-muted">{COPY.footer.disclaimer}</p>
          <p className="mt-2 text-sm text-text-muted">{COPY.footer.copyright(new Date().getFullYear())}</p>
        </div>
        <RgBlock country={country} />
      </div>
    </footer>
  );
}
