// An original, decorative half-court motif (owned geometry, not traced from any source). It is
// aria-hidden and purely atmospheric. When its section reveals, the strokes draw themselves in
// (see the `.court-line` rules in styles.css); under reduced motion they are simply shown.
export function CourtLines({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 380"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        {/* baseline + sidelines */}
        <path className="court-line" d="M8 372 H312" />
        <path className="court-line" d="M8 372 V150" />
        <path className="court-line" d="M312 372 V150" />
        {/* the key */}
        <rect className="court-line" x="120" y="228" width="80" height="144" />
        {/* free-throw circle */}
        <circle className="court-line" cx="160" cy="228" r="40" />
        {/* hoop + backboard */}
        <path className="court-line" d="M132 356 H188" />
        <circle className="court-line" cx="160" cy="344" r="9" />
        {/* three-point arc */}
        <path className="court-line" d="M40 372 V300 A120 120 0 0 1 280 300 V372" />
      </g>
    </svg>
  );
}
