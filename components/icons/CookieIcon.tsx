// Cute matcha cookie — a growing "bite" as stock depletes. Replaces the
// generic StockIcon for menu items of type 'item' (food/merch add-ons).

export default function CookieIcon({ fractionEaten, size = 72 }: { fractionEaten: number; size?: number }) {
  const fe = Math.max(0, Math.min(1, fractionEaten));
  const maxR = 15;
  const r = maxR * fe;

  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      <circle cx="36" cy="38" r="22" fill="var(--bread)" stroke="var(--deep)" strokeWidth="2.8" />

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

      {r > 0 && <circle cx="54" cy="22" r={r} fill="var(--cream)" stroke="var(--deep)" strokeWidth="1.5" />}
    </svg>
  );
}
