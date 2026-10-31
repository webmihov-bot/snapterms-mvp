"use client";

import { PROFILES } from "@/config/scoring";
import { COPY } from "@/lib/copy";
import type { ProfileId } from "@/lib/pipeline/types";

export function ProfileSwitch({ value, onChange, compact = false }: { value: ProfileId; onChange: (p: ProfileId) => void; compact?: boolean }) {
  const R = COPY.report;
  return (
    <div role="radiogroup" aria-label={R.profileLabel} className="inline-flex rounded-pill border border-border bg-surface-muted p-1">
      {PROFILES.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          title={R.profileHelp[p]}
          onClick={() => onChange(p)}
          className={`${compact ? "min-h-9 px-3 text-xs" : "touch px-4 text-sm"} rounded-pill font-semibold transition-colors duration-150 ${value === p ? "bg-surface text-ink shadow-card" : "text-text-muted hover:text-ink"}`}
        >
          {R.profiles[p]}
        </button>
      ))}
    </div>
  );
}
