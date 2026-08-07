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
| `--danger` | `#A6523A` | Destructive/warning actions (End Event, delete, stock warnings, out-of-stock state) |
| `--danger-light` | `#D99C8C` | Soft "low stock" tint (inventory progress bar/label under 10 remaining) — a lighter tint of `--danger`, not a new hue |
| `--bread` | `#C9A66B` | Additional-item icon fill (`CookieIcon`) |
| `--cookie` | `#8B5E3C` | Cookie chip-dot accent |

**Rule of thumb:** if a new UI element needs a color not on this list, first check whether an existing token fits before adding a new one. New tokens should stay within the earth-tone family (as `--bread`/`--cookie` did, for the two food-specific icons).

---

## Typography

- **Headings** (`h1`, `h2`, `h3`, `.display` class): **Patrick Hand** — a neat, legible handwriting font. Chosen specifically over more scrawly/cursive options (e.g. Caveat) because it needs to stay readable at small sizes on a phone screen, not just decorative.
- **Body/UI text**: **Quicksand** — a clean, geometric, rounded sans-serif. Used for everything else: labels, buttons, numbers, form inputs, badges.
- **Brand wordmark only**: **Cormorant Garamond** (weight 600) — a thin, high-waisted serif, matching the actual source logo artwork. Scoped narrowly to `.brand-wordmark` (the "sencha" logotype on the landing/auth screens) — not a second UI display font; every other heading stays Patrick Hand. See `DECISIONS.md` for why this is exempt from the "no second display font" rule below.
- **Why the split:** handwritten type everywhere would hurt legibility (numbers especially); clean type everywhere would lose the scrapbook warmth. The split puts personality where it's decorative (headings, names) and clarity where it's functional (numbers, prices, form fields).
- All three are loaded via Google Fonts `@import` in `globals.css` — no local font files are bundled.

**Rule:** numeric/data displays (prices, inventory badges, income figures) should always use Quicksand, never Patrick Hand — legibility of numbers under time pressure matters more than thematic consistency there.

---

## Signature visual elements

### 1. Depleting inventory icons (the app's core visual metaphor)
- **Drinks**: `icons/MatchaDrinkIcon` — a cute cup with a straw and a small face, whose liquid fill rises and falls with the fraction of stock remaining.
- **Additional items**: `icons/CookieIcon` — a chip-studded cookie with a small face and a circular "bite" cut out that grows as stock depletes — same idea, different metaphor (food being eaten into) since these aren't liquids.
- These are **not decoration** — they're the fastest way to answer "do I have enough left" without reading numbers. The icon is paired with a **progress bar** (not a plain number-only badge) below it, filling `--sage` green and turning `--danger-light` once remaining stock drops under 10 — the shape gives a fast gut-check, the bar+label give the precise answer. (An earlier draft of this rule warned against replacing the icon with *just* a bar; the two now coexist, so that concern doesn't apply — don't drop the icon in a future pass.)
- Bar/label color: sage (plenty) → soft red `--danger-light` "low" (<10 remaining, an absolute count, not a percentage of starting stock) → full `--danger` "out" (≤0).

### 2. Ticket/receipt-style order cards
- Neutral paper background (`--paper`, near-white), **not** green — the ticket should read as "a receipt sitting on a green tablecloth," distinct from the surrounding app chrome.
- Scalloped top/bottom edges (pure CSS via a repeating radial-gradient mask against the page background — no image assets), evoking a torn ticket stub.
- Line items use a dotted "leader line" between item name and price (classic receipt typography), even though the font itself is the clean rounded Quicksand rather than a monospace receipt font — this was a deliberate compromise (see `DECISIONS.md`-adjacent reasoning: full monospace would fight the "clean, round, minimalistic" body-text direction).
- A dashed rule separates the line items from the total row, and a dashed rule separates the header from the lines — echoing perforation/tear lines without overdoing it.

### 3. Per-screen matcha gradients (replaced washi tape)
- The washi-tape heading accent (a rotated sage rectangle behind major headings) was removed — see `DECISIONS.md`. Each top-level screen now instead gets its own `linear-gradient(165deg, var(--cream), var(--pale))` background, so screens read as distinct "pages" rather than blending into one flat background.
- Applied at the screen-root level (`#auth-view`, `#home-view`, `#setup-view`, `#main-view`, `#summary-view`), not per-card.

### 4. Paper texture, two strengths
- **Ambient**: a very subtle (5% opacity) fractal-noise SVG texture overlays the entire app background, giving surfaces a slight grain rather than a flat digital fill. Applied once, globally (`#app::before`).
- **Kraft/correspondence**: a stronger, warmer variant (same technique, tinted toward `--bread`, ~9% opacity) marks a surface as a physical "paper object" you're meant to notice — used on the order sheet (`OrderPanel`), the live-event summary postcard (`SummaryPage`), and the ended-event receipt (`SummaryScreen`). Keep this stronger texture reserved for those "paper object" surfaces; don't apply it to ordinary cards, or it stops reading as intentional.

### 5. Postcards, receipts, and folders (the "correspondence" family)
- The live Event Summary tab is a **postcard** (`.postcard`): kraft texture, a corner "stamp" emoji, a 2×2 stat grid, dashed dividers.
- An ended event's summary is a **receipt** (`.receipt`): itemized dotted-leader lines, a total, and a decorative (non-scannable — see `DECISIONS.md`) barcode footer.
- Home-screen events are **file folders** (`.event-folder`): a two-tone back/front card (a colored `--light` "back" showing as a peeking tab and a top band, with a `--paper` "front" inset inside it, soft inner sheen, and a real lifted drop shadow) rather than a flat card with a decorative notch — reads as an actual manila folder. Opening one "retrieves" the receipt.
- These three reinforce the same "warm, handmade correspondence" idea from three different real-world paper objects — keep new event-related surfaces drawing from this same object vocabulary rather than inventing an unrelated fourth metaphor.

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
- **Status badges** (Active/Ended) use filled pill shapes with the palette's semantic colors (sage = good, pale = neutral/past). Inventory status uses a two-step scale instead (sage = plenty, `--danger-light` soft red = low under 10, full `--danger` = out) — no amber step. Keep whichever mapping you're extending consistent with its own scale rather than mixing the two.
- **"Juicy" 3D buttons**: every primary action button gets a bottom-rim `box-shadow` (a darker shade of its own background) reading as physical depth, and translates down + flattens its shadow on `:active` rather than just scaling down. Any new primary CTA should follow this, not a flat/scale-only press state.
- **Bell + toast, for anything "live"**: real-time updates (a teammate's order change) surface two ways at once — a persistent unread badge on `NotificationBell` (for catching up later) and a transient, auto-dismissing, stacking toast via `ToastHost` (for noticing right now, wherever you are in the app). If a future feature needs to surface a live cross-user event, reuse this pair rather than inventing a third notification mechanism.

---

## What NOT to do

- Don't introduce a second display font "for variety" — Patrick Hand is the one handwritten voice in the app.
- Don't use `--danger` (the red) for anything that isn't destructive or a genuine warning — it should stay rare and meaningful.
- Don't make the depleting-icon metaphor more literal/complex (e.g. actual photos, 3D renders) — the simple line-art SVG is legible at small sizes and matches the monoline-icon reference aesthetic.
- Don't add a loading spinner as the default "in-between" state — the app should feel instant; reserve spinners for anything that genuinely involves a network wait once a backend exists.
