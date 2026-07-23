# DESIGN.md — UX Principles & Branding

## Design mission

Matcha Stand should feel like a **personal project binder for a small, homemade business** — warm, handmade, a little playful — not enterprise software wearing a green skin. Every visual decision should trace back to either (a) making the core loop (log order → mark complete → see stock/income) faster under time pressure, or (b) reinforcing that homemade, scrapbook feeling. If a visual idea does neither, it probably doesn't belong.

Reference inspiration: hand-labeled tea packaging (scalloped card edges, monoline icons, condensed serif wordmark, thin all-caps labels) and printed ticket/receipt stubs (dotted leader lines, torn/scalloped edges, ticket stub proportions).

---

## Color palette

All colors are matcha/earth tones — no arbitrary "brand blue" or unrelated accent hue. Defined as CSS custom properties in `app/globals.css`:

| Token | Hex | Used for |
|---|---|---|
| `--deep` | `#455826` | Primary text, dark surfaces (top bar, home header), primary buttons |
| `--mid` | `#6B7F3A` | Secondary text, muted labels |
| `--sage` | `#92AA58` | Positive/active accents (matcha liquid fill, "Add" buttons, active status badge) |
| `--light` | `#B6C77B` | Borders, subtle dividers |
| `--cream` | `#F3F5E3` | App background |
| `--pale` | `#DDE3BA` | Secondary surface tint (completed-order background, ended-status badge, tabs) |
| `--paper` | `#FBFAF5` | Card/input backgrounds — the "neutral paper" ticket color |
| `--danger` | `#A6523A` | Destructive/warning actions (End Event, delete, stock warnings, out-of-stock badge) |
| `--bread` | `#C9A66B` | Salt bread icon fill |
| `--cookie` | `#8B5E3C` | Matcha cookie icon fill |

**Rule of thumb:** if a new UI element needs a color not on this list, first check whether an existing token fits before adding a new one. New tokens should stay within the earth-tone family (as `--bread`/`--cookie` did, for the two food-specific icons).

---

## Typography

- **Headings** (`h1`, `h2`, `h3`, `.display` class): **Patrick Hand** — a neat, legible handwriting font. Chosen specifically over more scrawly/cursive options (e.g. Caveat) because it needs to stay readable at small sizes on a phone screen, not just decorative.
- **Body/UI text**: **Quicksand** — a clean, geometric, rounded sans-serif. Used for everything else: labels, buttons, numbers, form inputs, badges.
- **Why the split:** handwritten type everywhere would hurt legibility (numbers especially); clean type everywhere would lose the scrapbook warmth. The split puts personality where it's decorative (headings, names) and clarity where it's functional (numbers, prices, form fields).
- Both are loaded via Google Fonts `@import` in `globals.css` — no local font files are bundled.

**Rule:** numeric/data displays (prices, inventory badges, income figures) should always use Quicksand, never Patrick Hand — legibility of numbers under time pressure matters more than thematic consistency there.

---

## Signature visual elements

### 1. Depleting inventory icons (the app's core visual metaphor)
- **Matcha**: a cup outline whose liquid fill rises and falls with the fraction of stock remaining — literally answers "how full is my supply" at a glance.
- **Salt bread / Matcha cookies**: a loaf/cookie silhouette with a circular "bite" cut out, growing as stock depletes — same idea, different metaphor (food being eaten into) since these aren't liquids.
- These are **not decoration** — they're the fastest way to answer "do I have enough left" without reading numbers. Any redesign of the Inventory page should preserve some version of this "shape that visibly depletes" idea rather than replacing it with a plain progress bar, which would lose the personality (and, functionally, is slower to read at a glance than a bespoke shape people learn to recognize).
- A numeric badge always accompanies the icon (never icon-only) — the shape gives a fast gut-check, the number gives the precise answer.
- Badge color: sage/no-color (plenty) → amber "low" (≤15% of starting stock, minimum 2) → red "out" (≤0).

