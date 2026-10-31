import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "touch inline-flex items-center justify-center gap-2 rounded-input px-4 text-base font-semibold transition-opacity duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:opacity-90",
  secondary: "border border-border bg-surface text-ink hover:bg-surface-muted",
  ghost: "text-accent underline-offset-4 hover:underline",
};

export function buttonClass(variant: Variant = "primary", extra = ""): string {
  return `${base} ${variants[variant]} ${extra}`;
}

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({ href, variant = "primary", className = "", children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}
