// Cute matcha cookie — a growing "bite" as stock depletes. Replaces the
// generic StockIcon for menu items of type 'item' (food/merch add-ons).

const CX = 36;
const CY = 38;
const R1 = 22;
// Bite circle's center sits just inside the cookie's own edge (not deep
// toward the middle), so even a small bite radius still crosses the
// cookie's boundary and reads as a nibble taken from the rim -- not a
// hole floating on the surface.
const BX = 51.5;
const BY = 24;

// Where a cookie circle and a bite circle overlap, this is the pair of
// points where their boundaries cross -- the two "corners" of the bite.
function circleIntersections(
  c1x: number,
  c1y: number,
  r1: number,
  c2x: number,
  c2y: number,
  r2: number
): [[number, number], [number, number]] | null {
  const dx = c2x - c1x;
  const dy = c2y - c1y;
  const d = Math.hypot(dx, dy);
  if (d === 0 || d > r1 + r2 || d < Math.abs(r1 - r2)) return null;
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const hSq = r1 * r1 - a * a;
  if (hSq <= 0) return null;
  const h = Math.sqrt(hSq);
  const xm = c1x + (a * dx) / d;
  const ym = c1y + (a * dy) / d;
  return [
    [xm + (h * dy) / d, ym - (h * dx) / d],
    [xm - (h * dy) / d, ym + (h * dx) / d],
  ];
}

export default function CookieIcon({ fractionEaten, size = 72 }: { fractionEaten: number; size?: number }) {
  const fe = Math.max(0, Math.min(1, fractionEaten));
  const maxR = 16;
  const biteR = maxR * fe;

  // Below this the bite circle barely grazes the edge -- geometry gets
  // degenerate (near-tangent), so just show the whole cookie until the
  // first real nibble is big enough to carve a clean notch.
  const pts = biteR > 2.5 ? circleIntersections(CX, CY, R1, BX, BY, biteR) : null;
  const cookiePath = pts
    ? `M ${pts[0][0]} ${pts[0][1]} A ${R1} ${R1} 0 1 0 ${pts[1][0]} ${pts[1][1]} A ${biteR} ${biteR} 0 0 1 ${pts[0][0]} ${pts[0][1]} Z`
    : null;
  const clipId = `cookie-clip-${Math.round(fe * 100)}`;

  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      <defs>
        <clipPath id={clipId}>
          {cookiePath ? <path d={cookiePath} /> : <circle cx={CX} cy={CY} r={R1} />}
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <circle cx={CX} cy={CY} r={R1} fill="var(--bread)" />

        <circle cx="27" cy="30" r="2.3" fill="var(--cookie)" />
        <circle cx="46" cy="30" r="2" fill="var(--cookie)" />
        <circle cx="26" cy="47" r="1.8" fill="var(--cookie)" />
        <circle cx="47" cy="46" r="2.4" fill="var(--cookie)" />

        {/* cute face */}
        <circle cx="26.5" cy="41.5" r="2.4" fill="var(--danger)" opacity="0.26" />
        <circle cx="45.5" cy="41.5" r="2.4" fill="var(--danger)" opacity="0.26" />
        <circle cx="29" cy="38" r="1.9" fill="var(--deep)" />
        <circle cx="43" cy="38" r="1.9" fill="var(--deep)" />
        <path d="M31 43 Q36 46.5 41 43" fill="none" stroke="var(--deep)" strokeWidth="1.9" strokeLinecap="round" />
      </g>

      {cookiePath ? (
        <path d={cookiePath} fill="none" stroke="var(--deep)" strokeWidth="2.8" strokeLinejoin="round" />
      ) : (
        <circle cx={CX} cy={CY} r={R1} fill="none" stroke="var(--deep)" strokeWidth="2.8" />
      )}
    </svg>
  );
}
