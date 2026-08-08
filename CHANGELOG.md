# Matcha Stand — Changelog

Full version history: V1 through V5 are the original single-file HTML/CSS/JS prototype (built iteratively inside Claude.ai's artifact environment). V6 is the conversion to this Next.js project. V11 is the migration off `localStorage` onto a real Supabase backend (auth, database, Realtime, Row Level Security) — everything from V11 onward assumes that backend exists. For the reasoning *behind* still-current decisions (as opposed to the blow-by-blow history), see `DECISIONS.md`. For what's planned next, see `ROADMAP.md`.

---

## V1 — Initial build (2026-07-17)

**Problem framing:** young entrepreneurs running matcha pop-ups lose track of incoming orders, can't tell how much matcha they have left to make, and don't know their profit — all under time pressure, so setup and use both need to be fast.

**Decisions made from clarifying questions:**
- **Inventory input: simple cup count.** Chose "enter total cups you can make" over a gram-based calculation, to keep setup under 2 minutes and avoid requiring a scale/recipe math mid-market.
- **Menu: multiple items, each with its own price.** Supports real pop-up menus (e.g. Iced Matcha vs. Matcha Latte) rather than forcing one flat price.
- **Profit: revenue only.** Total profit = price × quantity for completed orders. No ingredient-cost input in V1, to keep the mental model simple (cost tracking flagged as a possible V2 feature).

**Tech stack:** Single-file HTML/CSS/JS artifact (not React) — chosen for zero-install mobile use and because it pairs directly with the artifact persistent storage API (`window.storage`), so an event survives closing the tab.

**Design decisions:**
- Palette derived from the provided matcha-tone reference: deep `#455826`, mid `#6B7F3A`, sage `#92AA58`, light `#B6C77B`, cream `#F3F5E3`, pale `#DDE3BA`.
- Typography: Fraunces (warm, rounded display serif) for headings + Nunito (friendly rounded sans) for body — chosen over a generic system-font pairing to match the "homely, earthy" brief.
- Signature element: a circular gauge on the cups-remaining stat, filling/draining like a bowl — a literal, functional visual tied to the actual pain point (estimating remaining inventory), rather than decorative.
- Add-order flow uses tap-to-select menu chips + a quantity stepper (not a dropdown/typed form) to minimize taps under time pressure.
- Orders split into Incomplete / Completed sections; tapping anywhere on a card toggles its status.

---

## V2 — Multi-item inventory, bottom nav, shared status bar (2026-07-17)

**Requested changes:**
1. Track this decision log itself in a markdown file (this file).
2. Add a bottom navigation bar to switch between pages.
3. Add a dedicated **Inventory** page tracking three specific items: Matcha, Salt Bread, Matcha Cookies.
4. Each inventory item shows its remaining count as a badge hovering over an icon; the icon itself visually depletes — matcha as a liquid level dropping, salt bread and matcha cookies as a "bite" growing out of the shape as stock is eaten into.
5. Keep event name + total profit visible as a status bar on every page.

**Design/data-model decisions:**
- **Menu items now require a category** (Matcha / Salt Bread / Matcha Cookie) so each order deducts from the correct inventory pool. This replaces the single generic "cups" inventory from V1 with three tracked pools. Multiple menu items can share a category (e.g. "Iced Matcha" and "Hot Matcha" both draw from the same Matcha pool).
- **Setup screen** now asks for three starting-inventory numbers (one per category) instead of one, plus a category selector per menu item row.
- **Inventory math unchanged in spirit from V1:** remaining = starting − sum of quantities ordered in that category, counting both pending and completed orders (so the stand doesn't overcommit while orders are still in progress).
- **Bottom nav bar** with two tabs — Orders (the original add/checklist flow) and Inventory (new) — added as a fixed bar so it's reachable with a thumb at any time.
- **Status bar simplified:** now shows just event name + profit pill on every page (the old inline cups-gauge in the header moved to live only on the new Inventory page, since inventory now has its own dedicated space).
- **Icon visuals:**
  - Matcha: a cup outline with a liquid fill that rises/falls by remaining fraction (kept from V1's gauge concept, restyled as a literal cup rather than a ring).
  - Salt Bread: a loaf silhouette with a circular "bite" cut out of one corner, sized to how much has been consumed.
  - Matcha Cookie: a cookie silhouette (with chip flecks) using the same bite mechanic.
  - Introduced two new palette tokens for these — wheat tan `#C9A66B` (bread) and cookie brown `#8B5E3C` — kept warm/earthy to sit naturally alongside the existing matcha greens.
- Badges turn amber when an item is low (≤15% of starting stock, minimum 2) and red/"out" at zero, consistent with V1's low-stock treatment.

**Open items / possible V3:**
- Ingredient-cost input for true profit (deferred from V1).
- Support for more than 3 inventory categories if the stand sells additional items.
- Multi-item orders (currently one menu item per "Add order" action; adding several items to one customer's order requires repeating the flow).

---

## V3 — Setup page restructure (2026-07-17)

**Requested changes:**
1. Separate the setup page's item list into **Menu items** and **Add-ons**.
2. Add a date/time input for the event.
3. Remove the icons next to the starting-inventory inputs.
4. Starting-inventory inputs should read: Matcha — # of cups, # of salt bread, # of matcha cookies.
5. Remove the descriptive paragraph under "Set up your stand."

**Decisions:**
- **Menu items vs. Add-ons split maps directly onto category.** "Menu items" rows no longer need a category selector — they're implicitly Matcha (the drink itself). "Add-ons" rows keep a category selector, but narrowed to just Salt Bread / Matcha Cookie (matcha is never an add-on). This removes an unnecessary choice from the drink rows while keeping add-ons flexible enough to name multiple bread or cookie variants if needed.
- **At least one menu item is still required** to start selling; add-ons are optional (a stand might only sell matcha).
- **Starting-inventory icons removed** — these were decorative at setup time (the icons only become meaningful once they visually deplete on the Inventory page), so setup now uses plain labeled number inputs, which is faster to fill in anyway.
- **Event date/time** is stored (`datetime-local` input) and shown as a small subtitle under the event name in the status bar, formatted like "Sat, Jul 18 · 9:00 AM" — editable later from Settings.

---

## V4 — Accounts, home screen, multi-event architecture (2026-07-17)

**Requested changes:**
1. App opens with a sign up / sign in page (email + password).
2. Signing in leads to a home/landing screen with a "New pop-up event" button and a list of saved/past events.
3. "New pop-up event" starts the existing setup flow.
4. On the event screen's top heading: a slightly larger settings icon, plus a red "End Event" button next to it that saves the event and returns to the home screen.
5. Suggest additional features that might be missing.

**Major architecture change — single event → multiple saved events per account:**
- The app previously held one event in memory/storage. It now holds an **array of events per account**, each with its own `id`, name, date/time, inventory, menu, orders, and a `status` of `'active'` or `'ended'`.
- **Data model additions:** `status`, `createdAt`, `endedAt` on every event, so past events can be listed, sorted by recency, and displayed as read-only.

**Auth — important caveat flagged to the user:**
- This is a **local-only, prototype-level sign-in**: email/password pairs are stored in this browser's private artifact storage (`auth:users`), not on a real server, and passwords are not hashed or encrypted. It exists to let one person separate/organize their own pop-up events under an account-like structure, not to secure sensitive data or support real multi-user access. Flagged this clearly in the UI (a note under the sign-in form) and here.
- A `session` key stores the currently logged-in email so returning to the app skips sign-in until the person explicitly signs out.

**Home screen:**
- Header shows "Your Stands" + signed-in email + a sign-out button.
- Primary "+ New pop-up event" button goes straight into the existing setup flow.
- Below it, a list of all saved events (both active and ended) as cards showing name, date, an Active/Ended status badge, profit, and order count — sorted newest first.
- Tapping an **active** event resumes it in the normal editable Orders/Inventory view. Tapping an **ended** event opens a new **read-only summary view** (see below) instead, since it's already closed out.

**Read-only event summary (new):**
- Built as a separate, simpler view rather than reusing the interactive Orders/Inventory pages, to avoid any risk of "read-only" leaking edit affordances (no add-order button, no checkboxes, no delete, no settings/end-event controls).
- Shows profit, order count, the same three inventory icons/badges (final remaining counts), and a flat list of all orders with a static checkmark for ones that were completed.

**Event screen (top bar) changes:**
- Added a back arrow on the left (before the event name) so a stand owner can return home without ending the event — needed once there's a home screen to return to; without it the only way out was ending the event, which felt like a gap.
- Settings icon enlarged (32px → 42px tap target) per request.
- Added a red **"End Event"** button next to settings — confirms with the user, marks the event `ended`, saves it, and returns to the home screen. This replaces the old "End event & start new" option that lived inside the settings modal (removed, to avoid two different ways to end an event).

**Open items / possible V5:**
- Ingredient-cost input for true profit (carried over from V1).
- Multi-item single order (one "Add order" action currently adds one menu item at a time).
- See "Suggested additional features" shared alongside this update for further ideas (editing menu/add-ons mid-event, exporting event summaries, duplicating a past event as a template, etc).

---

## V5 — Multi-item orders, low-stock alert, sign-out redesign (2026-07-17)

**Requested changes:**
1. Support multiple menu items in a single order.
2. Warn about low stock at the moment of placing an order.
3. Make the sign-out button visually nicer.

**Data model change:**
- An order's shape changed from a single item (`itemId`, `itemName`, `price`, `qty`, `category`) to `items: [{itemId, itemName, price, qty, category}, ...]` — one order can now hold any combination of menu items and add-ons with independent quantities, matching how a real customer might order a matcha *and* a cookie in one go.
- `usedByCategory`, `totalProfit`, and a new `orderTotal` helper were rewritten to sum across all items within all orders rather than assuming one item per order.
- Order cards (in both the live Orders page and the read-only past-event summary) now render a comma-joined item list, e.g. "2× Iced Matcha, 1× Salt Bread," with one combined price.

**Add-order flow redesign:**
- Replaced the old chip-select-one-item + single quantity stepper with a **row per menu item**, each with its own independent +/− quantity stepper — letting someone build a full multi-item order in one pass before confirming.
- Rows reset to 0 each time the panel opens; only items with quantity > 0 are included when the order is added.

**Low-stock alert:**
- As quantities are adjusted, the panel live-computes projected stock use per category (matcha/bread/cookie) against what's actually still remaining, and shows an inline warning banner naming exactly which item is short and by how much — no need to switch to the Inventory tab to notice a problem.
- On confirming an order that would exceed remaining stock, a confirmation prompt repeats the shortage details and asks the person to explicitly choose to add it anyway or go back and adjust — this warns without hard-blocking, since a stand may still choose to fulfill from backup stock or accept the overage knowingly.

**Sign-out button redesign:**
- Changed from a plain icon-less square button to a pill-shaped button with a small logout icon (door + arrow, drawn to match the app's line-icon style) and a "Sign out" label, subtle border, and a soft hover/press state — reads as a lower-emphasis secondary action rather than a bare icon tile, consistent with the rest of the app's rounded, warm visual language.




---

## V6 — Conversion to Next.js (2026-07-23)

**Requested changes:**
1. Create a full engineering handoff `CLAUDE.md` (project overview, vision, tech stack, architecture, features, schema, design philosophy, components, business logic, known bugs, TODOs, decisions, folder structure, 20-task roadmap).
2. Create companion docs: `CLAUDE.md`, `CHANGELOG.md`, `ROADMAP.md`, `DECISIONS.md`, `DESIGN.md`.
3. Convert the prototype into a Next.js application, preserving the current design and UX exactly. No new features in this pass — recreate the existing UI first.

**Scope of the conversion:**
- Every screen, component, animation, and business rule from the V5 prototype was ported: auth (sign in/up/out), Home (event list), Setup (menu items/add-ons/syrups/inventory), the active-event shell (top bar with Income/settings/End Event, bottom nav), Orders (multi-item orders with syrup/milk/ice customization, editing, low-stock warnings, completion + sparkle animations, order-count pill), Inventory (depleting matcha/bread/cookie icons), Settings modal, and the read-only Summary view for ended events.
- **Data model ported 1:1** into `lib/types.ts` — see `CLAUDE.md` § 7 for the full shape. No fields were added, removed, or renamed in this pass.
- **CSS ported near-verbatim** into `app/globals.css` (same custom properties, same class names) rather than rewritten in a utility framework — see `DECISIONS.md` for why plain CSS was chosen for this specific pass.
- **State management**: the prototype's imperative DOM manipulation + a single global `state` object was replaced with a React Context (`context/AppStateContext.tsx`) holding the same conceptual state (current user, events array, which event/page is active) and exposing the same operations as plain functions, called from components via `useAppState()`.
- **Persistence**: the prototype's Claude.ai-specific `window.storage` API was replaced with a `localStorage`-backed module (`lib/storage.ts`) exposing the identical `get/set/delete` async shape, so the rest of the app didn't need to change its mental model of "storage."
- **Animations**: the sparkle/completion burst effect (`components/Burst.tsx`) was kept as a direct DOM-manipulation utility (not converted into stateful React) since it's decorative and fire-and-forget — see `DECISIONS.md`.

**Validation performed (and its limits):**
- This sandbox environment has **no network access**, so `npm install` could not be run against real `next`/`react`/`@types/*` packages, and the app could not be started with `next dev` or built.
- To still catch structural/syntax mistakes, a temporary project copy was validated with the TypeScript compiler (`tsc --noEmit`) against hand-written ambient type shims for `react`/`react-dom`/`react/jsx-runtime` (approximating, not replacing, real `@types/react`). This caught and fixed a few shim-only false positives (e.g. `key` prop typing, `useContext` generic inference) along the way, and confirmed **zero structural errors** across all 24 source files once the shims were adequate.
- **This is not a substitute for actually running the app.** The very first task for whoever picks this up (see `ROADMAP.md` #1) must be `npm install && npm run dev` followed by manually clicking through every feature in `CLAUDE.md` § 5.

**Decisions made during the conversion (see `DECISIONS.md` for full reasoning):**
- Plain CSS over Tailwind for this pass, to isolate "convert to React/Next.js" from "redesign the styling system" as separate concerns.
- React Context over a dedicated state library, since the state tree is small and shallow.
- Kept `totalProfit()` as the internal function name (continuity with the prototype's calculation) while all user-facing copy says "Income" — flagged explicitly so these don't silently diverge later.
- Documented, rather than silently fixed, every known gap carried over from the prototype (no password recovery, `localStorage` is per-device, no delete confirmation on orders, menu locked at setup, plaintext auth) — see `CLAUDE.md` § 11.

**Explicitly not done in this pass** (per the instruction to recreate the existing UI first, no new features):
- No real backend, database, or authentication security — `ROADMAP.md` #3–6.
- No ingredient-cost/true-profit calculation — `ROADMAP.md` #9.
- No mid-event menu editing — `ROADMAP.md` #8.
- No automated tests — `ROADMAP.md` #2–3.
- No Tailwind/design-system formalization — `ROADMAP.md` #20.

---

## V6.1 — Runtime verification of the Next.js port (2026-07-22)

**What happened:** the V6 port had never actually been run (no network access during that pass). This session did `npm install && npm run dev` and click-tested every feature in `CLAUDE.md` § 5 end-to-end (sign up → create event → multi-item order with drink customization → complete → low-stock warning/confirm → settings → end event → read-only summary) using a headless-browser driver script, screenshotting each step.

**Result:** the port matched the prototype's behavior faithfully. Two small real issues found and fixed:
- **Inventory badge showed a raw negative number** (e.g. "-3") when an order oversold stock, while the depleting icon itself correctly clamped to empty. Fixed in `InventoryPage.tsx`/`SummaryScreen.tsx` to display `Math.max(0, left)`.
- Long event names could wrap to 3 lines in the top bar on a narrow phone screen — cosmetic only (income/settings/End Event still rendered correctly beside it), left as-is.

---

## V7 — Setup wizard redesign, generalized per-item inventory (2026-07-22)

**Requested changes:**
1. Turn the single-page Setup form into a multi-page wizard "like a scrapbook" — separate pages for event details, menu, and starting inventory, to reduce how much a person has to take in at once during setup.
2. Menu building split into four sections: **Drinks** (name + price), **Syrup** (name + price), **Milk** (name + price), **Additional items** (name + price) — syrup and milk becoming priced options was new; previously syrup was free-only and milk wasn't configurable at all.
3. A "save menu" action so a saved menu carries over into future pop-up events.
4. Starting inventory (page 3) driven by whatever was defined on the menu page — not the old fixed matcha/salt-bread/matcha-cookie trio — with a label distinguishing drinks from other items.
5. *(Follow-up, same session)* Remove the swipe-to-advance gesture between wizard pages — navigation should only happen via an explicit "Continue" button (or the step dots), never from a drag.

**Data model changes (see `DECISIONS.md` for full reasoning on each):**
- `PopupEvent.inventory` generalized from `{ matcha, bread, cookie }` to `Record<menuItemId, number>`.
- `MenuItem` gained a `type: 'drink' | 'item'` field, replacing the old `category: 'matcha' | 'bread' | 'cookie'` enum — "Additional items" no longer need a bread/cookie category selector, any product name is allowed.
- `syrups: string[]` and the hardcoded `MILK_OPTIONS` constant were both replaced by `syrups: FlavorOption[]` / `milks: FlavorOption[]` (shared `{ id, name, price }` shape) on the event, so both can carry an optional per-unit upcharge.
- `eventDateTime` (single `datetime-local` string) split into `eventDate` + `startTime` + `endTime`, per the wizard's page-1 layout.
- New `MenuTemplate` type + `menuTemplate:<email>` storage key for the reusable saved menu.

**New/changed components:**
- `SetupScreen.tsx` rewritten as a 3-page wizard (`Array` of pages inside a sliding track, CSS `transform: translateX(...)` animated on page change). Initially built with a pointer-drag swipe gesture; **removed in the same session** per user feedback in favor of button/dot-only navigation, so a page transition never fires from an accidental drag.
- `icons/StockIcon.tsx` replaced `icons/MatchaIcon.tsx` + `icons/BiteIcon.tsx` — one generic fill-level icon (tinted per item type) instead of two product-specific shapes, since inventory items are no longer a fixed trio.
- `ItemPickerModal.tsx` syrup/milk `<select>` options now show the upcharge inline (e.g. "Oat Milk (+$0.75)"); `lib/calculations.ts` gained `lineTotal()` to fold syrup/milk pricing into a line's total, used by `totalProfit`/`orderTotal`.

**Bug caught during verification:** `TicketCard` and `OrderPanel`'s draft-line price display were still computing `price × qty` directly instead of calling the new `lineTotal()`, so a line with a paid syrup/milk upcharge showed a lower price than the order's own `Total` row. Fixed to call `lineTotal()` in both places — see `DECISIONS.md`.

**Validation:** full flow re-verified via the same headless-browser driver approach as V6.1 — wizard page-to-page navigation (button and dot), menu template save/reuse, priced syrup/milk math, per-item inventory depletion, and (after the follow-up fix) confirmed a swipe gesture no longer advances the wizard while the Continue button does. `tsc --noEmit` clean throughout.

---

## V7.1 — Setup wizard visual redesign, viewport-height fix (2026-07-22)

**Requested changes:**
1. Fix the Continue button leaving a large blank gap on shorter wizard pages when page heights differ.
2. Restyle the "Event details" page (and, by extension, the rest of the wizard) after an iOS Calendar-style "New Event" sheet reference — grouped rounded card sections, circular back/close button, centered title — reinterpreted in the app's matcha/paper-texture scrapbook aesthetic rather than copied literally.

**The height bug, and why the first fix attempt didn't work:** `.wizard-track` (the horizontal 3-page flex row) used the default `align-items: stretch`, which forces every page's *rendered* height to match the tallest page (the menu-builder page) — even though only one page is visible at a time. A first fix attempt measured each page's `scrollHeight` via `ResizeObserver` and applied it to the viewport, but that alone didn't work: `scrollHeight` reflects the *already-stretched* box, so every page kept reporting the same (tallest) height regardless of its real content. The actual fix was adding `align-items: flex-start` to `.wizard-track` so each page's box height reflects only its own content — *then* the `ResizeObserver` measurement became meaningful. Confirmed via direct height reads: 274px (event details) → 748px (menu) → 151px (empty inventory).

**Visual changes:**
- New `.detail-card`/`.detail-row` pattern: rounded paper cards with divided rows (label left, pill-style value right) — replaces the old plain stacked `.field-group` inputs on page 1, and the boxed `.menu-row` cards on page 2 (drink/syrup/milk/item rows now render as name + price pill + remove button inside one grouped card per section) and page 3 (inventory rows: name + type tag + count pill, one card).
- New `.wizard-topbar`: a circular ✕ (page 1, cancels to home) / ← (pages 2–3, previous page) button + centered title, replacing the old left-aligned text link and heading. The bottom-of-page "← Back" button was removed as redundant once the top circular button covered all back-navigation.
- Removed now-dead CSS (`.menu-row`, `.menu-row-bottom`, `.remove-btn`, `.syrup-row`, old `.setup-header`) since nothing renders with those classes anymore.

**Validation:** full regression re-run after the redesign — page-to-page navigation, menu template save, priced syrup/milk entry, inventory fill, event creation — all confirmed working via the headless-browser driver, including catching and fixing two of the driver script's own selector-indexing mistakes along the way (not app bugs — `.detail-pill-input` and `.detail-title-input` are intentionally reused across multiple wizard pages for style consistency, which meant naive `nth()` indexing in the test script undercounted).

---

## Mobile port started (2026-07-23)

A React Native / Expo port of this app has begun as a **separate sibling project**, `../sencha_mobile/`, not a conversion of this codebase — this Next.js app stays as-is, fully intact, as the reference implementation. See `sencha_mobile/CLAUDE.md` and `sencha_mobile/CHANGELOG.md` for that project's own status and history; nothing in this repository changes as a result of that work.

---

## Deployed to Vercel (2026-07-23)

**Decision:** with the mobile port still early (see above), priority shifted back to the web app — get it live on a real URL rather than continuing mobile work first.

**What was done:**
- Initialized git in `sencha_app` for the first time (it had never been a repo before this). `.gitignore` extended to exclude `.claude/settings.local.json` (personal local tool config, not project config), `*.tsbuildinfo` (generated build artifact), and `.vercel` (Vercel's local project-link metadata, written by the CLI below).
- Deployed via `vercel` CLI (`npx vercel --yes`) — Vercel auto-detected the Next.js project, ran `npm install` + `next build` in its own cloud build environment, and since this was the project's first deployment, published it directly to production and aliased it at **https://senchaapp.vercel.app**.
- Verified the live deployment with the same headless-browser check used throughout this project: loads correctly, no console errors.

**Not done / next steps:** no custom domain, no environment variables configured (none are needed yet — still fully client-side/`localStorage`-backed, see `DECISIONS.md`), no CI — every future deploy is currently a manual `vercel --yes` (or `vercel --prod` once there's a reason to distinguish preview vs. production deploys, e.g. once this is connected to a GitHub repo for automatic per-PR previews).

---

## V8 — Cute icons, handwritten order sheet, live/historical summaries, PDF export (2026-07-23)

**Requested changes (7 parts, reference mood images: a cute bakery-app menu, a vintage recipe/binder card, a notebook-paper item card, a spy-dossier evidence set, watercolor folder icons, a stylized shopping receipt):**
1. Keep the `$` visible in menu price inputs while typing, not just as a placeholder.
2. Cute type-specific inventory icons (matcha drink / cookie) whose fill/bite visibly changes as stock depletes, plus a progress bar per item that turns red under 10 remaining.
3. Restyle the order-entry panel as a handwritten paper order sheet (kraft-paper texture, "down-to-earth correspondence" feel); remove the Ice customization; keep/confirm a cute completion animation.
4. More translucent bottom nav, with a clearer active-tab indicator.
5. Remove the washi-tape heading accent; give each screen its own matcha-toned gradient background.
6. A new **live** "Event Summary" nav tab, postcard-styled, showing per-item sales, favorite syrup/milk, income, and order counts while an event is still active.
7. Home-screen events styled as file folders; opening an ended one shows a receipt-styled summary with a barcode, exportable as a PDF.

**1. `$` prefix (`SetupScreen.tsx`):** `type="number"` inputs can't have a literal `$` baked into their value, so a `$` span is positioned as a fixed overlay with left-padding on the input, instead of a placeholder (which disappears the moment you type). First attempt used `placeholder="0"` alongside it, which visually read as "$0" — a value, not a hint — for an empty field; removed.

**2. Inventory — cute icons + progress bars:**
- New `icons/MatchaDrinkIcon.tsx` (cup, straw, cute face, liquid level) and `icons/CookieIcon.tsx` (chip-studded cookie, cute face, growing bite) replace the generic `StockIcon` — dispatched by `MenuItem.type`.
- The floating numeric badge was replaced by an actual `<div>`-based progress bar (`.inv-progress-track`/`.inv-progress-fill`), colored `--sage` normally and a new `--danger-light` token (a soft pink-red tint of `--danger`, following `DESIGN.md`'s "extend the existing family" rule) once remaining stock is **below 10** — an absolute threshold, replacing the old `badgeClass()`'s 15%-of-starting-stock logic. `badgeClass()`'s signature dropped its now-unused `start` parameter.

**3. Order sheet redesign + Ice removal:**
- `OrderPanel.tsx`/`globals.css`: warm kraft-paper grain background (same turbulence-filter SVG technique as the app-wide paper texture, tinted toward `--bread` and boosted in opacity — reused again for the summary postcard and the receipt, for a consistent "paper surface" family), a dashed underline note field, item names in the handwritten heading font, and a small rotated "✎ jot it down" stamp.
- Ice removed end-to-end: `ICE_OPTIONS` (`lib/constants.ts`), `OrderLineItem.ice` (`lib/types.ts`), the `ice` param of `customBitsFor()` (`lib/calculations.ts`), and the Ice `<select>` in `ItemPickerModal.tsx`.
- The completion burst (already existed, `TicketCard.tsx`) got a small refresh — added 🍵 to the emoji set.

**4–5. Nav bar + page backgrounds:** bottom nav background opacity dropped (0.72 → 0.48) and blur increased for a more translucent glass feel; the active tab now shows a pale pill behind its icon (`.nav-icon-pill`) instead of relying on text color alone. `.tape-heading` (and its usage in 5 components) removed; each top-level screen (`#auth-view`, `#home-view`, `#setup-view`, `#main-view`, `#summary-view`) now gets its own `linear-gradient(165deg, var(--cream), var(--pale))` background.

**6. Live Event Summary tab:** new `lib/calculations.ts` export `computeEventStats(event)` — aggregates *completed* orders into income, order counts (total/completed/pending), average order value, per-item quantity **and dollar subtotal** sold, and the most-ordered syrup/milk. New `SummaryPage.tsx` (third `MainPage` tab, alongside `'orders' | 'inventory'`) renders these as a postcard-styled card. `lib/types.ts`'s `MainPage` type gained `'summary'` — deliberately distinct from `ViewName`'s existing `'summary'` (the *ended-event* read-only screen); the two are unrelated types, but see the comment in `lib/types.ts` flagging the naming overlap for future readers.

**7. Folders + receipt + barcode + PDF export:**
- `HomeScreen.tsx`: event cards renamed `event-folder`, with a small tab shape (`::before`-style pseudo-element via a sibling span) peeking above the card; ended events show a "Tap to view receipt →" hint.
- `SummaryScreen.tsx` rewritten around a `.receipt` card reusing `computeEventStats()`: itemized lines with dotted leaders and per-item subtotals, a total, completed/pending order counts, top syrup/milk, a "thank you for stopping by" line, and a new `icons/Barcode.tsx` (bars deterministically derived from the event's `id` via a simple string hash — decorative only, not a real scannable symbology).
- **PDF export**: an "🖨️ Export as PDF" button calls `window.print()`; a new `@media print` block hides everything marked `.no-print` (back link, export button itself, the per-order ticket list) so the printed/saved output is just the receipt + final inventory. No PDF-generation library was added — see `DECISIONS.md` for why, and the tradeoff.

**Validation:** every sub-feature verified via the project's established headless-browser driver approach, including a full regression pass at the end (menu template save/reuse, priced syrup/milk math end-to-end, low-stock warning, Settings modal, live Summary tab math, folder → receipt → PDF-export button, inventory red state) — `tsc --noEmit` clean throughout, no console errors in any flow. `ROADMAP.md` #11 (export/share summary) is now done; #14 (priced syrup add-ons) was actually completed back in V7 but never marked — corrected here.

---

## V9 — Rebrand to "Sencha," new brand mark, landing page (2026-07-23)

**Requested changes:** add a landing page shown when the app opens, and replace the app's small leaf-mark icon with a new logo (a cute matcha bowl + whisk + face + leaf, supplied as a reference image) — "My app name is Sencha."

**Rebrand:** every user-facing "Matcha Stand" string became "Sencha" — the auth screen title, `app/layout.tsx`'s page `<title>`/description, and the receipt's "Matcha Stand" eyebrow line (now "Sencha"). `package.json`'s `name` field updated too. Historical `CHANGELOG.md`/`DECISIONS.md` entries (V1–V8) were **left referring to "Matcha Stand"** deliberately — that was the app's actual name at the time, and rewriting past entries to say "Sencha" would misrepresent the project's own history. `CLAUDE.md`'s title and overview were updated with a naming note explaining the split.

**New brand mark (`icons/SenchaLogo.tsx`):** the reference was a painted/shaded raster illustration (a chawan-style matcha bowl, a chasen whisk, a cute closed-eye smiling face with blush, a leaf accent, and an elegant serif "sencha" wordmark). Rather than embedding that image file directly, it was **recreated as hand-drawn SVG line art** in the same style as every other icon in the app (`MatchaDrinkIcon`, `CookieIcon`, `Barcode`) — see `DECISIONS.md` for why. The existing leaf-mark path (previously standalone on the auth screen) was reused inside the new logo for visual continuity between the old and new marks.

**Landing page (`LandingScreen.tsx`):** new first screen for logged-out visitors — the logo at a larger size, the "sencha" wordmark in a newly-added serif font (Cormorant Garamond, Google Fonts), an uppercase letter-spaced tagline, a small leaf-accented divider, a one-line pitch, and a "Get started" button that hands off to the existing sign-in/sign-up screen. **Scoped narrowly, not a new global font**: Cormorant Garamond is used only for the `.brand-wordmark` class (this page's "sencha" heading) — Patrick Hand remains the one in-app UI heading font, per `DESIGN.md`'s existing "don't introduce a second display font" rule. The wordmark is a logotype, not a UI heading.

**Navigation wiring:** `ViewName` gained `'landing'` (new first member). `AppStateContext`'s session-bootstrap effect now resolves to `'landing'` (no saved session) or `'home'` (session found) — previously it was `'auth'` or `'home'`. A new `goToAuth()` action moves from landing into the sign-in/sign-up screen. **Returning signed-in users never see the landing page** — confirmed by reloading an authenticated session and observing it lands directly on Home, not Landing.

**Validation:** `tsc --noEmit` clean; full click-through (landing → Get started → sign up → Home, plus a page-reload check that a returning session skips straight past landing) via the project's headless-browser driver, no console errors.

---

## V9.1 — Real logo image, iOS "Add to Home Screen" icon (2026-07-24)

**Requested changes:** two follow-ups to V9. First, use the *actual* reference PNG for the brand mark instead of the hand-drawn SVG interpretation. Second, set up a proper favicon and `apple-touch-icon` so Safari's "Add to Home Screen" shows the real icon, not a generic browser glyph.

**Real logo image:** the user supplied the source file (`sencha_logo.png`, 1254×1254). Two crops were made with Pillow (installed for this — no image-editing tool existed in the project before): a full lockup (icon + wordmark + tagline) for the landing page, and an icon-only crop for smaller contexts. Both had their flat background color-keyed to transparent (the source background didn't exactly match the app's `--pale`/`--cream` tokens, so leaving it opaque would have shown a faint mismatched rectangle against the app's gradient background). `icons/SenchaLogo.tsx` (the hand-drawn SVG) and the now-unused Cormorant Garamond font import were deleted.

**iOS home screen icon — the transparency gotcha:** iOS renders transparent PNG regions as **solid black** on the home screen, not the surrounding wallpaper — a well-known Apple gotcha, and exactly what the just-added transparent icon would have hit. A **separate, fully opaque** crop was made from the original source (same crop region, alpha channel dropped entirely) specifically for `app/icon.png` (favicon) and the new `app/apple-icon.png` (Next.js's file-based convention for the `apple-touch-icon` link tag — Next auto-generates the correct `<link rel="apple-touch-icon" sizes="...">` from whatever image is placed there, no manual tag needed). Verified the served file has no alpha channel (`PIL: mode RGB`, not `RGBA`) before treating this as done.

**Also added** (natural companions to "make Add to Home Screen use the new icon," not scope creep): `appleWebApp` metadata (`capable: true`, so a home-screen launch opens standalone without Safari's URL bar; explicit `title: 'Sencha'` for the label under the icon) and a `viewport` export with `themeColor: '#455826'` (colors the iOS status bar / Android browser chrome to match the brand). Next.js 14 requires `themeColor` in the `viewport` export, not `metadata` — putting it in `metadata` is deprecated and warns at build time.

**Validation:** fetched the rendered `<head>` directly (`curl`) and confirmed every expected tag — `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`, `link rel="icon"`, `link rel="apple-touch-icon"` — is present with the right values; fetched `/apple-icon.png` directly and confirmed via Pillow it has no alpha channel. `tsc --noEmit` clean, no console errors.

**Follow-up same session — recentering:** the first crop (hand-eyeballed bounds) put the bowl visibly off-center: pixel analysis (`PIL.ImageChops.difference` + `getbbox()`) against the known background color showed it was cropped to `(355,215)–(845,705)`, but the actual artwork's true bounding box is `(379,277)–(821,719)` — the crop clipped a couple pixels off the bowl's foot at the bottom while leaving 62px of empty space at the top, which read as visibly unbalanced. Fixed properly: cropped to the *exact* measured content bbox (zero slack, so there's no way to accidentally clip the art or bleed the wordmark below it), then added a uniform 45px border via canvas expansion (`ImageOps.expand`) on all four sides — guaranteeing true symmetric padding rather than another hand-picked crop box. Also makes the icon read smaller/better-framed within its square, which was requested alongside the centering fix. Same fix applied to all three icon exports (`app/icon.png`, `app/apple-icon.png`, `public/sencha-icon.png`) so they stay in sync.

---

## V9.2 — Fix: additional items silently dropped when price left blank (2026-07-24)

**Reported symptom:** an item added to "Additional items" during setup was missing from starting inventory, the order item-picker, the Inventory tab, and the summary — as if it had never been added at all.

**Root cause:** `SetupScreen.tsx`'s `rowsToMenuItems()` filters out any menu row where the price doesn't parse (`!isNaN(m.price)`) — correct for a row the person genuinely left empty, but it fires silently. Reproduced directly: type a name into an "Additional items" row, leave its price blank, hit Continue — the item vanishes from step 3 (starting inventory) with zero error shown, and since it never makes it into `event.menu` at all, it's consequently absent everywhere downstream too (order-adding, the Inventory tab, the live/ended summary) — exactly matching the reported symptom. This is a real bug: Drinks and Additional items both require a price per `CLAUDE.md`, but nothing in the UI ever *said* that price was required (the `renderRows()` helper already took an `opts.priceRequired` flag but never used it), so a blank price looked like a legitimate optional field, same as Syrup/Milk.

**Fix (`SetupScreen.tsx`):**
- New `findRowMissingPrice()` / `handleContinueFromMenu()`: clicking "Continue →" from the menu page (step 2) now checks every Drink and Additional-item row for a name with no valid price, and blocks advancing with an inline error (`Add a price for "X", or remove it.`) naming the specific offending row, instead of silently dropping it several steps later.
- The price input's `placeholder` now reads `req.` or `opt.` based on the already-existing (previously unused) `opts.priceRequired` flag, so the distinction is visible before the person ever hits Continue, not just after.

**Validation:** reproduced the original bug on the pre-fix code via the project's headless-browser driver (blank-price item vanishing from step 3), then confirmed post-fix behavior: (a) blank price now blocks advancement with the named error and stays on the menu page; (b) a correctly-priced item flows through cleanly — visible on the starting-inventory step, the Inventory tab ("N left in stock"), and selectable (with its own quantity-only flow, no syrup/milk prompt) in the order item-picker. `tsc --noEmit` clean.

---

## V10 — Gamified visual pass: brand font, folder cards, cuter icons, 3D buttons (2026-07-31)

**Requested changes:** standardize the "sencha" wordmark font across the landing and sign-in screens (reference: a bold, chunky, rounded handwritten display font); make home-screen event cards actually read as file folders with real shading, not just a decorative notch; make the inventory icons cuter/more kawaii (reference images of cute-faced matcha/cookie illustrations); an overall "cute and gamified" pass on the whole app in the style of a reference food-ordering app mockup ("Croffy") — soft-shadowed, shaded pill buttons, icon-forward menu categories; apply that same cuter treatment to the setup wizard's "build your own menu" page; and make the order-jotting draft list (while building an order, before confirming) look like the same dotted-leader receipt style as the final ticket, instead of a plain list.

**1. Brand wordmark font:** added Fredoka (Google Fonts, weights 500/600/700) — a rounded, bold, hand-drawn-bubble face — as a new `.brand-wordmark` class, scoped only to the "sencha" brand heading (same narrow-scoping precedent as V9's short-lived Cormorant Garamond wordmark), not the rest of the UI's Patrick Hand headings. Applied to both `AuthScreen.tsx` and `LandingScreen.tsx`. **Landing screen's logo changed shape as a side effect**: it previously showed the *baked-in raster* full lockup (`sencha-logo.png`, icon + wordmark + tagline drawn as one image by the original artist), which by definition couldn't share a font with anything coded. Swapped it for the same icon-only crop already used on the auth screen (`sencha-icon.png`) plus a coded `<h1 className="brand-wordmark">` and a `.brand-tagline` line — so both screens now render the actual same font, not a look-alike, and any future wordmark tweak (size, color, weight) only has to happen once in CSS instead of requiring a new image export.

**2. Event folders — real two-tone shading:** `HomeScreen.tsx`'s `.event-folder` restructured from a single div into a back/front pair — an outer colored "back" (`--light`) that shows as a peeking tab *and* a visible band across the top, plus an inner `.event-folder-front` (still `--paper`/off-white, per "keep the white color") inset within it, with a soft inner sheen gradient and a real lifted drop shadow. Reads as an actual two-tone manila folder now rather than a flat card with a decorative notch cut into the same color.

**3. Inventory icons — cuter/kawaii pass:** `MatchaDrinkIcon.tsx` and `CookieIcon.tsx` (already had cute faces from V8) got thicker outlines, bigger/more visible blush-cheek circles, and a glossy highlight stroke on the drink icon for a rounder, more kawaii read closer to the reference illustrations. **Scope note, not done:** the reference named three distinct subjects ("matcha cookies, salt bread, and matcha drink"), but the app's inventory model deliberately generalized away from a fixed matcha/bread/cookie trio back in V7 (see `CLAUDE.md` §5/§13) — any product name is allowed now, and every non-drink item shares one generic `CookieIcon`. Reintroducing a third, name-matched icon (e.g. "bread" vs "cookie" by keyword) would partially undo that generalization, so it was left as the existing two-icon system (drink vs. item) restyled cuter, not three fixed icons. Flagging this explicitly in case a distinct bread icon is wanted — it's a real architecture fork, not an oversight.

**4. App-wide "juicy" 3D button press:** every primary action button (`.primary-btn`, `.confirm-btn`, `.new-event-btn`, `.add-btn`, `.add-row-btn`) gained a bottom-rim `box-shadow` (a darker shade of its own background color) that reads as physical depth, and now translates down + flattens its shadow on `:active` instead of the old `scale(0.99)` — the tactile "juicy button" pattern common to gamified/food-app UIs (matches the Croffy reference). New `--deep-shade` token added for the `--deep`-background buttons' rim color. `.add-row-btn` also changed from a dashed ghost outline to a solid filled pill, consistent with the other buttons.

**5. Setup wizard menu page — icon-forward category cards:** `SetupScreen.tsx`'s menu page (step 2) restructured so Drinks/Syrup/Milk/Additional items each sit in their own tinted `.menu-section` card with a round emoji-badge icon (🥤/🍯/🥛/🍪) next to the section title, instead of a plain uppercase label — direct visual parallel to the Croffy reference's icon-led category list.

**6. Order draft lines match the final receipt:** `OrderPanel.tsx`'s in-progress item list (before "Add to list") previously rendered as a plain flex row. Restyled to reuse the same dotted-leader layout as `TicketCard.tsx`'s `.ticket-line` (name — dotted leader — price), so the order looks the same while you're jotting it down as it does once it's on the board.

**Validation:** full click-through via the project's headless-browser driver — landing → auth (font match confirmed on both), sign-up → home (folder shading on both an active and an ended event), setup wizard menu page (icon-forward cards, `req.`/`opt.` placeholders, 3D button press), inventory tab (restyled icons), a full order added via the draft-line receipt view → confirmed → checked off → live Summary tab. Zero console errors throughout. `tsc --noEmit` clean.

**Follow-up same session — ticket card, after a thermal-printer receipt reference:** the order ticket (`TicketCard.tsx`, `.ticket-card`) got two more changes to lean further into the "printed receipt" feel, translated into the app's own cute-gamified language rather than copied verbatim (the reference was stark black-and-white monospace; kept the matcha palette and Fredoka/Patrick Hand fonts throughout):
- **Crisp torn/perforated edge**: the soft circular scallop (`radial-gradient` dots) at the top/bottom of each ticket was replaced with a sharper zigzag (`linear-gradient` triangle pairs) that reads much closer to an actual torn receipt edge.
- **Prominent Total up top**: the order's dollar total moved from a small row after the line items to a bold, large `Fredoka`-set headline stat (`.ticket-total-hero`) right under the name/checkbox row — mirroring the reference's "TOTAL: 1.08 KM" treatment — with the itemized dotted-leader breakdown below it for detail. The old duplicate total row at the bottom was removed since it's no longer needed.
- Scoped to the order tickets specifically (`TicketCard.tsx`, shared between the live Orders tab and the read-only ended-event summary's order list) — the ended-event `.receipt` card's own total-at-bottom layout was left as-is, out of scope for this pass.

Verified via the headless-browser driver: a fresh order's ticket shows the zigzag edge and hero total correctly in both pending and completed (checked-off) states, and the same component still renders correctly reused inside an ended event's read-only summary. No console errors.

**Follow-up same session — brand font correction, real cookie bite geometry, ticket total font walked back:** two pieces of the pass above didn't land right and got corrected before shipping.

1. **Brand wordmark was too bold.** Fredoka (bold rounded sans) was a reasonable read of the "Blooming Mood" font reference from earlier in the session, but compared side-by-side against the *actual* source logo (`public/sencha-logo.png`) it's wrong — the real wordmark is a thin, high-contrast serif. Switched `.brand-wordmark` to Cormorant Garamond (weight 600) — the same choice V9 originally made for this exact wordmark, before it was temporarily replaced by the raster image and then by Fredoka. Bumped the landing/auth font sizes up (42px→56px, 34px→44px) since a thin serif reads smaller than a bold rounded face at the same pixel size.
2. **Cookie bite was a circle sitting on top, not an actual bite.** `CookieIcon.tsx` previously composited an opaque `var(--cream)` circle over the cookie's edge — geometrically a hole, not a bite, since the cookie's own outline stayed a full untouched circle underneath. Rewrote it as a real two-circle boolean: `circleIntersections()` computes where the cookie's circle and a "bite" circle cross, and the cookie's outline path is built from an arc along the *cookie's* circumference (the long way around) joined to an arc along the *bite's* circumference (the short way, bowing inward) — a true Pac-Man-style crescent. All the fill (chip flecks, blush, face) is clipped to that same crescent path, so chips near the bite edge get realistically cut off rather than floating outside a "hole." Below a small radius threshold (geometry gets degenerate near-tangent) it just renders the whole circle, so the first ~15% eaten shows no bite yet, matching how an actual small nibble wouldn't be visible either. Verified at ~60% and ~90% eaten via the headless-browser driver — the crescent stays clean and doesn't self-intersect at either extreme.
3. **Ticket total's Fredoka number, walked back.** Once Fredoka was confirmed wrong for the brand wordmark, the same font suddenly read as off-brand for the ticket's headline "Total" stat too (introduced two entries above). Changed `.ticket-total-hero-value` to Patrick Hand — the same handwritten font every *other* prominent number in the app already uses (`.postcard-stat-value`, `.receipt-title`, `.event-card-name`), so the ticket total now matches the app's actual established identity instead of a one-off. Fredoka's `@import` was removed entirely since nothing uses it anymore.

Re-verified end-to-end via the headless-browser driver: landing + auth screens both show the corrected serif wordmark, a Salt Bread ordered down to ~60% and ~90% depleted shows a clean bite notch (not a hole) at both levels, and a submitted order's ticket shows its total in Patrick Hand. `tsc --noEmit` clean, no console errors.

---

## V11 — Migrate to a real backend: Supabase auth, database, and persistence (2026-07-31)

**The big one.** Everything §4/§7 of `CLAUDE.md` used to describe as "no backend, no database" moved to [Supabase](https://supabase.com) (hosted Postgres + Auth + Realtime) in this pass — see `DECISIONS.md` for why Supabase specifically, over hand-rolling a Postgres+Prisma backend as `ROADMAP.md` #4 had originally sketched.

**1. Client setup (purely additive).** Added `@supabase/ssr` + `@supabase/supabase-js`. Three separate client-construction files exist because Supabase's Next.js session cookie needs handling differently in three execution contexts: `lib/supabase/client.ts` (browser, used by every `'use client'` component), `lib/supabase/server.ts` (Server Components/Route Handlers, via `next/headers`), and `lib/supabase/middleware.ts` + root `middleware.ts` (refreshes the session cookie on every request, matched on all routes except static assets). No existing functionality touched yet.

**2. Real authentication.** `signIn`/`signUp`/`signOut` in `AppStateContext.tsx` now call real Supabase Auth instead of checking a plaintext password map in `localStorage`. A single `onAuthStateChange` listener is the sole source of truth for session state — fires once on mount with whatever session already exists (Supabase's own cookie-backed persistence) and again on every later sign-in/sign-out/token-refresh/session-loss-in-another-tab. This is also what gates the whole app: losing a valid session for any reason drops the view back to `'auth'` or `'landing'`, with no separate route-guard code needed. Supabase's "confirm your email" flow is handled (an inline info message when `signUp` returns no session yet). The old plaintext `auth:users`/`auth:session` localStorage keys and their read/write logic were deleted outright, and the sign-in screen's security disclaimer was rewritten to match — this closes the "hard line" flagged in `DECISIONS.md`'s "Local-only, prototype-level authentication" entry.

**3. Schema design, then a phased migration.** A full collaborative schema was drafted first as a design proposal (`supabase/schema.sql` — event_members as the access-control anchor for every table, `inventory_remaining` as a derived view rather than a stored column, order line items snapshotting name/price). It was then **not** deployed wholesale — instead, Orders migrated first (`supabase/orders_phase.sql`, single-owner RLS, since Events hadn't moved yet so there was nothing to anchor a collaborative model to), then Events/Inventory/Settings (`supabase/inventory_events_phase.sql`, same single-owner RLS). See `CLAUDE.md` §7 and `DECISIONS.md` for why the live schema's actual column names/shape diverge from the original proposal, and why that's fine. `lib/supabase/orders.ts` and `lib/supabase/events.ts` are the new, sole translation layer between these tables and the app's existing `Order`/`PopupEvent` types from `lib/types.ts` — every other file, including every component, is unchanged and still speaks only in those types. `localStorage` now holds only the reusable menu template; every event, order, and account lives in Postgres.

**Two real bugs caught and fixed during this migration**, both worth remembering as a pattern: Postgres `numeric` columns (every price field) come back from PostgREST as JSON **strings**, not numbers, to avoid float rounding loss — `price * qty` without an explicit `Number()` coercion silently becomes string concatenation. Fixed everywhere a row is read. Separately, `grant select, insert, update, delete ... to authenticated` was missing from both phase files — RLS policies alone don't grant baseline table access in Postgres, only govern *which rows* an already-privileged role can see; hit as a live `42501 permission denied` on the very first order.

---

## V11.1 — Collaborative stands: invite teammates by email (2026-07-31)

An event's owner can now invite another registered Sencha account to their stand from Settings; the invited person gets full read/write access to that event's orders, inventory, and settings — not a tiered permission system, by design.

`supabase/collaboration_phase.sql` adds `public.users` (a queryable profile mirror of Supabase's own `auth.users`, needed because client code can't query `auth.users` directly — an owner has to be able to resolve "does an account exist at this email?" before inviting) and `event_members` (`event_id`, `user_id`, `role`). Crucially, it also **rewrites every existing table's RLS policy** — events, menu_items, inventory, flavor_options, orders, order_items — from "owner only" (`user_id = auth.uid()`) to "any member of `event_members` for this event," which is the collaborative access model the original `schema.sql` proposal had described all along, now actually adopted for real. A backfill inserts every existing event's current owner as its own first member, so switching the policies didn't lock anyone out of their own data the moment it ran.

New `lib/supabase/members.ts` (`fetchMembers`, `checkEmailRegistered`, `inviteMember`). `SettingsModal` gained a "Team" section — member list with an Owner/Staff tag, plus an invite-by-email field — and the setup wizard gained a **4th page**, "Invite your team," so a stand can add teammates while creating a brand-new event, not only afterward. Every invited email is validated as a real registered account *before* the event is created, so a bad address can't leave a half-created, hard-to-retry event behind.

---

## V11.2 — Live sync: Realtime order updates + in-app notifications (2026-07-31)

Two collaborators working the same stand now see each other's changes without refreshing.

**Realtime** (`supabase/realtime_phase.sql`): adds `public.orders` to Supabase's realtime publication. Any insert/update/delete broadcasts to every client currently viewing that event. `lib/supabase/orders.ts`'s new `subscribeToOrders` opens a channel filtered server-side to one event; `AppStateContext` merges incoming changes into the same order state its own optimistic updates already touch, de-duplicated by id so a client's own change doesn't visibly double when its own write echoes back over the wire a moment later. Realtime respects each table's existing RLS, so this doesn't introduce a new access-control surface.

**Notifications** (`supabase/notifications_phase.sql`): a new `public.notifications` table, populated entirely by a database trigger on `public.orders` (`handle_order_change`) — fans out to every *other* member of that event on any insert/update/delete, distinguishing a completion (`done` flipped true) from a plain edit. Server-side and trigger-driven specifically so no client code path can "forget" to notify teammates, and wrapped so a malformed notification can never roll back the order mutation that triggered it. RLS grants `select`/`update` (mark-as-read) but deliberately **not** `insert` — the trigger runs as `security definer`, so no signed-in user can spam another user's feed directly. New `lib/supabase/notifications.ts`, a `NotificationBell` (unread badge + dropdown, mounted in both Home and an active event's top bar) and `ToastHost` (auto-dismissing, stacking, mounted once in `AppShell` so a toast surfaces regardless of which screen is open).

The sign-in screen's disclaimer was updated in the same pass — the old copy ("your pop-up events are still stored only on this device") stopped being true partway through V11 and was left stale until now.

---

## V11.3 — RLS hardening audit + production-readiness pass (2026-07-31)

Two cleanup passes, no new features or behavior changes.

**RLS audit** (`supabase/rls_hardening_phase.sql`): every policy across the four prior SQL phases was already effectively authenticated-only (`anon` was never granted table privileges, and every policy's `auth.uid()` condition is null for anonymous requests), but only one of eleven policies said so *explicitly* via `to authenticated`. This migration drops and recreates every policy with that clause plus an explicit `revoke ... from anon` per table, so the access model is declared rather than inferred and can't silently drift if a future change grants `anon` something without anyone re-reading this file. No access logic changed. Wrapped in a transaction so there's never a moment mid-migration with zero live policies on a table.

**Production-readiness pass**, scoped to five concrete things: (1) deduplicated repeated row-mapping code in `lib/supabase/events.ts` and the five hand-written `ordersByEvent` spreads in `AppStateContext.tsx` into one shared `applyOrdersUpdate` helper; (2) added a branded `LoadingScreen` (replacing a blank flash during the initial session/data bootstrap) and a `busy` state per order so a slow connection can't double-fire the same toggle/delete; (3) made `addOrder`/`editOrder`/`toggleOrderDone`/`deleteOrder` genuinely **optimistic** — they'd previously awaited the network write before touching local state, which worked against the app's own "usable under time pressure" principle; all four now update local state immediately and roll back + re-throw on failure, with `addOrder` using a temporary client-side id de-duplicated against its own realtime echo; (4) `markNotificationsRead` gained error handling — a failed request no longer leaves the badge silently wrong; (5) `OrdersPage` memoizes its sorted pending/completed lists instead of re-sorting on every render. `createEvent`/`endActiveEvent`/`updateEventSettings` deliberately stayed await-then-update — those are exactly the cases where showing success before it's confirmed would be wrong.

---

## V11.4 — Urgent fix: infinite recursion in the event_members RLS policy (2026-07-31)

Live testing after V11.3 hit a real `42501`/`42P17` wall on the very first "Start selling."

**The bug:** `event_members`'s own "members can view their event's roster" policy answered "is this user a member?" by running a `select ... from event_members` — *from inside a policy on `event_members` itself*. Evaluating that subquery re-applies the same policy, which needs to evaluate the subquery again, forever; Postgres detects the cycle and throws `42P17 infinite recursion detected in policy for relation "event_members"`. This bug shipped with `collaboration_phase.sql` and was carried over unchanged by `rls_hardening_phase.sql`'s rewrite. It wasn't scoped to just the roster view either — `events`, `menu_items`, `inventory`, `flavor_options`, `orders`, and `order_items` all check membership by querying `event_members` from their own policies, so the recursion radiated out to nearly every table the moment anything touched `event_members`.

**The fix** (`supabase/fix_event_members_recursion.sql`): a `security definer` function, `public.is_event_member(event_id, user_id)` (two overloads — `uuid` for tables with a real `event_id` foreign key, `text` for `orders`/`order_items`, which still don't have one — see § 7). `security definer` functions run as their owner, and table owners bypass RLS by default, so the function's internal query never re-triggers `event_members`'s own policy, breaking the cycle. Every affected policy now calls this function instead of repeating its own inline subquery — both so the recursion is actually fixed, and so this class of bug can't quietly reappear in one call site without every other one being re-audited by hand. `collaboration_phase.sql` and `rls_hardening_phase.sql` were annotated (not rewritten) to point future readers at this file, consistent with the project's existing convention of superseding old migrations via a new file rather than editing history.

**A live diagnostic, still in the codebase.** While root-causing the RLS failure (before the recursion was identified), a temporary `debug_whoami()` RPC plus wiring in `SetupScreen.tsx`'s create-event error handler was added to surface the real `auth.uid()` Postgres saw for a failing request, since the client-side `user_id` had already been confirmed correct. A follow-up commit fixed the diagnostic's own bug (Supabase's `PostgrestError` isn't `instanceof Error`, so the original version always printed `"[object Object]"` instead of the real message) — but **the debug RPC and its call site were never removed** once the recursion was found and fixed. See `CLAUDE.md` § 11 for this as a tracked known gap: `context/AppStateContext.tsx`'s `debugWhoAmI()` and the corresponding branch in `SetupScreen.tsx`'s catch block should come out, and `debug_whoami()` dropped from the database, once nobody needs it live.

**Also uncommitted, in progress:** `supabase/undo_rls_hardening_phase.sql` partially reverts V11.3's hardening pass — specifically, restores `notifications`'s two policies to their pre-hardening form (no explicit `to authenticated`). Its own header explains why it's scoped that narrowly: every other table `rls_hardening_phase.sql` touched was already superseded by this recursion fix (undoing those policies now would mean undoing the recursion fix too), and `users`' hardening-pass policy was byte-for-byte identical to the one already in `collaboration_phase.sql`, so there's nothing to revert there either. The `revoke ... from anon` statements are deliberately left in place — `anon` never had access to begin with, so undoing the revoke would be a regression, not a revert.

---

## V12 — Customer pickup-ready text, via an `sms:` link (2026-08-07)

A team member can now optionally take down a customer's phone number when building an order (`OrderPanel.tsx`, right under the name/table field); when that order gets checked off, staff are asked whether to text the customer, and — if they confirm — the browser opens their own phone's Messages app with the pickup-ready message already drafted, one tap from sending.

**Deliberately not the Twilio/API path.** No third-party SMS provider, no server-side trigger, no secrets, no per-message cost. The trade: the app can never confirm a text was actually sent (a person has to tap Send in the OS Messages app; the browser only ever hands off a compose screen and gets no callback), and the message comes from whichever team member's own phone triggered it, not a consistent business number. Considered and explicitly rejected the "auto-open Messages the instant the checkbox is tapped" version — that would force an app-switch on every single completion that has a phone number attached, working against the app's own "usable under time pressure" principle; gating it behind a `confirm()` first keeps every checkbox tap in the browser unless staff actively choose to leave it.

- **`supabase/customer_sms_phase.sql`**: one new nullable `customer_phone` column on `orders`. No new table, no RLS change (the existing membership policy already covers every column), no trigger.
- **`lib/sms.ts`**: `buildPickupReadySmsUrl(phone, eventName)` — builds the `sms:` URI, stripping the phone down to digits/`+` (mobile OSes don't require the E.164 formatting a real SMS API would) and filling in a fixed message: `"[<event name>] Your matcha order is now ready for pick-up! Thank you for ordering ❤️"`.
- **`OrdersPage.tsx`'s `handleToggleDone`**: captures whether this tap is completing the order (not un-checking it) *before* the toggle, and only after the Supabase write succeeds — so a failed toggle never prompts to text about an order that isn't actually marked done — checks for a `customerPhone`, shows the confirm, and on "yes" sets `window.location.href` to the `sms:` link. No new persisted "was this texted" state: the whole thing is a one-shot prompt tied to the completion tap, not a standing button.
- **`OrderPanel.tsx`**: one new optional `tel` input under the existing note field, using the same `.text-input` styling every other secondary field in the app already uses (not the note field's special handwritten/dashed treatment, since this isn't the ticket's headline text).
- Threaded `customerPhone` through the full existing order-mutation path end to end (`lib/types.ts`'s `Order`, `lib/supabase/orders.ts`'s row mapping/`createOrder`/`updateOrder`, `AppStateContext`'s `addOrder`/`editOrder`) — same shape as every other order field, so it survives reloads and syncs across devices/teammates the normal way.

`tsc --noEmit` clean. Migration confirmed run against the live project; deployed to production.

---

## V12.1 — Edit the menu mid-event, from Settings (2026-08-07)

The menu, syrup list, and milk list were locked in at setup — the only stated-known gap in the collaborative-stand feature set (see `CLAUDE.md` § 6 and `ROADMAP.md` #8). `SettingsModal` now has a full menu editor: add/rename/reprice/remove rows for Drinks, Syrup, Milk, and Additional items, identical in behavior to the setup wizard's own menu page.

**Shared editing model, not a duplicate.** The row-based draft shape (`{ id, name, price }`, string price so a half-typed input doesn't need to round-trip through `NaN`) and its conversions to/from the real `MenuItem`/`FlavorOption` types moved out of `SetupScreen.tsx` into a new `lib/menuRows.ts`, so both screens share one implementation instead of `SettingsModal` growing a second copy of logic that already existed.

**The actual hard part was the sync, not the form.** Setup only ever inserts; editing has to update-in-place, insert new rows, and delete removed ones, while a matcha stand's inventory rows are keyed off `menu_items.id` — a brand-new row doesn't have a real id yet when the person is still typing. `updateEventSettingsRemote` (`lib/supabase/events.ts`) now diffs the submitted menu/syrup/milk lists against the event's current state by id: existing ids get an `update` (only issued if something actually changed), ids no longer present get `delete`d, and everything else is a fresh `insert` — for menu items specifically, each insert is followed by an `inventory` row using the starting count the person entered against that item's *temporary* client-side id, resolved to the real id Postgres just generated. The function returns the fully resolved menu/inventory/syrup/milk lists (real ids included) rather than the patch that was sent, and `AppStateContext` replaces local state with that response instead of merging its own patch — new items would otherwise sit in local state under a client id that no longer matches anything in the database.

**Confirmed safe for past orders**, per the original roadmap entry's own watch-out: `order_items` denormalizes `item_name`/`price` at order time and isn't touched by this sync at all (`orders.item_id` also isn't a foreign key — see `orders_phase.sql`), so renaming or repricing a menu item, or deleting it entirely, never changes what an already-placed order displays.

No RLS changes needed — `menu_items`/`flavor_options`/`inventory`'s existing "members can access" policies (`for all`) already cover insert/update/delete, not just the select/insert-at-creation paths that had been exercised so far.

---

## V12.2 — Fix: a mid-event invite never appeared on the invited person's Home screen (2026-08-08)

**The bug:** inviting someone from Settings, on an event that already existed, added them to `event_members` correctly (they'd get order notifications for that event right away), but the event itself never showed up as a stand on their Home screen — only a fresh sign-in would surface it. Root cause: `events` is fetched exactly once, in `loadUserInto`, triggered by Supabase's `onAuthStateChange` firing at sign-in. Nothing re-fetched it afterward, so an invited person's local `events` state was simply a stale snapshot from whenever they last logged in — unlike notifications, which are their own always-on Realtime subscription that doesn't depend on the event being in local state at all.

**The fix:** `supabase/realtime_event_members_phase.sql` adds `event_members` to the Realtime publication (same mechanism `realtime_phase.sql` already uses for `orders`). `lib/supabase/members.ts`'s new `subscribeToMembership(supabase, userId, onNewMembership)` listens for `INSERT`s on `event_members` filtered to the signed-in user's own rows; `AppStateContext.tsx` reacts by re-fetching events + orders (extracted the bootstrap's fetch-and-set logic into a shared `refreshEventsAndOrders()`, now called from both `loadUserInto` and this new subscription). A membership row alone doesn't carry a menu/inventory to build a full `PopupEvent` from, so this re-fetches everything rather than trying to assemble the one new event by hand — simple and correct at this app's scale, where being invited to a new stand is a rare event, not a frequent one like an order changing.
