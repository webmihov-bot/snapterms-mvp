"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_PROFILE } from "@/config/scoring";
import { buttonClass } from "@/components/ui/button";
import { COPY, fmtDate } from "@/lib/copy";
import { reportToText } from "@/lib/export/toText";
import type { ProfileId } from "@/lib/pipeline/types";
import { fieldLabel, formatValue, type ReportData } from "@/lib/report/view";
import { BonusCostCard } from "./cards/BonusCost";
import { ContradictionCard } from "./cards/Contradiction";
import { DocumentsCard } from "./cards/Documents";
import { ReportFooterCard } from "./cards/Footer";
import { MoneyCard } from "./cards/Money";
import { PayoutCard } from "./cards/Payout";
import { PlaybookCard } from "./cards/Playbook";
import { RiskChipsCard } from "./cards/RiskChips";
import { VerdictCard } from "./cards/Verdict";
import { VoidRisksCard } from "./cards/VoidRisks";
import { WageringCard } from "./cards/Wagering";
import { ProfileSwitch } from "./ProfileSwitch";
import { QuoteProvider } from "./Quote";

type Mode = "owner" | "share" | "sample";

const TONE = { good: "bg-success", caution: "bg-warn", poor: "bg-danger" } as const;

function ChangesBanner({ r }: { r: ReportData }) {
  const C = COPY.report.changes;
  if (!r.changedFields?.length || !r.parentCreatedAt) return null;
  return (
    <section aria-labelledby="changes-title" className="rounded-card border border-warn bg-warn-soft p-4">
      <h2 id="changes-title" className="text-base font-semibold text-warn">
        {C.title}
      </h2>
      <p className="mt-1 text-sm">{C.line(r.changedFields.length, fmtDate(r.parentCreatedAt))}</p>
      <ul className="mt-3 space-y-1 text-sm">
        {r.changedFields.slice(0, 8).map((c) => (
          <li key={c.field} className="flex flex-wrap gap-x-2">
            <span className="font-semibold">{fieldLabel(c.field)}:</span>
            <span className="tabular line-through">{formatValue(c.field, c.before)}</span>
            <span aria-hidden="true">→</span>
            <span className="tabular font-semibold">{formatValue(c.field, c.after)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReportView({ report: r, mode, cards = "all" }: { report: ReportData; mode: Mode; cards?: "all" | "sample" }) {
  const [profile, setProfile] = useState<ProfileId>(DEFAULT_PROFILE);
  const [sticky, setSticky] = useState(false);
  const verdictRef = useRef<HTMLDivElement>(null);
  const p = r.scores.profiles[profile];
  const R = COPY.report;

  useEffect(() => {
    if (mode === "sample") return;
    const el = verdictRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSticky(!!e && !e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  return (
    <QuoteProvider>
      {mode !== "sample" ? (
        <div
          aria-hidden={!sticky}
          className={`fixed inset-x-0 top-0 z-30 border-b border-border bg-surface shadow-sticky transition-opacity duration-150 ${sticky ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <div className="page-x mx-auto flex max-w-content items-center justify-between gap-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-pill ${TONE[p.verdict]}`} />
              <span className="truncate text-sm font-semibold">{R.verdict[p.verdict]}</span>
              <span className="text-sm tabular text-text-muted">{R.sticky.score(p.overall)}</span>
            </div>
            <ProfileSwitch value={profile} onChange={setProfile} compact />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {mode !== "sample" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ProfileSwitch value={profile} onChange={setProfile} />
            <p className="text-sm text-text-muted">{R.created(fmtDate(r.createdAt))}</p>
          </div>
        ) : null}
        <ChangesBanner r={r} />
        <div ref={verdictRef}>
          <VerdictCard r={r} profile={profile} />
        </div>
        <DocumentsCard r={r} />
        <MoneyCard r={r} />
        <BonusCostCard r={r} />
        {cards === "all" ? (
          <>
            <WageringCard r={r} />
            <PayoutCard r={r} />
            <ContradictionCard r={r} />
            <RiskChipsCard r={r} />
            <PlaybookCard r={r} />
            <VoidRisksCard r={r} />
            <ReportFooterCard />
          </>
        ) : null}
      </div>

      {mode === "owner" ? <ActionBar r={r} profile={profile} /> : null}
    </QuoteProvider>
  );
}

type Recheck = { state: "idle" } | { state: "checking" } | { state: "unchanged"; at: string } | { state: "changed" } | { state: "blocked" };

function ActionBar({ r, profile }: { r: ReportData; profile: ProfileId }) {
  const A = COPY.report.actions;
  const router = useRouter();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [flash, setFlash] = useState<"share" | "copy" | null>(null);
  const [recheck, setRecheck] = useState<Recheck>({ state: "idle" });
  const [running, setRunning] = useState(false);

  async function getShareUrl(): Promise<string | null> {
    if (shareUrl) return shareUrl;
    const res = await fetch(`/api/reports/${r.id}/share`, { method: "POST" });
    if (!res.ok) return null;
    const { url } = (await res.json()) as { url: string };
    setShareUrl(url);
    return url;
  }

  async function onShare() {
    const url = await getShareUrl();
    if (!url) return;
    if (navigator.share) {
      await navigator.share({ title: COPY.text.heading(r.hostname), url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
    }
    setFlash("share");
    setTimeout(() => setFlash(null), 2000);
  }

  async function onCopy() {
    const url = await getShareUrl();
    await navigator.clipboard.writeText(reportToText(r, profile, url)).catch(() => {});
    setFlash("copy");
    setTimeout(() => setFlash(null), 2000);
  }

  async function onRecheck() {
    setRecheck({ state: "checking" });
    const res = await fetch(`/api/reports/${r.id}/recheck`, { method: "POST" });
    if (!res.ok) return setRecheck({ state: "blocked" });
    const body = (await res.json()) as { changed: boolean; blocked?: boolean; checkedAt?: string };
    if (body.blocked) return setRecheck({ state: "blocked" });
    setRecheck(body.changed ? { state: "changed" } : { state: "unchanged", at: body.checkedAt ?? new Date().toISOString() });
  }

  async function onRunUpdated() {
    setRunning(true);
    const res = await fetch("/api/analyse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        main: { kind: "url", url: r.mainUrl },
        bonus: r.bonusUrl ? { kind: "url", url: r.bonusUrl } : null,
        parentReportId: r.id,
        allowPartial: true,
      }),
    });
    if (res.ok) {
      const { id } = (await res.json()) as { id: string };
      router.push(`/report/${id}`);
      return;
    }
    setRunning(false);
    router.push(`/analyse?from=${r.id}`);
  }

  return (
    <>
      {recheck.state !== "idle" && recheck.state !== "checking" ? (
        <div role="status" className={`mt-3 rounded-card border p-4 ${recheck.state === "changed" ? "border-warn bg-warn-soft" : "border-border bg-surface-muted"}`}>
          {recheck.state === "unchanged" ? <p className="text-sm">{A.unchanged(fmtDate(recheck.at))}</p> : null}
          {recheck.state === "blocked" ? <p className="text-sm">{A.blockedRecheck}</p> : null}
          {recheck.state === "changed" ? (
            <>
              <p className="text-base font-semibold text-warn">{A.changed}</p>
              <p className="mt-1 text-sm">{A.changedBody}</p>
              <button type="button" onClick={onRunUpdated} disabled={running} className={buttonClass("primary", "mt-3")}>
                {running ? COPY.analyse.submitting : A.runUpdated}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3">
        <Link href={`/analyse?from=${r.id}`} className="touch inline-flex items-center text-sm font-semibold text-accent hover:underline">
          {A.another(r.hostname)}
        </Link>
      </div>

      <div className="h-20 sm:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface shadow-sticky sm:static sm:mt-3 sm:border-0 sm:bg-transparent sm:shadow-none">
        <div className="page-x mx-auto grid max-w-content grid-cols-3 gap-2 py-2 sm:px-0">
          <button type="button" onClick={onShare} className={buttonClass("secondary", "px-2 text-sm")}>
            {flash === "share" ? A.shared : A.share}
          </button>
          <button type="button" onClick={onCopy} className={buttonClass("secondary", "px-2 text-sm")}>
            {flash === "copy" ? A.copied : A.copy}
          </button>
          <button type="button" onClick={onRecheck} disabled={recheck.state === "checking" || !r.mainUrl} className={buttonClass("secondary", "px-2 text-sm")}>
            {recheck.state === "checking" ? A.checking : A.checkAgain}
          </button>
        </div>
      </div>
    </>
  );
}
