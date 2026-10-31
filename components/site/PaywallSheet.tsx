"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { COPY, fmtChars } from "@/lib/copy";
import type { DocumentMeta } from "@/lib/schema/extraction";

/** Opens on HTTP 402. Shows what the next report would contain — not a generic upsell. */
export function PaywallSheet({ open, documents, onClose, returnTo = "analyse" }: { open: boolean; documents: DocumentMeta[]; onClose: () => void; returnTo?: "analyse" | "account" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState<1 | 3 | null>(null);
  const [err, setErr] = useState(false);
  const P = COPY.paywall;
  const D = COPY.report.documents;

  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);

  async function buy(pack: 1 | 3) {
    setBusy(pack);
    setErr(false);
    const res = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pack, returnTo }) });
    if (res.ok) {
      const { url } = (await res.json()) as { url: string };
      window.location.assign(url);
      return;
    }
    setBusy(null);
    setErr(true);
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="paywall-title"
      className="animate-fade m-0 mt-auto w-full max-w-none rounded-t-card border border-border bg-surface p-0 text-ink shadow-sticky sm:m-auto sm:max-w-[480px] sm:rounded-card"
    >
      <div className="p-5">
        <h2 id="paywall-title" className="text-lg font-semibold">
          {P.title}
        </h2>
        <p className="mt-1 text-base">{P.lead}</p>
        {documents.some((d) => d.status === "read") ? (
          <>
            <p className="mt-4 text-sm font-semibold text-text-muted">{P.willRead}</p>
            <ul className="mt-1 space-y-1 text-sm">
              {documents
                .filter((d) => d.status === "read")
                .map((d) => (
                  <li key={d.role}>
                    {d.role === "main" ? D.roleMain : D.roleBonus}: {d.url ? new URL(d.url).hostname : d.filename ?? D.sourcePaste} · {fmtChars(d.chars)}
                  </li>
                ))}
            </ul>
          </>
        ) : null}
        <p className="mt-4 text-sm font-semibold text-text-muted">{P.willContain}</p>
        <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
          {P.containsList.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="mt-5 grid gap-2">
          <button type="button" className={buttonClass("primary")} disabled={busy !== null} onClick={() => buy(1)}>
            {busy === 1 ? P.redirecting : P.buyOne}
          </button>
          <button type="button" className={buttonClass("secondary")} disabled={busy !== null} onClick={() => buy(3)}>
            {busy === 3 ? P.redirecting : P.buyThree}
          </button>
        </div>
        {err ? <p role="alert" className="mt-2 text-sm text-danger">{P.error}</p> : null}
        <p className="mt-3 text-sm text-text-muted">{P.note}</p>
        <button type="button" onClick={() => ref.current?.close()} className="touch mt-2 w-full text-sm font-semibold text-text-muted hover:text-ink">
          {P.close}
        </button>
      </div>
    </dialog>
  );
}
