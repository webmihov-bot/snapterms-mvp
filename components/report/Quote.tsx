"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { COPY } from "@/lib/copy";
import type { QuoteRef } from "@/lib/report/view";

const Ctx = createContext<(q: QuoteRef) => void>(() => {});

/** One dialog per report: bottom sheet under 640px, floating panel on desktop. */
export function QuoteProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState<QuoteRef | null>(null);
  const open = useCallback((next: QuoteRef) => {
    setQ(next);
    ref.current?.showModal();
  }, []);
  const R = COPY.report;
  const role = q?.role === "bonus" ? R.documents.roleBonus : R.documents.roleMain;

  return (
    <Ctx.Provider value={open}>
      {children}
      <dialog
        ref={ref}
        aria-labelledby="quote-title"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="animate-fade m-0 mt-auto w-full max-w-none rounded-t-card border border-border bg-surface p-0 text-ink shadow-sticky sm:m-auto sm:max-w-[480px] sm:rounded-card"
      >
        {q ? (
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p id="quote-title" className="text-base font-semibold">
                  {q.label}
                </p>
                {q.role ? <p className="mt-1 text-sm text-text-muted">{R.quote.from(role, q.clauseRef)}</p> : null}
              </div>
              <button type="button" onClick={() => ref.current?.close()} className="touch -mr-2 -mt-2 inline-flex items-center justify-center rounded-input text-text-muted hover:text-ink" aria-label={R.quote.close}>
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {q.meaning ? <p className="mt-3 text-base">{q.meaning}</p> : null}
            {q.quote ? (
              <blockquote className="mt-4 border-l-2 border-accent bg-surface-muted p-3 text-sm italic">{q.quote}</blockquote>
            ) : (
              <p className="mt-4 text-sm text-text-muted">{q.reason === "ambiguous" ? R.quote.ambiguous : R.quote.notFound}</p>
            )}
            {q.action ? <p className="mt-4 text-sm font-semibold">{q.action}</p> : null}
            <form method="dialog" className="mt-5">
              <button className="touch w-full rounded-input border border-border text-base font-semibold hover:bg-surface-muted">{R.quote.close}</button>
            </form>
          </div>
        ) : null}
      </dialog>
    </Ctx.Provider>
  );
}

export function useQuote() {
  return useContext(Ctx);
}

/** Wraps a displayed value: every number opens its source quote. */
export function QuoteTrigger({ quote, children, className = "" }: { quote: QuoteRef; children: ReactNode; className?: string }) {
  const open = useQuote();
  return (
    <button
      type="button"
      onClick={() => open(quote)}
      aria-label={COPY.report.quote.open(quote.label)}
      className={`touch -m-1 inline-flex items-center rounded-input p-1 text-left underline decoration-border decoration-dotted underline-offset-4 hover:decoration-accent ${className}`}
    >
      {children}
    </button>
  );
}
