/** 40 squares filled to the wagering multiplier (capped at 40). */
export function SquareGrid({ filled, label }: { filled: number; label: string }) {
  const n = Math.max(0, Math.min(40, Math.round(filled)));
  const size = 14;
  const gap = 4;
  return (
    <svg viewBox={`0 0 ${10 * (size + gap) - gap} ${4 * (size + gap) - gap}`} role="img" aria-label={label} className="block w-full max-w-[320px]">
      {Array.from({ length: 40 }, (_, i) => (
        <rect
          key={i}
          x={(i % 10) * (size + gap)}
          y={Math.floor(i / 10) * (size + gap)}
          width={size}
          height={size}
          rx="3"
          className={`fill-current ${i < n ? "text-accent" : "text-border"}`}
        />
      ))}
    </svg>
  );
}
