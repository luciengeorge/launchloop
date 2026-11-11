/**
 * Static decorative envelope. Paint order keeps the letter behind the pocket and closed flap.
 */
export function EnvelopeAnimation({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 -4 120 100" className={`envelope ${className}`} aria-hidden="true" focusable="false" data-testid="envelope">
      <path className="envelope-back" d="M10 36H110V86a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6Z" />
      <path className="envelope-flap-open" d="M10 36L60 2L110 36Z" />
      <g className="envelope-letter">
        <rect x="24" y="42" width="72" height="46" rx="3" className="envelope-paper" />
        <rect x="32" y="50" width="34" height="4" rx="2" className="envelope-ink-strong" />
        <rect x="32" y="59" width="56" height="3" rx="1.5" className="envelope-ink" />
        <rect x="32" y="66" width="48" height="3" rx="1.5" className="envelope-ink" />
      </g>
      <path className="envelope-pocket" d="M10 36L60 70L110 36V86a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6Z" />
      <path className="envelope-flap-closed" d="M10 36L60 70L110 36Z" />
    </svg>
  );
}
