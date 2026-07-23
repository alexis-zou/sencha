# Matcha Stand — Changelog

Full version history: V1 through V5 are the original single-file HTML/CSS/JS prototype (built iteratively inside Claude.ai's artifact environment). V6 is the conversion to this Next.js project. For the reasoning *behind* still-current decisions (as opposed to the blow-by-blow history), see `DECISIONS.md`. For what's planned next, see `ROADMAP.md`.

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

## Mobile port started (2026-07-23)

A React Native / Expo port of this app has begun as a **separate sibling project**, `../sencha_mobile/`, not a conversion of this codebase — this Next.js app stays as-is, fully intact, as the reference implementation. See `sencha_mobile/CLAUDE.md` and `sencha_mobile/CHANGELOG.md` for that project's own status and history; nothing in this repository changes as a result of that work.
