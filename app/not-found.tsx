import { ButtonLink } from "@/components/ui/button";
import { COPY } from "@/lib/copy";

export default function NotFound() {
  return (
    <div className="page-x mx-auto max-w-content py-20 text-center">
      <h1 className="text-xl font-semibold">{COPY.notFound.title}</h1>
      <ButtonLink href="/analyse" className="mt-6">
        {COPY.notFound.cta}
      </ButtonLink>
    </div>
  );
}
