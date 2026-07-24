// Cute matcha latte cup — liquid level drops as stock depletes. Replaces
// the generic StockIcon for menu items of type 'drink'.

export default function MatchaDrinkIcon({ fraction, size = 72 }: { fraction: number; size?: number }) {
  const f = Math.max(0, Math.min(1, fraction));
  const cupTop = 30;
  const cupBottom = 60;
  const liquidY = cupTop + (cupBottom - cupTop) * (1 - f);
  const clipId = `matcha-drink-clip-${Math.round(f * 100)}`;
  const cupPath = `M17 ${cupTop} L55 ${cupTop} L50 ${cupBottom} Q36 ${cupBottom + 5} 22 ${cupBottom} Z`;

  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      <defs>
        <clipPath id={clipId}>
          <path d={cupPath} />
        </clipPath>
      </defs>

      <rect x="38" y="6" width="5" height="20" rx="2.5" fill="var(--sage)" stroke="var(--deep)" strokeWidth="1.8" transform="rotate(14 40 16)" />

      <rect x="14" y={liquidY} width="44" height={cupBottom - liquidY + 6} fill="var(--sage)" clipPath={`url(#${clipId})`} />

      <path d={cupPath} fill="none" stroke="var(--deep)" strokeWidth="2.5" strokeLinejoin="round" />

      <rect x="13" y="22" width="46" height="9" rx="4.5" fill="var(--paper)" stroke="var(--deep)" strokeWidth="2.2" />
      <circle cx="36" cy="26.5" r="1.6" fill="var(--deep)" />

      {/* cute face */}
      <circle cx="24" cy="47" r="2.2" fill="var(--danger)" opacity="0.25" />
      <circle cx="48" cy="47" r="2.2" fill="var(--danger)" opacity="0.25" />
      <circle cx="28" cy="44" r="1.7" fill="var(--deep)" />
      <circle cx="44" cy="44" r="1.7" fill="var(--deep)" />
      <path d="M31 49 Q36 52 41 49" fill="none" stroke="var(--deep)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
