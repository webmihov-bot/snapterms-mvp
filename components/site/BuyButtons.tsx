"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { COPY } from "@/lib/copy";

export function BuyButtons() {
  const [busy, setBusy] = useState<1 | 3 | null>(null);
  const [err, setErr] = useState(false);
  async function buy(pack: 1 | 3) {
    setBusy(pack);
    setErr(false);
    const res = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pack, returnTo: "account" }) }).catch(() => null);
    if (res?.ok) {
      const { url } = (await res.json()) as { url: string };
      window.location.assign(url);
      return;
    }
    setBusy(null);
    setErr(true);
  }
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" disabled={busy !== null} onClick={() => buy(1)} className={buttonClass("primary")}>
          {busy === 1 ? COPY.paywall.redirecting : COPY.paywall.buyOne}
        </button>
        <button type="button" disabled={busy !== null} onClick={() => buy(3)} className={buttonClass("secondary")}>
          {busy === 3 ? COPY.paywall.redirecting : COPY.paywall.buyThree}
        </button>
      </div>
      {err ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {COPY.paywall.error}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-text-muted">{COPY.paywall.note}</p>
    </div>
  );
}
