import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/site/LoginForm";
import { isSignedIn } from "@/lib/auth/signedIn";
import { COPY } from "@/lib/copy";
import { safeNext } from "@/lib/http";

export const metadata: Metadata = { title: COPY.login.title, robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const target = safeNext(next);
  if (await isSignedIn()) redirect(target);
  return (
    <div className="page-x mx-auto max-w-[420px] py-10">
      <h1 className="text-xl font-semibold">{COPY.login.title}</h1>
      <p className="mt-2 text-base text-text-muted">{COPY.login.lead}</p>
      <p className="mt-4 rounded-input bg-accent-soft p-3 text-sm font-semibold text-accent">{COPY.login.pricingLine}</p>
      <div className="mt-6">
        <LoginForm next={target} initialError={error ?? null} />
      </div>
      <p className="mt-6 text-sm text-text-muted">{COPY.login.after}</p>
    </div>
  );
}
