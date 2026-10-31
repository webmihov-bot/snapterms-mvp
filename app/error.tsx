"use client";

import { ButtonLink } from "@/components/ui/button";
import { COPY } from "@/lib/copy";

export default function ErrorPage() {
  return (
    <div className="page-x mx-auto max-w-content py-20 text-center">
      <h1 className="text-xl font-semibold">{COPY.error.title}</h1>
      <ButtonLink href="/analyse" className="mt-6">
        {COPY.error.cta}
      </ButtonLink>
    </div>
  );
}
