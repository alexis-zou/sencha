# CLAUDE.md — Sencha

This file is the entry point for Claude Code (or any engineer) picking up this project. Read this first, then `DECISIONS.md`, `DESIGN.md`, `CHANGELOG.md`, and `ROADMAP.md` as needed.

*Naming note:* this app was built and documented through V8 under the working title **"Matcha Stand"** — that name still appears throughout the historical `CHANGELOG.md`/`DECISIONS.md` entries and is left as-is there (rewriting history would be inaccurate). As of V9 the public-facing brand is **Sencha**; this file and all new user-facing text use that name going forward.

---

## 1. Project Overview

**Sencha** is a mobile-first web app for young entrepreneurs running matcha pop-up stands at farmers markets, school events, and similar one-day pop-ups. It replaces a scramble of notebooks/group chats/mental math with one place to log orders, track remaining stock, and see income — designed to be usable **under time pressure, mid-rush, on a phone**.

The project started as a single-file HTML/CSS/JS prototype (built and iterated live in Claude.ai's artifact environment) and is now being converted into a proper Next.js application, preserving the existing design and UX exactly before any new features are added.

**Primary user:** a teen/young-adult running their own small drinks-and-snacks stand, usually solo or with one friend, for a few hours at a time.

**Core jobs the app does:**
1. Track incoming orders as a checklist (incomplete → completed) without losing any mid-rush.
2. Track remaining stock (matcha, salt bread, matcha cookies) so the stand doesn't oversell.
3. Calculate income earned so far, automatically, from completed orders.

---

## 2. Product Vision

> Help a stand owner feel **in control** of their pop-up and stay on top of orders, in under 2 minutes of setup, under time pressure.

Design/product principles that fall out of this (see `DESIGN.md` for the full write-up):
- **Fast setup, fast entry.** Setting up a new event and logging an order should both be quick — big tap targets, sensible defaults, minimal typing.
- **Never lose data mid-rush.** Everything persists automatically; there's no explicit "save" step a stressed person could forget.
- **See status at a glance.** Income and event name are visible on every screen inside an event; inventory has its own dedicated, highly visual page.
- **Warn, don't block.** Stock warnings inform a decision (e.g., "only 2 matcha left, this order needs 3") rather than hard-stopping the person — they may have backup stock or want to accept the tradeoff.
- **Warm, homemade, scrapbook aesthetic** — earthy matcha greens, handwritten display type, paper texture, ticket/receipt-style order cards — because this is a personal, small-scale business tool, not enterprise SaaS.

---

## 3. Tech Stack

### Current (this handoff)
- **Framework:** Next.js 14 (App Router), TypeScript, React 18.
- **Styling:** plain global CSS (`app/globals.css`) — a faithful, near-verbatim port of the prototype's `<style>` block. **No Tailwind, no CSS-in-JS.** This was a deliberate choice for this first conversion pass — see `DECISIONS.md` § "Why plain CSS, not Tailwind, for the initial port."
- **Fonts:** Google Fonts `Patrick Hand` (headings — handwritten scrapbook feel) and `Quicksand` (body — clean, round, minimal), loaded via CSS `@import` (same mechanism the prototype used).
- **State management:** React Context (`context/AppStateContext.tsx`) with `useState`/`useMemo`, no external state library.
- **Persistence:** browser `localStorage`, wrapped behind a small async `storage` module (`lib/storage.ts`) that mirrors the original prototype's `window.storage.get/set/delete` interface. This is intentionally the seam where a real backend gets plugged in later — see `DECISIONS.md`.
- **No backend, no database, no auth provider** — see § 4 and `DECISIONS.md`.

### Original prototype (superseded, kept for reference in `CHANGELOG.md`)
- Single `matcha-stand.html` file: inline `<style>` + inline `<script>`, no build step, running inside Claude.ai's artifact sandbox with its own `window.storage` key-value API.

---

## 4. Current Architecture

```
User's browser
  └─ Next.js app (client-rendered; almost the whole app is 'use client')
       └─ AppStateProvider (context/AppStateContext.tsx)
            ├─ auth state (current user email, sign in/up/out)
            ├─ events[] (all pop-up events for the signed-in user)
            ├─ activeEventId / activePage (which event + tab is open)
            └─ summaryEventId (which ended event is being viewed read-only)
       └─ AppShell — switches between 5 top-level screens based on `view`
            ├─ AuthScreen
            ├─ HomeScreen
            ├─ SetupScreen
            ├─ MainScreen (Orders tab / Inventory tab, via bottom nav)
            └─ SummaryScreen (read-only, for ended events)
```

**No server round-trips at all right now.** Every "account" is really just an entry in `localStorage` on that one browser/device. This mirrors the original prototype's model (see `DECISIONS.md` for why, and `ROADMAP.md` for the plan to add a real backend).

**Data flow:** all app data lives in one `events: PopupEvent[]` array in React state, persisted to `localStorage` under a per-user key (`events:<email>`) any time it changes. Components read from context via `useAppState()` and call mutator functions (`updateActiveEvent`, `createEvent`, `endActiveEvent`, etc.) rather than touching storage directly.

See `lib/types.ts` for the full shape of `PopupEvent`, `Order`, `MenuItem`, etc.

---

## 5. Every Feature Completed

### Accounts & navigation
- **Landing page** (`LandingScreen.tsx`) is the first thing a fresh/logged-out visitor sees — brand mark (`icons/SenchaLogo.tsx`), "sencha" wordmark, tagline, and a "Get started" button into sign-in. A **returning signed-in visitor skips it entirely**: `AppStateContext`'s bootstrap effect checks for a saved session before deciding whether the initial view is `'landing'` or straight to `'home'`, so the pitch page never gets in a returning user's way.
- Email/password sign up / sign in (local-only — see § 8 and `DECISIONS.md`).
- Session persistence (returning to the app skips sign-in until explicit sign-out).
- Home screen listing all of a user's pop-up events (active + ended), sorted newest-first, each showing income and order count.
- "+ New pop-up event" → setup flow → active event view.
- Back navigation from an active event to Home without ending it.
- "End Event" (with confirmation) marks an event ended and returns to Home.

### Event setup
Setup is a **3-page wizard** (`components/SetupScreen.tsx`), navigated only via explicit **"Continue →" / "← Back"** buttons or the tappable step dots — there is no swipe-to-advance gesture; page transitions animate (CSS slide) but are always button-triggered, never triggered by a drag gesture, so nothing advances by accident.
- **Page 1 — Event details**: event name, date, and separate start/end time (two `type="time"` inputs).
- **Page 2 — Build your menu**: four independent add/remove row lists — **Drinks** (name + required price), **Syrup** (name + optional price/upcharge), **Milk** (name + optional price/upcharge), **Additional items** (name + required price, replaces the old fixed bread/cookie "add-ons" concept — any product name is allowed now). A **"💾 Save this menu for next time"** button persists the current Drinks/Syrup/Milk/Additional-items selections as a reusable template (see § 7), which auto-prefills the next new event's setup.
- **Page 3 — Starting inventory**: one row per item from the Drinks + Additional items lists (syrup/milk are order customizations, not separately stocked, so they're excluded here), each labeled with a **Drink**/**Item** tag; at least one drink or item is required to reach a non-empty page 3, enforced (with a friendly redirect back to page 2) at final submission rather than blocking navigation mid-wizard.

### Orders (per active event)
- **Multi-item orders**: one order can contain any combination of drinks/additional items, each with its own quantity.
- **Drink customization**: any item of type `drink` prompts for **Syrup** and **Milk** (both from the event's configured, individually-priced lists, plus a free "None"/"No Milk" default) when added to an order. A syrup/milk upcharge adds to that line's unit price. (Ice was removed as a customization option — see `DECISIONS.md`.)
- **Add Item flow**: a modal lists the full saved menu; picking an item reveals its configuration (if a drink) + a quantity stepper; confirming adds it as a line to the order being built.
- **Editing orders after the fact**: tapping an existing order (or its ✎ button) reopens the same panel pre-filled, letting you add/remove/edit line items and the note, then "Save changes."
- **Order sheet aesthetic**: the "+ Add order" panel (`OrderPanel.tsx`) is styled to feel like jotting an order down by hand — warm kraft-paper grain background, a dashed "write on the line" note field, item names set in the handwritten heading font, a small rotated "✎ jot it down" stamp.
- **Order note/name** field sits above the item list (not below), used as the ticket's header.
- **Live low-stock warning**: as items are added/edited in the order panel, an inline banner names exactly which item is short and by how much, computed against real remaining stock (correctly excluding the order being edited from its own "already used" count).
- **Soft-block confirmation**: submitting an order that would exceed remaining stock shows a confirm dialog repeating the shortage, letting the person proceed anyway or go back.
- **Ticket/receipt-style order cards**: scalloped top/bottom edges (CSS, no images), neutral paper background, dotted-leader line items (name ... price), a checkable circle, edit/delete actions. Line-item names render in the handwritten font too, matching the order sheet.
- Orders split into **Incomplete** / **Completed** sections; a page-level pill shows "N pending · N done" beside the "Orders" heading.
- **Completion animation**: checking an order off triggers a brief scale-pulse on the card plus a small emoji "burst" (✅ 🍵 🍃 ✨) from the checkbox.
- **Sparkle animation**: confirming a new/edited order (the "Add to list" / "Save changes" button) triggers a sparkle burst (✨ ⭐ 🌟).
- Deleting an order (🗑) removes it immediately (no confirmation currently — see § 12 known gaps).

### Inventory
- Dedicated Inventory tab (bottom nav) showing **one card per menu item** (drinks + additional items — generalized from the old fixed matcha/bread/cookie trio, so a stand can track any number/kind of products).
- Each card shows a **cute, type-specific depleting icon**: drinks get `icons/MatchaDrinkIcon.tsx` (a matcha cup with a straw, a small cute face, and a liquid level that drops as stock is ordered); additional items get `icons/CookieIcon.tsx` (a chip-studded cookie with a cute face and a growing "bite" cut-out). Both replaced the earlier generic, type-agnostic `StockIcon`.
- Remaining stock is shown as a **progress bar** (not a floating numeric badge): a track that fills from `--sage` green and turns `--danger-light` (soft red) once remaining stock drops **below 10** — an absolute threshold, not a percentage of starting stock (see `DECISIONS.md`). A "N left in stock" label sits below the bar in the same color.
- Remaining = starting count for that item − sum of quantities of that item ordered, across **all** orders (pending + completed) for that event, so the stand doesn't overcommit.

### Income
- Labeled "Income" (not "Profit") everywhere it appears — top bar of an active event, home-screen folders, the live Summary tab, and the receipt-style ended-event summary.
- Income = sum of (price × qty, including any syrup/milk upcharge) across all line items in orders marked **done**. Pending orders don't count yet.
- No ingredient-cost input yet — this is gross revenue from completed orders, not true profit margin (see `ROADMAP.md`).

### Live Event Summary (while an event is active)
- Third bottom-nav tab (`SummaryPage.tsx`, alongside Orders/Inventory) styled as a **postcard** — kraft-paper card, a stamp-like emoji in the corner, a 2×2 stat grid (Income, Orders, Avg. order, Pending), a dashed divider, a **Top sellers** list (items sold by quantity, completed orders only), and **Crowd favorites** (most-ordered syrup/milk, if any were used).
- All figures come from `lib/calculations.ts`'s `computeEventStats()`, which aggregates completed orders only — consistent with how Income is already calculated, so a pending order-in-progress doesn't inflate "what actually sold" figures.

### Settings & lifecycle
- ⚙ Settings modal (from the active event's top bar) lets you edit event name, date/time, and starting inventory counts (one row per menu item) after the fact.
- "End Event" (red button, top bar) confirms, marks the event `ended`, and returns to Home.
- Ended events become **read-only**: a dedicated Summary screen (`SummaryScreen.tsx`) presents the event as a **receipt** — itemized line items with dotted leaders, a total, order-completion counts, top syrup/milk, a decorative barcode (`icons/Barcode.tsx`, deterministic per event id, not a real scannable symbology), final inventory (via the same cute icons/progress bars), and every order as a non-interactive ticket below. An **"🖨️ Export as PDF"** button triggers the browser's native print dialog against a dedicated print stylesheet that hides app chrome and shows just the receipt + inventory — "Save as PDF" from that dialog is the export path (no PDF-generation library was added; see `DECISIONS.md`).

### Home screen — event archive
- Each saved event renders as a **file folder** (`event-folder` — a small tab shape peeking above a rounded card) rather than a plain list card. Ended events show a "Tap to view receipt →" hint, since opening one retrieves the receipt-style summary above.

### Visual design
- Matcha-green earthy palette (see `DESIGN.md` for exact tokens), extended with `--danger-light` (a soft pink-red tint of `--danger`) for the "low stock" progress-bar state.
- Handwritten heading font (Patrick Hand) + clean rounded body font (Quicksand).
- Subtle paper-grain texture overlay on the whole app background, plus a warmer, more visible kraft-paper grain (same turbulence-filter technique, tinted and boosted) on the three "paper surface" components: the order sheet, the live summary postcard, and the receipt.
- Each top-level screen has its own soft matcha gradient background (cream → pale) rather than sitting flush against the app's flat background color. The washi-tape heading accent was removed in favor of this.
- Translucent, blurred bottom navigation bar with a clearer active-tab indicator (a pale pill behind the active tab's icon).
- Sign-out as a pill-shaped button with a small icon rather than a bare icon tile.

---

## 6. Every Planned Feature (not yet built)

See `ROADMAP.md` for the prioritized, numbered version of this list. Summary:

- Real backend + database (multi-device sync, real authentication, real multi-user support).
- Ingredient-cost input for true profit margin (currently revenue-only).
- Editing the menu/add-ons/syrup list **after** an event has started (currently locked in at setup).
- Duplicating/"templating" a past event to reuse a menu + prices for a recurring market.
- Exporting/sharing a past event's summary (e.g., as an image or PDF, for taxes or partners).
- Password reset flow (currently impossible — there's no email delivery or recovery mechanism at all).
- Optional pricing on syrup add-ons (currently free/no upcharge).
- Delete confirmation on orders (currently instant, no undo).
- Reordering/duplicating a line item within the order panel.
- Multi-user / shared-stand support (e.g. two people working one stand, both able to add orders live) — would require the backend above.

---

## 7. Database Schema

**There is currently no database.** All persistence is client-side `localStorage`, scoped per browser. The "schema" today is the TypeScript shape in `lib/types.ts` (rewritten in the Setup-wizard pass — see `CHANGELOG.md` V7 — to generalize inventory from a fixed matcha/bread/cookie trio to arbitrary per-item tracking):

```ts
type MenuItemType = 'drink' | 'item'; // 'drink' gets syrup/milk/ice customization; 'item' doesn't

interface MenuItem {
  id: string;
  name: string;
  price: number;
  type: MenuItemType;
}

interface FlavorOption {          // shared shape for both syrup and milk choices
  id: string;
  name: string;
  price: number;                   // per-unit upcharge; 0 = free
}

interface PopupEvent {
  id: string;
  eventName: string;
  eventDate: string;               // "2026-07-25"
  startTime: string;               // "09:00"
  endTime: string;                 // "13:00"
  inventory: Record<string, number>; // menuItem.id -> starting count (drinks + items only)
  menu: MenuItem[];
  syrups: FlavorOption[];
  milks: FlavorOption[];
  orders: Order[];
  status: 'active' | 'ended';
  createdAt: number;               // Date.now()
  endedAt: number | null;
}

interface Order {
  id: string;
  items: OrderLineItem[];
  note: string;                    // customer name / table — shown as ticket header
  done: boolean;
  ts: number;                      // Date.now() at creation, used for sort order
}

interface OrderLineItem {
  itemId: string;
  itemName: string;
  price: number;                   // base menu item unit price, denormalized at order time
  qty: number;
  // Only present when the item is type 'drink':
  syrupId?: string; syrupName?: string; syrupPrice?: number;
  milkId?: string; milkName?: string; milkPrice?: number;
  ice?: string;
}

// Saved independently of any one event, under its own storage key, so a
// stand's menu can carry over into future pop-ups (see § 5 "Event setup").
interface MenuTemplate {
  menu: MenuItem[];
  syrups: FlavorOption[];
  milks: FlavorOption[];
}
```

Storage keys currently in use (all in `localStorage`, all JSON-stringified except the session value):
| Key | Contents |
|---|---|
| `auth:users` | `{ [email: string]: string }` — plaintext password map (see `DECISIONS.md` re: why this is not secure and must change before real use) |
| `auth:session` | the currently signed-in email, as a raw string |
| `events:<email>` | `PopupEvent[]` — every event (active + ended) belonging to that user |
| `menuTemplate:<email>` | `MenuTemplate` — the most recently saved reusable menu for that user |

**When a real backend is introduced** (see `ROADMAP.md` #1), the natural relational shape is:
```
users (id, email, password_hash, created_at)
events (id, user_id FK, event_name, event_date, start_time, end_time, status, created_at, ended_at)
menu_items (id, event_id FK, name, price, type)
inventory (menu_item_id FK, starting_count)
syrups (id, event_id FK, name, price)
milks (id, event_id FK, name, price)
orders (id, event_id FK, note, done, created_at)
order_line_items (id, order_id FK, menu_item_id FK, item_name, price, qty,
                   syrup_id, syrup_name, syrup_price, milk_id, milk_name, milk_price, ice)
```
`item_name`/`price` (and the syrup/milk name+price) are denormalized onto the line item (not just a foreign key) intentionally — if a stand edits a menu item's price mid-event, past orders should keep showing the price the customer actually paid.

---

## 8. Design Philosophy

Full detail lives in `DESIGN.md`. The short version:

- **Scrapbook, not corporate.** Handwritten headings, paper texture, ticket-style receipts, washi-tape accents — this should feel like a personal project binder, not enterprise software.
- **Function drives the signature visuals.** The depleting matcha-cup / bite icons aren't decoration — they directly visualize the app's core anxiety (how much stock is left) at a glance.
- **Warm earth tones only.** A single matcha-green palette plus two food-accent tones (bread tan, cookie brown); no arbitrary "brand blue."
- **Low-friction interaction.** Big tap targets, steppers instead of typed numbers where possible, live inline warnings instead of blocking modals wherever the person might reasonably want to override a warning.

---

## 9. UI Components

All components are under `components/` (one file per component, PascalCase). Quick reference:

| Component | Purpose |
|---|---|
| `AppShell` | Top-level view switcher (auth/home/setup/main/summary) based on context `view` |
| `LandingScreen` | First screen for a logged-out visitor: brand mark, wordmark, tagline, "Get started" CTA into `AuthScreen` |
| `AuthScreen` | Sign in / sign up form |
| `HomeScreen` | Event list + "New pop-up event" entry point |
| `SetupScreen` | 3-page new-event wizard (details → menu → inventory), button/dot navigation only, no swipe |
| `MainScreen` | Active event shell: top bar (income, settings, end event), bottom nav (Orders/Inventory/Summary), hosts the three tab pages |
| `OrdersPage` | Add-order button, incomplete/completed lists, order count pill |
| `InventoryPage` | One depleting-icon + progress-bar card per menu item (drink or additional item) |
| `SummaryPage` | Live, in-progress "postcard" tab — income/orders/avg/pending stats, top sellers, favorite syrup/milk |
| `SummaryScreen` | Read-only, receipt-styled view for an ended event, with a barcode and a PDF export button |
| `OrderPanel` | New/edit order form styled as a handwritten order sheet: note field, draft item list, "+ Add item," stock warning, confirm |
| `ItemPickerModal` | Modal for choosing a menu item + configuring syrup/milk + quantity |
| `TicketCard` | The receipt-style order card, used in both `OrdersPage` and `SummaryScreen` (via a `readonly` prop) |
| `SettingsModal` | Edit event name/date/inventory after setup |
| `Burst` | Imperative sparkle/confetti particle effect (not a rendered component — a DOM utility function) |
| `icons/MatchaDrinkIcon` | Cute matcha cup (straw, face, liquid level) for menu items of type `drink` |
| `icons/CookieIcon` | Cute chip cookie (face, growing bite mark) for menu items of type `item` |
| `icons/Barcode` | Decorative barcode, deterministic bars from a seed string (the event id) — not a real scannable symbology |
| `icons/SenchaLogo` | Brand mark — matcha bowl, whisk, cute face, leaf accent — hand-drawn SVG line art, not a raster image (see `DECISIONS.md`) |

---

## 10. Business Logic

All pure calculation logic lives in `lib/calculations.ts` (no side effects, fully unit-testable):

- `usedByItem(itemId, event, excludeOrderId?)` — sums quantities of one menu item ordered across all orders, optionally excluding one order (used when editing that order, so it doesn't count against its own remaining-stock check).
- `remaining(itemId, event, excludeOrderId?)` — that item's starting inventory minus `usedByItem`.
- `lineTotal(lineItem)` — `(price + syrupPrice + milkPrice) × qty` for one order line — the combined per-line total including any drink customization upcharges.
- `totalProfit(event)` — sums `lineTotal` across all line items in orders where `done === true`. (Named `totalProfit` in code for continuity with the prototype; displayed to the user as "Income.")
- `orderTotal(order)` — sums `lineTotal` across one order's line items.
- `badgeClass(left)` — returns `'out'` at ≤0, `'low'` at <10 remaining (an absolute threshold, not a percentage of starting stock — see `DECISIONS.md`), else `''`. Drives both the inventory progress-bar color and its text label.
- `computeEventStats(event)` — aggregates *completed* orders into: income, total/completed/pending order counts, average order value, items sold (qty + $ subtotal per item, sorted by qty), and the most-ordered syrup/milk. Powers both the live `SummaryPage` tab and the ended-event receipt.
- `formatMoney`, `formatEventDate`, `formatTimeRange`, `formatEventDateTime` (combines the two), `customBitsFor` — display formatting helpers.

**Key business rule:** inventory is decremented by *all* orders (pending + completed), not just completed ones — an order still being made already "used" that stock, even before it's checked off.

---

## 11. Known Bugs / Gaps Carried From the Prototype

Nothing is a confirmed "bug" in the sense of broken behavior — these are known rough edges to be aware of:

1. **No password recovery.** Since there's no backend/email, a forgotten password has no recovery path. Needs at least a clear in-app warning before this goes further; real fix requires the backend in `ROADMAP.md` #1.
2. **`localStorage` is per-browser, per-device.** Switching phones/browsers loses access to prior events (the data literally isn't there). Not a bug, but a hard limitation of the current architecture worth flagging loudly to users if this ships beyond prototype use.
3. **No delete confirmation on orders.** Tapping 🗑 removes an order immediately, no undo.
4. **Menu/add-ons/syrups are locked at setup.** If a stand realizes mid-event they need to rename or reprice something, there's no in-event edit path (only the three inventory counts and event name/date are editable via Settings).
5. **Auth is not secure.** Passwords are stored in plaintext in `localStorage`. This is fine for a personal, no-real-data-at-stake prototype; it is **not** acceptable once there's a real backend or any expectation of privacy — flagged prominently in `DECISIONS.md`.
6. **No automated tests exist yet.** The V6 Next.js port was validated only by manual review + a TypeScript structural check. It **has since been run** in a live `next dev` server and click-tested end-to-end (see `CHANGELOG.md` V6.1) — that risk is resolved — but there's still no automated test suite (`ROADMAP.md` #2–3 remain open).

---

## 12. Remaining TODOs (this handoff)

- [x] Run `npm install` and `npm run dev`; click through every screen against the feature list in § 5 — done, see `CHANGELOG.md` V6.1.
- [ ] Decide on a real backend (see `ROADMAP.md` #1) before this goes anywhere near real users/real money.
- [ ] Add automated tests (unit tests for `lib/calculations.ts` at minimum — they're pure functions and cheap to test).
- [ ] Decide whether to introduce Tailwind/a component library, or continue with plain CSS (see `DECISIONS.md`).
- [ ] Add basic e2e smoke coverage (Playwright is already available in this environment's global tooling) for the core loop: sign up → create event → add order → complete order → check income/inventory → end event → view summary.

---

## 13. Important Implementation Decisions

Full reasoning in `DECISIONS.md`. Headlines:
- **Local-first persistence, no backend yet** — deliberate, to keep iteration fast; the `storage.ts` module is the seam for swapping in real API calls later.
- **Plain CSS over Tailwind for this first port** — minimize conversion risk while preserving the design exactly; Tailwind (or another system) can be layered in later as a separate, deliberate task.
- **React Context instead of Redux/Zustand/etc.** — app-wide state is a single small tree (one signed-in user, their events); a context + a handful of `useState` calls is sufficient and keeps the dependency list minimal.
- **`totalProfit`/"Income" naming split** — internal function/variable names still say "profit" (continuity with the original codebase and its calculation, which is revenue-only); all **user-facing** text says "Income" per the latest product decision. Don't rename the internal function without checking `ROADMAP.md` #2 (true profit/cost tracking), which will likely want both a revenue figure and a margin figure side by side.
- **Inventory decremented by pending + completed orders**, not completed-only — prevents a stand from overselling stock that's already spoken for by an in-progress order.

---

## 14. Recommended Folder Structure

This is what's in place now, and the intended shape going forward:

```
matcha-stand-nextjs/
├── CLAUDE.md              ← you are here
├── CHANGELOG.md           ← full version history, prototype through this port
├── ROADMAP.md             ← prioritized next 20 tasks + longer-term ideas
├── DECISIONS.md           ← architecture/product decisions log
├── DESIGN.md              ← palette, type, component patterns, UX principles
├── package.json
├── tsconfig.json
├── next.config.mjs
├── app/
│   ├── layout.tsx          # root layout, imports globals.css
│   ├── page.tsx            # mounts AppStateProvider + AppShell
│   └── globals.css         # full design system (ported from the prototype)
├── components/
│   ├── AppShell.tsx
│   ├── AuthScreen.tsx
│   ├── HomeScreen.tsx
│   ├── SetupScreen.tsx
│   ├── MainScreen.tsx
│   ├── OrdersPage.tsx
│   ├── InventoryPage.tsx
│   ├── SummaryScreen.tsx
│   ├── OrderPanel.tsx
│   ├── ItemPickerModal.tsx
│   ├── TicketCard.tsx
│   ├── SettingsModal.tsx
│   ├── Burst.tsx
│   └── icons/
│       ├── MatchaIcon.tsx
│       └── BiteIcon.tsx
├── context/
│   └── AppStateContext.tsx # all app state + actions
└── lib/
    ├── types.ts             # PopupEvent, Order, MenuItem, etc.
    ├── constants.ts          # MILK_OPTIONS, ICE_OPTIONS, storage key helpers
    ├── calculations.ts       # pure business logic (see § 10)
    ├── storage.ts             # localStorage wrapper (swap seam for a real backend)
    └── id.ts                  # uid() generator
```

**As the app grows**, the recommended next structural moves (see `ROADMAP.md` for when):
- Split `app/` into real routes once there's a reason to (e.g. `/events/[id]`, `/events/[id]/summary`) instead of one client-side view switcher — likely alongside the backend migration, so URLs can be shared/bookmarked.
- Introduce `app/api/` route handlers (or a separate service) once a real backend exists.
- Add `lib/api/` (or similar) as the new home for backend calls, keeping `lib/storage.ts`'s interface as the contract components already depend on — minimizing changes to component code.
- Add a `__tests__/` (or colocated `*.test.ts`) convention once automated tests start.

---

## 15. Prioritized Roadmap (Next 20 Tasks)

See `ROADMAP.md` for the full list with rationale. Top of the list, in order:
1. Verify the Next.js port (`npm install && npm run dev`, click through everything).
2. Add unit tests for `lib/calculations.ts`.
3. Decide + spike a real backend (auth + database) — see `ROADMAP.md` for options considered.
4. Migrate auth to the real backend (hashed passwords, real sessions).
5. Migrate events/orders persistence to the real backend.
6. Add a "delete order" confirmation.
7. Allow menu/add-on/syrup edits mid-event.
8. Add ingredient-cost input + true profit/margin display alongside Income.
9. Add "duplicate event as template" from Home.
10. Add export/share of a past event summary.

(continues to #20 — see `ROADMAP.md`)
