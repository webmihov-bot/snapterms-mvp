"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/button";
import { COPY } from "@/lib/copy";

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const L = COPY.login;
  const router = useRouter();
  const emailId = useId();
  const codeId = useId();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError === "oauth" ? L.errors.oauth : null);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(L.errors.email);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/otp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(L.errors.send);
    setStep("code");
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, token: code, next }) }).catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      return setError(L.errors.code);
    }
    const body = (await res.json()) as { next: string };
    router.replace(body.next);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {step === "email" ? (
        <form onSubmit={send} noValidate className="flex flex-col gap-3">
          <label htmlFor={emailId} className="text-base font-semibold">
            {L.emailLabel}
          </label>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            placeholder={L.emailPlaceholder}
            className="touch w-full rounded-input border border-border bg-surface px-3 text-base"
          />
          <button type="submit" disabled={busy} className={buttonClass("primary", "w-full")}>
            {busy ? L.sending : L.sendCode}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} noValidate className="flex flex-col gap-3">
          <p className="text-sm">{L.codeHint(email)}</p>
          <label htmlFor={codeId} className="text-base font-semibold">
            {L.codeLabel}
          </label>
          <input
            id={codeId}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="touch w-full rounded-input border border-border bg-surface px-3 text-lg tracking-[0.3em] tabular"
          />
          <button type="submit" disabled={busy || code.length < 6} className={buttonClass("primary", "w-full")}>
            {busy ? L.verifying : L.verify}
          </button>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <button type="button" className="touch font-semibold text-accent" onClick={() => void send()}>
              {L.resend}
            </button>
            <button
              type="button"
              className="touch font-semibold text-text-muted"
              onClick={() => {
                setStep("email");
                setCode("");
              }}
            >
              {L.changeEmail}
            </button>
          </div>
        </form>
      )}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 text-sm text-text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        {L.or}
        <span className="h-px flex-1 bg-border" />
      </div>
      <a href={`/auth/google?next=${encodeURIComponent(next)}`} className={buttonClass("secondary", "w-full")}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M9 9h6" stroke="currentColor" strokeWidth="2" />
        </svg>
        {L.google}
      </a>
    </div>
  );
}
