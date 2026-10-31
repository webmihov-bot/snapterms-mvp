import Link from "next/link";
import { BRAND, COPY } from "@/lib/copy";

export function Wordmark() {
  return (
    <Link href="/" className="touch inline-flex items-center gap-2 text-lg font-semibold" aria-label={COPY.nav.home}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="text-accent">
        <rect x="1" y="1" width="18" height="18" rx="5" fill="currentColor" />
        <path d="M6 10.5l2.5 2.5L14 7.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{BRAND}</span>
    </Link>
  );
}

export function Header({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="border-b border-border bg-surface">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-surface focus:p-2">
        {COPY.nav.skip}
      </a>
      <div className="page-x mx-auto flex h-16 max-w-page items-center justify-between gap-4">
        <Wordmark />
        <nav aria-label={COPY.a11y.menu} className="flex items-center gap-1 text-sm font-semibold sm:gap-4">
          <Link href="/reports" className="touch inline-flex items-center px-2 text-ink hover:text-accent">
            {COPY.nav.myReports}
          </Link>
          {signedIn ? (
            <Link href="/account" className="touch inline-flex items-center px-2 text-ink hover:text-accent">
              {COPY.nav.account}
            </Link>
          ) : (
            <Link href="/login" className="touch inline-flex items-center px-2 text-accent">
              {COPY.nav.signIn}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
