"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { ReportSkeleton } from "@/components/report/ReportSkeleton";
import { PaywallSheet } from "@/components/site/PaywallSheet";
import { buttonClass } from "@/components/ui/button";
import { COPY } from "@/lib/copy";
import type { DocRole, DocumentMeta } from "@/lib/schema/extraction";
import { normalizePair, type NormalizeResult } from "@/lib/url/normalize";

const MAX_TEXT = 200_000;
const MAX_FILE = 1024 * 1024;
const FILE_RE = /\.(md|markdown|txt|text)$/i;

interface TextDoc {
  text: string;
  sourceType: "paste" | "file";
  filename: string | null;
}

type Phase = "idle" | "running" | "needs_input";

export interface AnalyseFormProps {
  needAge: boolean;
  quota: { freeLeft: number; credits: number };
  prefill: { mainUrl: string; host: string | null };
}

function UrlPreview({ result, id }: { result: NormalizeResult | null; id: string }) {
  const A = COPY.analyse;
  if (!result) return null;
  if (!result.ok)
    return result.error === "empty" ? null : (
      <p id={id} role="alert" className="mt-1 text-sm text-danger">
        {A.errors[result.error]}
      </p>
    );
  return (
    <p id={id} className="mt-1 truncate text-sm text-text-muted">
      {A.willRead}: <span className="text-ink">{result.url}</span>
    </p>
  );
}

function BlockedNotice({ doc }: { doc: DocumentMeta }) {
  const B = COPY.blocked;
  const role = doc.role === "main" ? COPY.analyse.roleMain : COPY.analyse.roleBonus;
  return (
    <div role="alert" className="rounded-input border border-warn bg-warn-soft p-3 text-sm">
      <p className="font-semibold text-warn">{B.title(role)}</p>
      <p className="mt-1">
        {(doc.reason && B.reasons[doc.reason]) || B.reasons.http_status} {B.paste}
      </p>
    </div>
  );
}