### 2. Ticket/receipt-style order cards
- Neutral paper background (`--paper`, near-white), **not** green — the ticket should read as "a receipt sitting on a green tablecloth," distinct from the surrounding app chrome.
- Scalloped top/bottom edges (pure CSS via a repeating radial-gradient mask against the page background — no image assets), evoking a torn ticket stub.
- Line items use a dotted "leader line" between item name and price (classic receipt typography), even though the font itself is the clean rounded Quicksand rather than a monospace receipt font — this was a deliberate compromise (see `DECISIONS.md`-adjacent reasoning: full monospace would fight the "clean, round, minimalistic" body-text direction).
- A dashed rule separates the line items from the total row, and a dashed rule separates the header from the lines — echoing perforation/tear lines without overdoing it.

### 3. Washi tape accents
- A small rotated, semi-transparent sage rectangle sits behind major screen headings (`.tape-heading` class), evoking a strip of tape holding a label onto a page.
- Used sparingly — only on top-level screen headings (Home, Setup, event Orders/Inventory page headings, Summary), never on every heading in the app, so it reads as an intentional accent rather than visual noise.

### 4. Paper texture
- A very subtle (5% opacity) fractal-noise SVG texture overlays the entire app background, giving surfaces a slight grain rather than a flat digital fill.
- Applied once, globally (`#app::before`), not per-card — keeps performance and consistency simple.

### 5. Translucent bottom navigation
- The bottom nav uses a translucent paper background with backdrop blur (`backdrop-filter: blur(10px)`) rather than a solid fill — content can be glimpsed scrolling underneath it, reinforcing a lightweight, non-blocking feel while still staying legible.

---

## Interaction principles

- **Big tap targets everywhere** — this is a phone-first app used one-handed, often while also handling a drink order in the other hand. Buttons, steppers, and list rows all have generous padding.
- **Steppers over typed numbers** where the range is small and bounded (order quantity, syrup/milk/ice pickers use `<select>`, but quantity always uses a +/− stepper) — faster and harder to fat-finger than typing on a small keyboard.
- **Live inline feedback over blocking modals** — the low-stock warning appears inline in the order panel as soon as it's true, rather than only surfacing at submit time; it doesn't have to be resolved before continuing.
- **Confirm only for hard-to-reverse or high-consequence actions** — Ending an event and submitting an order that exceeds stock both get a native confirm dialog; toggling an order done/undone, editing settings, and everyday navigation do not.
- **Delight on the two "reward" moments**: completing an order (checkbox burst) and successfully placing/saving an order (sparkle burst on confirm). These are the two moments that deserve a small celebratory beat; nothing else in the app animates this way, so it stays meaningful rather than becoming visual noise.

---

## Component patterns worth reusing

- **Modal sheets** (`ItemPickerModal`, `SettingsModal`) slide up from the bottom, full-width, rounded top corners only — consistent "bottom sheet" pattern for anything that's a focused sub-task within a larger flow. Don't introduce a second modal style (e.g. centered dialog) without a clear reason.
- **Empty states** always pair a short handwritten-font headline with one clarifying sentence in body text (see `.empty-state .display` + regular text) — e.g. "All caught up / No pending orders — add one above when the next customer orders." Every list in the app (events, pending orders, completed orders) should have one; don't ship a list that can just render blank.
- **Status badges** (Active/Ended, low/out inventory) use filled pill shapes with the palette's semantic colors (sage = good, pale = neutral/past, amber = caution, red = stop) — keep this mapping consistent if new statuses are introduced elsewhere.

---

## What NOT to do

- Don't introduce a second display font "for variety" — Patrick Hand is the one handwritten voice in the app.
- Don't use `--danger` (the red) for anything that isn't destructive or a genuine warning — it should stay rare and meaningful.
- Don't make the depleting-icon metaphor more literal/complex (e.g. actual photos, 3D renders) — the simple line-art SVG is legible at small sizes and matches the monoline-icon reference aesthetic.
- Don't add a loading spinner as the default "in-between" state — the app should feel instant; reserve spinners for anything that genuinely involves a network wait once a backend exists.
