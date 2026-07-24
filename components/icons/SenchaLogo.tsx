// Sencha brand mark — a matcha bowl (chawan) with a whisk (chasen), a cute
// face, and the app's existing leaf motif reused for continuity with the
// smaller leaf-mark this replaces. Hand-drawn line art (no raster image),
// consistent with every other icon in the app — see DECISIONS.md for why
// the reference logo was recreated as SVG rather than embedded as a file.

export default function SenchaLogo({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* leaf accent */}
      <g transform="translate(2 34) scale(0.62)">
        <path d="M27 6C14 10 8 22 12 34c3 9 12 14 18 14 2-14 1-30-3-42Z" fill="var(--sage)" />
        <path d="M27 6c13 4 19 16 15 28-3 9-12 14-18 14C22 34 23 18 27 6Z" fill="var(--mid)" />
        <path d="M18 44C17 30 20 16 27 6" stroke="var(--deep)" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* whisk */}
      <rect x="66" y="8" width="8" height="19" rx="3" fill="var(--deep)" transform="rotate(28 70 17)" />
      <path
        d="M61 33 L53 45 M64 32 L58 46 M67 32 L63 47 M70 33 L68 47 M73 34 L72 47"
        stroke="var(--deep)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* bowl */}
      <path
        d="M26 46 Q26 40 32 40 L68 40 Q74 40 74 46 L71 68 Q70 76 60 78 L40 78 Q30 76 29 68 Z"
        fill="var(--paper)"
        stroke="var(--deep)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M41 78 L59 78 L57 82 L43 82 Z" fill="var(--paper)" stroke="var(--deep)" strokeWidth="2" strokeLinejoin="round" />

      {/* matcha surface */}
      <ellipse cx="50" cy="41.5" rx="21" ry="5.5" fill="var(--sage)" stroke="var(--deep)" strokeWidth="2" />
      <circle cx="43" cy="40.5" r="1" fill="var(--deep)" opacity="0.35" />
      <circle cx="52" cy="39.5" r="0.8" fill="var(--deep)" opacity="0.3" />
      <circle cx="59" cy="41" r="1" fill="var(--deep)" opacity="0.3" />

      {/* cute face */}
      <path d="M38 58 Q41 61 44 58" stroke="var(--deep)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M56 58 Q59 61 62 58" stroke="var(--deep)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M44 65 Q50 69 56 65" stroke="var(--deep)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="36" cy="63.5" r="3" fill="var(--danger)" opacity="0.22" />
      <circle cx="64" cy="63.5" r="3" fill="var(--danger)" opacity="0.22" />
    </svg>
  );
}
