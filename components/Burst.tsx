// Sparkle / completion "burst" effect.
//
// Ported directly from the prototype's `burstEffect()` — it's a tiny
// imperative DOM utility rather than a stateful React component on
// purpose: the particles are decorative, fire-and-forget, and never
// need to trigger a re-render. Call it from an onClick handler with the
// button/element to burst from and a list of emoji to scatter.
//
// Styling (the `.burst-particle` class and `floatUp` keyframes) lives in
// app/globals.css.

export function burstEffect(anchorEl: HTMLElement | null, emojiList: string[]) {
  if (!anchorEl) return;
  const rect = anchorEl.getBoundingClientRect();
  for (let i = 0; i < 7; i++) {
    const span = document.createElement('span');
    span.className = 'burst-particle';
    span.textContent = emojiList[Math.floor(Math.random() * emojiList.length)];
    const dx = (Math.random() - 0.5) * 90;
    span.style.setProperty('--dx', dx + 'px');
    span.style.left = rect.left + rect.width / 2 + (Math.random() - 0.5) * 16 + 'px';
    span.style.top = rect.top + rect.height / 2 + 'px';
    document.body.appendChild(span);
    setTimeout(() => span.remove(), 780);
  }
}