export function AnalyseForm({ needAge, quota, prefill }: AnalyseFormProps) {
  const A = COPY.analyse;
  const router = useRouter();
  const ids = { main: useId(), bonus: useId(), mainHelp: useId(), bonusHelp: useId(), paste: useId(), age: useId() };
  const fileRef = useRef<HTMLInputElement>(null);

  const [mainUrl, setMainUrl] = useState(prefill.mainUrl);
  const [bonusUrl, setBonusUrl] = useState("");
  const [texts, setTexts] = useState<Partial<Record<DocRole, TextDoc>>>({});
  const [pasteRole, setPasteRole] = useState<DocRole>("main");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [age, setAge] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [paywall, setPaywall] = useState(false);

  const resolved = useMemo(() => normalizePair(texts.main ? "" : mainUrl, texts.bonus ? "" : bonusUrl), [mainUrl, bonusUrl, texts.main, texts.bonus]);
  const fileCount = Object.values(texts).filter((t) => t?.sourceType === "file").length;
  const blocked = documents.filter((d) => d.status === "blocked");
  const mainReadOk = documents.find((d) => d.role === "main")?.status === "read";

  function setPaste(role: DocRole, text: string) {
    setTexts((t) => ({ ...t, [role]: text ? { text, sourceType: "paste", filename: null } : undefined }));
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    const files = Array.from(list);
    if (fileCount + files.length > 2) return setError(A.errors.fileCount);
    let role = pasteRole;
    for (const f of files) {
      if (!FILE_RE.test(f.name)) return setError(A.errors.fileType);
      if (f.size > MAX_FILE) return setError(A.errors.fileSize);
      const text = (await f.text()).slice(0, MAX_TEXT);
      const target = role;
      setTexts((t) => ({ ...t, [target]: { text, sourceType: "file", filename: f.name } }));
      role = role === "main" ? "bonus" : "main";
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function docBody(role: DocRole) {
    const t = texts[role];
    if (t) return { kind: "text", text: t.text, sourceType: t.sourceType, filename: t.filename };
    const r = role === "main" ? resolved.main : resolved.bonus;
    return r?.ok ? { kind: "url", url: r.url } : null;
  }

  async function submit(allowPartial = false) {
    setError(null);
    const main = docBody("main");
    if (!main) {
      setError(resolved.main.ok || texts.main ? A.errors.needMain : A.errors[resolved.main.ok ? "empty" : resolved.main.error]);
      return;
    }
    if (resolved.bonus && !resolved.bonus.ok && !texts.bonus) return setError(A.errors[resolved.bonus.error]);
    if (needAge && !age) return setError(A.ageRequired);

    setPhase("running");
    const res = await fetch("/api/analyse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ main, bonus: docBody("bonus"), allowPartial, ageConfirmed: age }),
    }).catch(() => null);

    if (!res) {
      setPhase("idle");
      return setError(A.errors.generic);
    }
    const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string; documents?: DocumentMeta[]; bothBlocked?: boolean };
    if (res.ok && body.id) {
      router.push(`/report/${body.id}`);
      return;
    }
    setPhase("idle");
    if (body.documents) setDocuments(body.documents);
    switch (body.error) {
      case "needs_input": {
        setPhase("needs_input");
        const first = body.documents?.find((d) => d.status === "blocked");
        if (first) setPasteRole(first.role);
        setPasteOpen(true);
        if (body.bothBlocked) setError(A.errors.bothBlocked);
        return;
      }
      case "quota_exhausted":
        return setPaywall(true);
      case "rate_hour":
        return setError(A.errors.rateHour);
      case "rate_day":
        return setError(A.errors.rateDay);
      case "rate_ip":
        return setError(A.errors.rateIp);
      case "llm_failed":
        return setError(A.errors.llm);
      case "unverified":
        return setError(A.errors.unverified);
      case "age_required":
        return setError(A.ageRequired);
      case "unauthorized":
        router.push("/login?next=/analyse");
        return;
      default:
        return setError(A.errors.generic);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(false);
  }

  if (phase === "running") {
    return (
      <div aria-live="polite">
        <ol className="mb-4 space-y-1 text-sm text-text-muted">
          {A.steps.map((s) => (
            <li key={s} className="animate-pulse">
              {s}
            </li>
          ))}
        </ol>
        <ReportSkeleton label={A.submitting} />
      </div>
    );
  }

  const roleLabel = pasteRole === "main" ? A.roleMain : A.roleBonus;
  const current = texts[pasteRole];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <p className="text-sm text-text-muted">{A.quotaLine(quota.freeLeft, quota.credits)}</p>
      {prefill.host ? <p className="rounded-input bg-accent-soft p-3 text-sm text-accent">{A.fromHost(prefill.host)}</p> : null}

      <div>
        <label htmlFor={ids.main} className="text-base font-semibold">
          {A.mainLabel}
        </label>
        <p id={ids.mainHelp} className="text-sm text-text-muted">
          {A.mainHint}
        </p>
        {texts.main ? (
          <p className="mt-2 text-sm">{A.usingText(A.roleMain)}</p>
        ) : (
          <>
            <input
              id={ids.main}
              type="url"
              inputMode="url"
              autoComplete="url"
              required
              value={mainUrl}
              onChange={(e) => setMainUrl(e.target.value)}
              placeholder={A.urlPlaceholderMain}
              aria-describedby={`${ids.mainHelp} ${ids.main}-preview`}
              className="touch mt-2 w-full rounded-input border border-border bg-surface px-3 text-base"
            />
            <UrlPreview result={mainUrl.trim() ? resolved.main : null} id={`${ids.main}-preview`} />
          </>
        )}
      </div>

      <div className="rounded-card border-2 border-accent bg-accent-soft p-4">
        <label htmlFor={ids.bonus} className="text-base font-semibold">
          {A.bonusLabel}
        </label>
        <p id={ids.bonusHelp} className="text-sm">
          {A.bonusHint}
        </p>
        {texts.bonus ? (
          <p className="mt-2 text-sm">{A.usingText(A.roleBonus)}</p>
        ) : (
          <>
            <input
              id={ids.bonus}
              type="url"
              inputMode="url"
              value={bonusUrl}
              onChange={(e) => setBonusUrl(e.target.value)}
              placeholder={A.urlPlaceholderBonus}
              aria-describedby={`${ids.bonusHelp} ${ids.bonus}-preview`}
              className="touch mt-2 w-full rounded-input border border-border bg-surface px-3 text-base"
            />
            <UrlPreview result={resolved.bonus} id={`${ids.bonus}-preview`} />
          </>
        )}
      </div>

      {blocked.length ? (
        <div className="flex flex-col gap-2">
          {blocked.map((d) => (
            <BlockedNotice key={d.role} doc={d} />
          ))}
        </div>
      ) : null}

      <details open={pasteOpen} onToggle={(e) => setPasteOpen((e.target as HTMLDetailsElement).open)} className="rounded-card border border-border p-4">
        <summary className="touch flex cursor-pointer items-center text-base font-semibold">{A.pasteTitle}</summary>
        <p className="text-sm text-text-muted">{A.pasteLead}</p>
        <fieldset className="mt-3">
          <legend className="text-sm font-semibold">{A.pasteFor}</legend>
          <div role="radiogroup" className="mt-2 inline-flex rounded-pill border border-border bg-surface-muted p-1">
            {(["main", "bonus"] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={pasteRole === r}
                onClick={() => setPasteRole(r)}
                className={`touch rounded-pill px-4 text-sm font-semibold ${pasteRole === r ? "bg-surface shadow-card" : "text-text-muted"}`}
              >
                {r === "main" ? A.roleMain : A.roleBonus}
              </button>
            ))}
          </div>
        </fieldset>
        {current?.sourceType === "file" ? (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-input bg-surface-muted p-3 text-sm">
            <span className="truncate">
              {current.filename} · {A.fileAs(roleLabel)}
            </span>
            <button type="button" className="touch shrink-0 font-semibold text-accent" aria-label={A.removeFile(current.filename ?? "")} onClick={() => setPaste(pasteRole, "")}>
              {A.clearText}
            </button>
          </div>
        ) : (
          <>
            <label htmlFor={ids.paste} className="sr-only">
              {A.pastePlaceholder}
            </label>
            <textarea
              id={ids.paste}
              value={current?.text ?? ""}
              maxLength={MAX_TEXT}
              onChange={(e) => setPaste(pasteRole, e.target.value)}
              placeholder={A.pastePlaceholder}
              rows={6}
              className="mt-3 w-full rounded-input border border-border bg-surface p-3 text-sm"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-text-muted tabular">{A.pasteCount(current?.text.length ?? 0, MAX_TEXT)}</p>
              {current ? (
                <button type="button" className="touch text-sm font-semibold text-accent" onClick={() => setPaste(pasteRole, "")}>
                  {A.clearText}
                </button>
              ) : null}
            </div>
          </>
        )}
        <label className={buttonClass("secondary", "mt-3 cursor-pointer text-sm")}>
          {A.addFile}
          <input ref={fileRef} type="file" accept=".md,.markdown,.txt,.text,text/plain,text/markdown" multiple className="sr-only" onChange={(e) => void onFiles(e.target.files)} />
        </label>
      </details>

      {needAge ? (
        <div className="flex items-start gap-3 rounded-input border border-border p-3">
          <input id={ids.age} type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--color-accent)]" />
          <label htmlFor={ids.age} className="text-sm">
            <span className="font-semibold">{A.ageTitle}. </span>
            {A.ageLabel}
          </label>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button type="submit" className={buttonClass("primary", "w-full")}>
        {A.submit}
      </button>
      {phase === "needs_input" && mainReadOk ? (
        <button type="button" className={buttonClass("secondary", "w-full")} onClick={() => void submit(true)}>
          {A.continueMainOnly}
        </button>
      ) : null}

      <PaywallSheet open={paywall} documents={documents} onClose={() => setPaywall(false)} />
    </form>
  );
}
