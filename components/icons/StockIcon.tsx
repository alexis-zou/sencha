// Generic depleting-stock icon — a vessel whose fill level tracks remaining
// stock, usable for any menu item (drink or additional item) rather than
// being hardcoded to a specific product shape.

export default function StockIcon({ fraction, color, size = 72 }: { fraction: number; color: string; size?: number }) {
  const f = Math.max(0, Math.min(1, fraction));
  const cupTop = 14;
  const cupBottom = size - 10;
  const cupH = cupBottom - cupTop;
  const liquidY = cupTop + cupH * (1 - f);
  const liquidH = cupH * f;
  const clipId = `stock-clip-${size}-${Math.round(f * 100)}-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <defs>
        <clipPath id={clipId}>
          <path
            d={`M18 ${cupTop} L${size - 18} ${cupTop} L${size - 24} ${cupBottom} Q${size / 2} ${cupBottom + 8} 24 ${cupBottom} Z`}
          />
        </clipPath>
      </defs>
      <rect
        x={liquidY < cupTop ? 18 : 0}
        y={liquidY}
        width={size}
        height={liquidH + 20}
        fill={color}
        clipPath={`url(#${clipId})`}
      />
      <path
        d={`M18 ${cupTop} L${size - 18} ${cupTop} L${size - 24} ${cupBottom} Q${size / 2} ${cupBottom + 8} 24 ${cupBottom} Z`}
        fill="none"
        stroke="var(--deep)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d={`M${size - 16} ${cupTop + 6} q14 2 12 16 q-2 12 -14 12`}
        fill="none"
        stroke="var(--deep)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
