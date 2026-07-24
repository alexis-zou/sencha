// Decorative barcode — deterministic bars derived from a seed string (an
// event's id), so the same event always renders the same pattern rather
// than a new random one on every render. Not a real scannable symbology —
// purely the receipt/evidence-tag visual flourish from the reference mood.

export default function Barcode({ seed, width = 140, height = 34 }: { seed: string; width?: number; height?: number }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const next = () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return (h % 1000) / 1000;
  };

  const bars: { x: number; w: number }[] = [];
  let cursor = 0;
  while (cursor < width - 2) {
    const w = 1 + Math.floor(next() * 3);
    if (next() > 0.42) bars.push({ x: cursor, w });
    cursor += w + 1.5;
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="var(--deep)" />
      ))}
    </svg>
  );
}
