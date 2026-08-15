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
2. Track remaining stock for every menu item (originally a fixed matcha/bread/cookie trio; generalized in V7 to whatever the stand actually sells) so the stand doesn't oversell.
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
- **Fonts:** Google Fonts `Patrick Hand` (headings — handwritten scrapbook feel), `Quicksand` (body — clean, round, minimal), and `Cormorant Garamond` (scoped narrowly to the "sencha" brand wordmark), loaded via CSS `@import` (same mechanism the prototype used).
- **State management:** React Context (`context/AppStateContext.tsx`) with `useState`/`useMemo`, no external state library.
- **Backend:** [Supabase](https://supabase.com) — hosted Postgres, Auth, and Realtime. `lib/supabase/*.ts` is the only layer that talks to it directly (see § 4); everything above that layer, including every component, still speaks only in the app's own `PopupEvent`/`Order`/etc. types from `lib/types.ts`.
- **Auth:** real Supabase Auth (email/password, session cookies) — replaced the original prototype's plaintext `localStorage` password map in V11 (see `CHANGELOG.md`, `DECISIONS.md`). Email confirmation was later turned off in the Supabase dashboard (a signed-up account gets a session immediately, no "check your email" step) — see `DECISIONS.md`.
- **Database:** Postgres, reached via PostgREST through the Supabase client libraries — there is no hand-written API server. Access control is enforced entirely by Postgres **Row Level Security**, not application code — see § 7.
- **Realtime sync:** Supabase Realtime broadcasts order (and notification) changes live to every client viewing an event — teammates on a shared stand, or the same user on two devices.
- **Persistence:** almost everything lives in Postgres now. Browser `localStorage`, wrapped behind a small async `storage` module (`lib/storage.ts`, mirroring the original prototype's `window.storage.get/set/delete` interface) still exists but is only used for the reusable **menu template** ("save this menu for next time") — accounts, events, and orders have all migrated off it.

### Original prototype (superseded, kept for reference in `CHANGELOG.md`)
- Single `matcha-stand.html` file: inline `<style>` + inline `<script>`, no build step, running inside Claude.ai's artifact sandbox with its own `window.storage` key-value API.

---

## 4. Current Architecture

```
User's browser
  └─ Next.js app (client-rendered; almost the whole app is 'use client')
       └─ AppStateProvider (context/AppStateContext.tsx)
            ├─ auth state (Supabase session: user email/id, sign in/up/out)
            ├─ events[] (every event the signed-in user owns or is invited to)
            ├─ ordersByEvent (Supabase-backed, merged onto events[] before
            │                 being handed to the rest of the app)
            ├─ notifications[] / toasts[] (cross-event, kept live via Realtime)
            ├─ activeEventId / activePage (which event + tab is open)
            └─ summaryEventId (which ended event is being viewed read-only)
       └─ AppShell — switches between 6 top-level screens based on `view`
            ├─ LandingScreen (logged-out visitors only)
            ├─ AuthScreen
            ├─ HomeScreen
            ├─ SetupScreen
            ├─ MainScreen (Orders / Inventory / Summary tabs, via bottom nav)
            └─ SummaryScreen (read-only, for ended events)
       └─ lib/supabase/{events,orders,members,notifications}.ts
            — the only files that know Postgres's actual column names;
              translate rows <-> the app's PopupEvent/Order/etc. types
  ↕ HTTPS (PostgREST) + WebSocket (Realtime), straight from the browser
Supabase
  ├─ Auth — accounts, sessions (email confirmation off — see § 4 tech stack)
  ├─ Postgres — events, menu_items, inventory, flavor_options, orders,
  │             order_items, users, event_members, notifications
  ├─ Row Level Security — the entire permission system (see § 7); every
  │             policy reduces to "are you a member of this event?"
  └─ Realtime — broadcasts orders/notifications changes to subscribed clients
```

**There is a real backend now.** The app talks straight to Supabase from the browser — there's no custom API server Sencha hosts itself. `lib/supabase/client.ts` builds the browser-side client used by `AppStateContext` and every component; `lib/supabase/server.ts` and `lib/supabase/middleware.ts` exist for the Next.js server/middleware side (mainly session-cookie refresh — see the root `middleware.ts`, which runs on every request except static assets).

**Data flow:** once a session is confirmed, `AppStateContext` fetches events, orders, and notifications from Supabase (`loadUserInto`). Orders are kept in a separate `ordersByEvent` map and merged onto `events[]` at one point (`eventsWithOrders`), so every component still just reads `event.orders` unmodified — HomeScreen, InventoryPage's stock math, SummaryPage, TicketCard, etc. needed no changes for this migration. Two Supabase Realtime subscriptions run for the life of a session: one for the active event's orders, one for the signed-in user's notifications (spans every event they belong to, not just the open one).

Order mutations (`addOrder`/`editOrder`/`toggleOrderDone`/`deleteOrder`) are **optimistic** — local state updates immediately (matching the app's "usable under time pressure" principle), the network write follows, and a failure rolls the local change back and re-throws so the calling page's `try`/`catch` can surface it. `createEvent`/`endActiveEvent`/`updateEventSettings` are deliberately **not** optimistic (await-then-update) — those are the cases where showing success before it's confirmed would be actively wrong (e.g. navigating into an event that turns out not to have been created).

**Access control is Row Level Security, not application code.** No query in `lib/supabase/*.ts` filters by `user_id` client-side — every read/write relies entirely on Postgres itself only returning/allowing rows the signed-in user has access to, via policies anchored on `event_members`, routed through a `security definer` helper function (`is_event_member()`) to avoid a self-referential recursion bug — see § 7's "A real RLS bug worth understanding."

See `lib/types.ts` for the full shape of `PopupEvent`, `Order`, `MenuItem`, etc.

---

## 5. Every Feature Completed

### Accounts & navigation
- **Landing page** (`LandingScreen.tsx`) is the first thing a fresh/logged-out visitor sees — the real brand-mark image (`public/sencha-logo.png`, the full icon+wordmark+tagline lockup), a blurb, and a "Get started" button into sign-in. A **returning signed-in visitor skips it entirely**: `AppStateContext`'s bootstrap effect checks for a saved session before deciding whether the initial view is `'landing'` or straight to `'home'`, so the pitch page never gets in a returning user's way.
- **Real email/password accounts**, via Supabase Auth — session persistence, an immediate session on sign-up (email confirmation is off, see § 4/`DECISIONS.md`), and sign-out that actually invalidates the session, not just a local flag.
- Home screen listing every pop-up event the signed-in user **owns or has been invited to** (active + ended), sorted newest-first, each showing income and order count.
- "+ New pop-up event" → setup flow → active event view.
- Back navigation from an active event to Home without ending it.
- "End Event" (with confirmation) marks an event ended and returns to Home.

### Collaboration & real-time sync
- **Invite teammates by email**, from two places: an optional 4th "Invite your team" page on the Setup wizard when creating a brand-new event, and a "Team" section in the active event's ⚙ Settings modal (member list with an Owner/Staff tag, plus an add-by-email field) for events already underway. Every invited address is checked against registered Sencha accounts before being added, so a bad email can't leave a half-created event behind.
- **Shared, equal access** — an invited member gets full read/write on that event's orders, inventory, and settings; this is not a tiered permission system. The one owner-only action is inviting/removing members.
- **Live order sync** — any order a teammate adds, edits, completes, or deletes appears on every other connected client (another phone on the same stand, or the same user on two devices/tabs) within moments, no refresh needed, via Supabase Realtime.
- **A fresh invite shows up on Home immediately.** Being added to an event's roster (from Settings, on an event that already exists — not just at creation) triggers a live re-fetch of the invited person's events + orders, via a Realtime subscription on `event_members`. Before this, `events` was only ever fetched once at sign-in, so a mid-event invite silently didn't appear on the invited person's Home screen until their next sign-in — notifications about that event's orders worked fine regardless, since those don't depend on the event being in local state at all.
- **In-app notifications** — a bell icon (`NotificationBell`, shown on Home and an active event's top bar) with an unread badge lists recent activity across every event you belong to ("Jamie added an order in Saturday Market"); new activity also surfaces as a brief auto-dismissing toast (`ToastHost`) regardless of which screen you're on. Notifications are created entirely server-side by a database trigger, so no client code path can fail to notify teammates.

### Event setup
Setup is a **wizard** (`components/SetupScreen.tsx`), navigated only via explicit **"Continue →" / "← Back"** buttons or the tappable step dots — there is no swipe-to-advance gesture; page transitions animate (CSS slide) but are always button-triggered, never triggered by a drag gesture, so nothing advances by accident.
- **Page 1 — Event details**: event name, date, and separate start/end time (two `type="time"` inputs).
- **Page 2 — Build your menu**: four independent add/remove row lists — **Drinks** (name + required price), **Syrup** (name + optional price/upcharge), **Milk** (name + optional price/upcharge), **Additional items** (name + required price, replaces the old fixed bread/cookie "add-ons" concept — any product name is allowed now). A **"💾 Save this menu for next time"** button persists the current Drinks/Syrup/Milk/Additional-items selections as a reusable template (see § 7), which auto-prefills the next new event's setup.
- **Page 3 — Starting inventory**: one row per item from the Drinks + Additional items lists (syrup/milk are order customizations, not separately stocked, so they're excluded here), each labeled with a **Drink**/**Item** tag; at least one drink or item is required to reach a non-empty page 3, enforced (with a friendly redirect back to page 2) at final submission rather than blocking navigation mid-wizard.
- **Page 4 — Invite your team** (optional): add teammate emails while creating a brand-new event, not just afterward. Empty rows are silently dropped; event creation proceeds normally with no invites if this page is left blank.

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
- Deleting an order (🗑) removes it immediately (no confirmation currently — see § 11 known gaps).
- **In-flight protection**: while a toggle/delete for a specific order is still in flight against Supabase, that order's own checkbox/delete button disables (`busy` state) so a slow connection can't double-fire the same mutation.
- **Optional customer pickup text**: a phone number field under name/table in `OrderPanel.tsx`. If set, checking that order off prompts staff (via `confirm()`) to text the customer; confirming opens an `sms:` link in the browser's native Messages app, pre-filled with a pickup-ready message, one tap from sending. Not an automated/API-backed send — see `DECISIONS.md` and `CHANGELOG.md` V12 for why, and § 7 for the schema change.

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
- ⚙ Settings modal (from the active event's top bar) lets you edit event name, date/time, team membership (see "Collaboration" above), starting inventory counts, and — as of V12.1 — the menu itself: add, rename, reprice, or remove Drinks/Syrup/Milk/Additional items after the event has started, same row-editor UX as the setup wizard's menu page. Removing or repricing an item never changes how it displays on orders already placed (line items denormalize their own name/price at order time).
- "End Event" (red button, top bar) confirms, marks the event `ended`, and returns to Home.
- Ended events become **read-only**: a dedicated Summary screen (`SummaryScreen.tsx`) presents the event as a **receipt** — itemized line items with dotted leaders, a total, order-completion counts, top syrup/milk, a decorative barcode (`icons/Barcode.tsx`, deterministic per event id, not a real scannable symbology), final inventory (via the same cute icons/progress bars), and every order as a non-interactive ticket below. An **"🖨️ Export as PDF"** button triggers the browser's native print dialog against a dedicated print stylesheet that hides app chrome and shows just the receipt + inventory — "Save as PDF" from that dialog is the export path (no PDF-generation library was added; see `DECISIONS.md`).

### Home screen — event archive
- Each saved event renders as a **file folder** (`event-folder` — a two-tone back/front card with a peeking tab, real shading and a lifted drop shadow) rather than a plain list card. Ended events show a "Tap to view receipt →" hint, since opening one retrieves the receipt-style summary above.

### Visual design
- Matcha-green earthy palette (see `DESIGN.md` for exact tokens), extended with `--danger-light` (a soft pink-red tint of `--danger`) for the "low stock" progress-bar state.
- Handwritten heading font (Patrick Hand) + clean rounded body font (Quicksand) + a thin serif (Cormorant Garamond) scoped to the brand wordmark only.
- Subtle paper-grain texture overlay on the whole app background, plus a warmer, more visible kraft-paper grain (same turbulence-filter technique, tinted and boosted) on the three "paper surface" components: the order sheet, the live summary postcard, and the receipt.
- Each top-level screen has its own soft matcha gradient background (cream → pale) rather than sitting flush against the app's flat background color.
- Translucent, blurred bottom navigation bar with a clearer active-tab indicator (a pale pill behind the active tab's icon).
- "Juicy" 3D button press on every primary action (a bottom-rim shadow that flattens on `:active`) and a branded, pulsing `LoadingScreen` in place of a blank flash during the initial session/data bootstrap.
- Sign-out as a pill-shaped button with a small icon rather than a bare icon tile.

---

## 6. Every Planned Feature (not yet built)

See `ROADMAP.md` for the prioritized, numbered version of this list. Summary:

- ~~Real backend + database (multi-device sync, real authentication, multi-user collaboration)~~ — **done**, see § 4/§ 5 and `CHANGELOG.md` V11–V11.4.
- ~~Editing the menu/add-ons/syrup list after an event has started~~ — **done**, see § 5 "Settings & lifecycle" and `CHANGELOG.md` V12.1.
- Ingredient-cost input for true profit margin (currently revenue-only).
- Duplicating/"templating" a past event to reuse a menu + prices for a recurring market.
- Password reset UI — Supabase Auth supports recovery natively now that accounts are real, but no "forgot password" flow has been built in the app yet.
- Reordering/duplicating a line item within the order panel.
- Delete confirmation on orders (currently instant, no undo).
- Automated tests — unit tests for `lib/calculations.ts` and e2e smoke coverage, still nothing beyond manual verification (`tsc`, production build, click-through).

---

## 7. Database Schema

The database is real now — hosted Postgres on Supabase, reached from the browser via PostgREST. `lib/types.ts` is still the shape every component and `AppStateContext` speak in (`PopupEvent`, `Order`, `MenuItem`, etc. — unchanged by the migration); it's just populated from Postgres via `lib/supabase/*.ts` now, not read directly out of `localStorage`.

```ts
type MenuItemType = 'drink' | 'item'; // 'drink' gets syrup/milk customization; 'item' doesn't

interface MenuItem { id: string; name: string; price: number; type: MenuItemType; }

interface FlavorOption { id: string; name: string; price: number; } // shared shape for syrup + milk

interface PopupEvent {
  id: string;
  eventName: string; eventDate: string; startTime: string; endTime: string;
  inventory: Record<string, number>; // menuItem.id -> starting count
  menu: MenuItem[]; syrups: FlavorOption[]; milks: FlavorOption[];
  orders: Order[];
  status: 'active' | 'ended';
  createdAt: number; endedAt: number | null;
}

interface Order { id: string; items: OrderLineItem[]; note: string; done: boolean; ts: number; }

interface OrderLineItem {
  itemId: string; itemName: string; price: number; qty: number; // price denormalized at order time
  syrupId?: string; syrupName?: string; syrupPrice?: number;
  milkId?: string; milkName?: string; milkPrice?: number;
}

interface MenuTemplate { menu: MenuItem[]; syrups: FlavorOption[]; milks: FlavorOption[]; }
```

### The real, deployed database shape

**A note on `supabase/schema.sql`:** that file is labeled a "proposal" in its own header and was the *first* design pass — a full collaborative schema sketched before any of it was actually built (`owner_id`, real Postgres `date`/`time` columns, `customer_note`/`status` naming). **It was never deployed as-is.** What's actually live was built incrementally across seven migration files, and the shape drifted from the proposal along the way — documented honestly in each file's own header comments. If you're debugging against the live database, trust these files (and the row interfaces in `lib/supabase/*.ts`) over `schema.sql`, in this order:

1. **`orders_phase.sql`** — `orders` + `order_items` only. `event_id` is plain `text` (no FK yet — `events` didn't exist in Postgres at this point). Column names mirror `lib/types.ts` exactly (`note`, `done`, `ts`, `itemId`...) for a direct 1:1 client mapping. RLS: single-owner (`user_id = auth.uid()`).
2. **`inventory_events_phase.sql`** — `events`, `menu_items`, `inventory`, `flavor_options` (syrups + milks share one table via a `kind` discriminator). `events.user_id`, not `owner_id` as the proposal had it; `event_date`/`start_time`/`end_time` are `text`, not Postgres date/time types, since the app already treats them as opaque strings everywhere. Still single-owner RLS. **Known loose end:** `orders.event_id` still has no FK to `events.id` — left that way deliberately rather than risk a destructive migration against real data (see § 11 #8).
3. **`collaboration_phase.sql`** — adds `users` (a queryable profile mirror of Supabase's own `auth.users`) and `event_members` (`event_id`, `user_id`, `role`), then **rewrites every earlier table's RLS** from single-owner to "any member of `event_members` for this event" — the model the original proposal described, now actually adopted, with a backfill so existing owners weren't locked out the moment it ran. **Shipped with the self-referential recursion bug fixed in #6 below** — the file is left as an accurate historical record and annotated to point at the fix, not rewritten.
4. **`notifications_phase.sql`** — adds `notifications`, populated only by a `security definer` trigger on `orders` (never inserted by client code).
5. **`realtime_phase.sql`** — adds `orders` to the Realtime publication.
6. **`fix_event_members_recursion.sql`** — fixes a real production bug (see below); introduces `is_event_member()`, now the standard way every policy checks membership.
7. **`rls_hardening_phase.sql`** — an audit pass on top of the (buggy, at the time) collaborative policies: makes `to authenticated` and `revoke ... from anon` explicit everywhere. Also carried the recursion bug forward unchanged (fixed in #6); its `notifications` change was partially reverted by `undo_rls_hardening_phase.sql` — committed, but not confirmed run against the live database, see § 11 #10.
8. **`customer_sms_phase.sql`** — adds a nullable `orders.customer_phone`. No RLS change (the existing membership policy already covers every column), no trigger, no third-party API — see § 5 "Optional customer pickup text" and `CHANGELOG.md` V12 for why this one deliberately isn't server-driven like everything else in this list.
9. **`realtime_event_members_phase.sql`** — adds `event_members` to the Realtime publication, so a client can subscribe to "was I just added to an event's roster?" — see the fix below and `CHANGELOG.md` V12.2.

The live shape, in short:
```
public.users            id (= auth.users.id), email
public.events           id, user_id, event_name, event_date, start_time, end_time, status, created_at, ended_at
public.event_members    event_id, user_id, role ('owner' | 'staff')   -- the RLS anchor for every table below
public.menu_items       id, event_id, name, price, type, sort_order
public.inventory        menu_item_id (PK, FK), starting_count
public.flavor_options   id, event_id, kind ('syrup' | 'milk'), name, price, sort_order
public.orders           id, event_id (text, no FK yet), user_id, note, done, ts, created_at, customer_phone
public.order_items      id, order_id, item_id, item_name, price, qty, syrup_*, milk_*   -- name/price snapshotted
public.notifications    id, user_id, event_id, type, payload (jsonb), is_read, created_at   -- insert-only via trigger
```

`item_name`/`price` (and the syrup/milk name+price) are denormalized onto `order_items` intentionally — if a menu item's price changes mid-event, past orders should keep showing what the customer actually paid. Every Postgres `numeric` column comes back from PostgREST as a JSON **string**, not a number — every price field is explicitly `Number()`-coerced in `lib/supabase/events.ts`/`orders.ts`; this was a real bug once, not just a theoretical gotcha (see `CHANGELOG.md` V11).

**Row Level Security is the entire permission system** — there is no separate application-layer authorization check anywhere in the codebase. Every policy reduces to one shape: "does a row exist in `event_members` for (this event, `auth.uid()`)?" `rls_hardening_phase.sql` also revokes all table privileges from the `anon` role explicitly, so unauthenticated requests are blocked outright, not just implicitly.

**A real RLS bug worth understanding, not just fixing.** `event_members`'s own membership-check policy originally queried `event_members` *from within a policy on `event_members`* — evaluating that subquery re-applies the same policy, which needs to evaluate the subquery again, forever (Postgres error `42P17`, infinite recursion). Because six other tables all check membership by querying `event_members` from their own policies, this one self-referential policy broke nearly the entire schema, not just the roster view. The fix, in `fix_event_members_recursion.sql`, is the standard pattern for self-referential RLS: a `security definer` function (`is_event_member(event_id, user_id)`) that queries `event_members` directly. `security definer` functions run as their owner, and table owners bypass RLS by default, so the function's internal query never re-triggers the policy that called it — breaking the cycle. Every membership check in the schema now goes through this function instead of repeating its own inline subquery, specifically so this class of bug can't quietly reappear in one call site without every other one being re-audited by hand. Worth remembering as a general rule: **a table's own RLS policy should never query that same table**, directly or indirectly — route through a `security definer` function instead.

**A second RLS bug, easy to mistake for the first one: `RETURNING` races a trigger.** A brand-new account's very first "Start selling" kept failing with the same-looking `42501 new row violates row-level security policy for table "events"`, even after the recursion fix above — but this was never a policy-logic bug. `createEventRemote()` chained `.select().single()` onto the `events` insert, which requests the row back via `RETURNING`; Postgres re-checks a `RETURNING` row against the table's own SELECT policy (`is_event_member(id, auth.uid())`), which only becomes true once `handle_new_event()`'s `AFTER INSERT` trigger adds the matching `event_members` row — a race the check could lose. The fix (`lib/supabase/events.ts`) generates the event's id client-side and drops `.select()` from that one insert, so nothing needs to come back from it at all. See `DECISIONS.md` for the full writeup and `CHANGELOG.md` V12.4. Worth remembering as its own general rule, distinct from the one above: **don't request a row back via `RETURNING`/`.select()` if a same-transaction trigger is what makes that row visible to its own policy** — query it separately, after the trigger has definitely run, or avoid needing it back at all.

Storage keys still in use in `localStorage` (everything else has moved to Postgres — see above):
| Key | Contents |
|---|---|
| `menuTemplate:<email>` | `MenuTemplate` — the most recently saved reusable menu for that user |

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
| `AppShell` | Top-level view switcher (landing/auth/home/setup/main/summary) based on context `view`; also mounts `ToastHost` and shows `LoadingScreen` during bootstrap |
| `LandingScreen` | First screen for a logged-out visitor: brand mark, wordmark, tagline, "Get started" CTA into `AuthScreen` |
| `AuthScreen` | Sign in / sign up form, backed by real Supabase Auth |
| `HomeScreen` | Event list (owned + invited) + "New pop-up event" entry point + `NotificationBell` |
| `SetupScreen` | 4-page new-event wizard (details → menu → inventory → invite team), button/dot navigation only, no swipe |
| `MainScreen` | Active event shell: top bar (income, `NotificationBell`, settings, end event), bottom nav (Orders/Inventory/Summary), hosts the three tab pages |
| `OrdersPage` | Add-order button, incomplete/completed lists, order count pill, per-order busy state during in-flight mutations |
| `InventoryPage` | One depleting-icon + progress-bar card per menu item (drink or additional item) |
| `SummaryPage` | Live, in-progress "postcard" tab — income/orders/avg/pending stats, top sellers, favorite syrup/milk |
| `SummaryScreen` | Read-only, receipt-styled view for an ended event, with a barcode and a PDF export button |
| `OrderPanel` | New/edit order form styled as a handwritten order sheet: note field, draft item list, "+ Add item," stock warning, confirm |
| `ItemPickerModal` | Modal for choosing a menu item + configuring syrup/milk + quantity |
| `TicketCard` | The receipt-style order card, used in both `OrdersPage` and `SummaryScreen` (via a `readonly` prop) |
| `SettingsModal` | Edit event name/date/team membership/inventory/**menu** after setup |
| `NotificationBell` | Unread-count badge + dropdown over live in-app notifications |
| `ToastHost` | Auto-dismissing, stacking toast queue for live notifications, mounted once in `AppShell` |
| `LoadingScreen` | Branded pulsing icon shown during the initial session/data bootstrap (respects `prefers-reduced-motion`) |
| `Burst` | Imperative sparkle/confetti particle effect (not a rendered component — a DOM utility function) |
| `icons/MatchaDrinkIcon` | Cute matcha cup (straw, face, liquid level) for menu items of type `drink` |
| `icons/CookieIcon` | Cute chip cookie (face, growing bite mark) for menu items of type `item` |
| `icons/Barcode` | Decorative barcode, deterministic bars from a seed string (the event id) — not a real scannable symbology |
| *(brand mark)* | Not a component — `public/sencha-logo.png` (full lockup, landing page) and `public/sencha-icon.png` (icon-only, auth screen) are real image assets cropped from the user-supplied source PNG. `app/icon.png`/`app/apple-icon.png` are a separately-exported *opaque* crop for the favicon/iOS home-screen icon — see `DECISIONS.md` for why that one can't just reuse the transparent in-app version. |

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

## 11. Known Bugs / Gaps

Nothing here is *currently* a confirmed broken-behavior bug in production — three real ones have hit production and been fixed (the RLS recursion bug, § 7; the `RETURNING`/RLS race on event creation, § 7 and #12 below; and the leftover diagnostic policy, #11 below). Everything else here is a known rough edge or tracked loose end, not a live bug:

1. **No in-app password reset flow.** Supabase Auth supports password recovery natively now that accounts are real (see § 4), but no "forgot password" UI has been built to trigger it yet — a forgotten password still has no recovery path from inside the app today.
2. ~~`localStorage` is per-browser, per-device.~~ **Resolved for accounts, events, and orders** — all three now live in Postgres and sync across devices/browsers via Supabase Auth + Realtime (`CHANGELOG.md` V11). The one thing still local-only is the reusable **menu template**, a low-stakes convenience feature, not core data.
3. **No delete confirmation on orders.** Tapping 🗑 removes an order immediately, no undo.
4. ~~Menu/add-ons/syrups are locked at setup.~~ **Resolved (V12.1).** `SettingsModal` now has a full add/rename/reprice/remove editor for the menu, syrup, and milk lists, in addition to team membership, inventory counts, and event name/date.
5. ~~Auth is not secure.~~ **Resolved.** Real Supabase Auth (hashed passwords, real sessions) replaced the plaintext `localStorage` password map in V11. Data access for everything else now runs through Postgres Row Level Security (§ 7), not any application-level check. (V11 shipped with email confirmation on; it was later turned off — see § 4 and `DECISIONS.md`. Doesn't affect this item, which is about password storage, not confirmation.)
6. **No automated tests exist yet.** Manual verification (`tsc --noEmit`, production build, click-through) is the only validation method used so far. Notably, the live collaboration/Realtime/notifications flows (V11.1–V11.2) were verified structurally but **not yet confirmed against two real signed-in accounts** — every attempt so far hit Supabase's signup rate limit before that could be tested live. That specific blocker should no longer apply: email confirmation is now off (§ 4/`DECISIONS.md`), so signing up no longer sends an email at all, and the rate limit was on confirmation emails specifically. Still worth two real accounts + two browser tabs on a shared event as a first manual check, now that it should actually be possible.
7. **`supabase/schema.sql` doesn't match the deployed schema.** It's an early design proposal, superseded piecemeal by the phase files — see § 7 for the real shape and the divergences (column names, when RLS switched to the collaborative model). Don't use it as a reference for the live database.
8. **`orders.event_id` has no foreign key to `events.id`.** A known, deliberate loose end from the Orders→Events migration order (see § 7, `inventory_events_phase.sql`'s header comment) — tightening it needs either a data cleanup or a backfill that wasn't safe to attempt blind.
9. ~~Live temporary debug code, not yet removed.~~ **Resolved (`CHANGELOG.md` V12.4).** `debugWhoAmI()` and its call site in `SetupScreen.tsx` are gone. One loose end still in the *database* (not the codebase): the `debug_whoami()` Postgres function itself was never dropped — harmless, unused, safe to remove whenever convenient (`drop function if exists public.debug_whoami();`).
10. **An RLS hardening revert is committed but not confirmed run.** `supabase/undo_rls_hardening_phase.sql` reverts `rls_hardening_phase.sql`'s change to the `notifications` table specifically (removing the explicit `to authenticated`) — its header explains why every other table it touched doesn't need reverting (superseded by the recursion fix, or byte-identical to an earlier policy). The file is in the repo; whether it's actually been run against the live database hasn't been confirmed.
11. **A leftover diagnostic policy briefly broke collaborative visibility entirely, now fixed.** While isolating the bug in #12 below, `events`' RLS policy was temporarily simplified to owner-only (`user_id = auth.uid()`) and not restored afterward — silently breaking every invited teammate's access to shared events (and, for events missing their own backfill row, even some owners' access to their own events) until caught and fixed (`CHANGELOG.md` V12.3). Resolved, but worth internalizing the lesson: a policy swapped in to isolate a bug needs an explicit, tracked revert step, not an implicit "put it back later."
12. ~~`42501` on a fresh account's first event creation.~~ **Resolved (`CHANGELOG.md` V12.4).** Not a policy bug — `createEventRemote()`'s `.select()` on the `events` insert raced the `handle_new_event()` trigger via `RETURNING`'s own RLS check. Fixed by generating the id client-side and dropping `.select()` from that insert. See § 7's "A second RLS bug" paragraph for the full mechanism. **Not yet confirmed against a live, uncached test** — the fix is deployed and type-checked, but the last live report was inconclusive (turned out to be a stale cached page, not a fresh test of the new code).

---

## 12. Remaining TODOs (this handoff)

- [x] Run `npm install` and `npm run dev`; click through every screen against the feature list in § 5 — done, see `CHANGELOG.md` V6.1.
- [x] Decide on a real backend — **Supabase**, see `CHANGELOG.md` V11 and `DECISIONS.md`.
- [x] Migrate auth and event/order persistence off `localStorage` — see `CHANGELOG.md` V11.
- [x] Fix the `event_members` RLS infinite-recursion bug — see `CHANGELOG.md` V11.4.
- [x] Find and fix the actual cause of the event-creation `42501` (a `RETURNING`/RLS race, not a policy bug) — see `CHANGELOG.md` V12.4. Live, uncached verification still pending — see § 11 #12.
- [x] Remove the live `TEMPORARY DEBUG` code (§ 11 #9) now that the bug it was diagnosing is fixed. (The `debug_whoami()` database function itself is still a harmless leftover — safe to drop whenever convenient.)
- [ ] Confirm `supabase/undo_rls_hardening_phase.sql` (committed) has actually been run against the live database (§ 11 #10).
- [ ] Verify the collaboration/Realtime/notifications flows against two real signed-in accounts — should no longer be blocked by the signup rate limit now that email confirmation is off (§ 11 #6).
- [ ] Add automated tests (unit tests for `lib/calculations.ts` at minimum — they're pure functions and cheap to test).
- [ ] Decide whether to introduce Tailwind/a component library, or continue with plain CSS (see `DECISIONS.md`).
- [ ] Add basic e2e smoke coverage (Playwright is already available in this environment's global tooling) for the core loop: sign up → create event → add order → complete order → check income/inventory → end event → view summary — now also worth covering invite-teammate + live sync.
- [ ] Reconcile `supabase/schema.sql` with the deployed phase-file schema (§ 7), or delete it in favor of the phase files as the source of truth, so it stops reading as current.
- [ ] Add a foreign key from `orders.event_id` to `events.id` (§ 11 #8) once existing data is confirmed clean.

---

## 13. Important Implementation Decisions

Full reasoning in `DECISIONS.md`. Headlines:
- **`storage.ts` was the seam, and it got used.** The local-first `localStorage` persistence was always meant to be swappable; V11 replaced accounts/events/orders with real Supabase-backed persistence with minimal change to component code, exactly as designed. Only the reusable menu template still goes through `storage.ts`.
- **Supabase over a hand-rolled Postgres+Prisma backend** — bundles Postgres, Auth, and Realtime behind one client library, with Row Level Security replacing what would otherwise be a hand-written authorization layer. See `DECISIONS.md`.
- **Row Level Security is the *entire* access-control system** — no query in `lib/supabase/*.ts` filters by `user_id`/`event_id` client-side; every read/write relies on Postgres itself only returning/allowing rows the signed-in user has access to. See § 7.
- **A table's RLS policy must never query that same table** — the standard workaround is a `security definer` function (`is_event_member()`), since such functions run as their owner and bypass RLS, breaking the self-referential cycle that caused the V11.4 recursion bug. See § 7.
- **Don't request a `RETURNING` row if a same-transaction trigger is what makes it visible to its own policy** — `createEventRemote()` no longer chains `.select()` onto the `events` insert, since that raced `handle_new_event()`'s trigger and caused a real `42501` on a fresh account's first event. See § 7 and `CHANGELOG.md` V12.4.
- **Order mutations are optimistic; event mutations are not** — `addOrder`/`editOrder`/`toggleOrderDone`/`deleteOrder` update local state before the network write and roll back on failure; `createEvent`/`endActiveEvent`/`updateEventSettings` deliberately await the write first. See `AppStateContext.tsx`'s own comments and § 4.
- **Postgres `numeric` columns come back from PostgREST as strings, not numbers** — every price field read off a Supabase row is explicitly `Number()`-coerced in `lib/supabase/events.ts`/`orders.ts`. Skipping this turns price math into string concatenation; it's happened once already (`CHANGELOG.md` V11). Keep this in mind when adding a new numeric column.
- **Superseded migrations stay as an unedited historical record** — when a bug is found in an already-run `.sql` file (e.g. the V11.4 recursion bug), the fix ships as a new file, and the old file gets an annotation pointing at it rather than being rewritten. Don't "clean up" old migration files to match current behavior; they're a log of what actually ran, not living documentation.
- **Plain CSS over Tailwind for this first port** — minimize conversion risk while preserving the design exactly; Tailwind (or another system) can be layered in later as a separate, deliberate task.
- **React Context instead of Redux/Zustand/etc.** — app-wide state is a single small tree (one signed-in user, their events, live orders/notifications); a context + a handful of `useState` calls is sufficient and keeps the dependency list minimal.
- **`totalProfit`/"Income" naming split** — internal function/variable names still say "profit" (continuity with the original codebase and its calculation, which is revenue-only); all **user-facing** text says "Income" per the latest product decision. Don't rename the internal function without checking `ROADMAP.md` (true profit/cost tracking), which will likely want both a revenue figure and a margin figure side by side.
- **Inventory decremented by pending + completed orders**, not completed-only — prevents a stand from overselling stock that's already spoken for by an in-progress order.

---

## 14. Recommended Folder Structure

This is what's in place now, and the intended shape going forward:

```
sencha_app/
├── CLAUDE.md              ← you are here
├── CHANGELOG.md           ← full version history, prototype through this port
├── ROADMAP.md             ← prioritized next tasks + longer-term ideas
├── DECISIONS.md           ← architecture/product decisions log
├── DESIGN.md              ← palette, type, component patterns, UX principles
├── package.json
├── tsconfig.json
├── next.config.mjs
├── middleware.ts           # refreshes the Supabase session cookie per-request
├── app/
│   ├── layout.tsx          # root layout, imports globals.css
│   ├── page.tsx            # mounts AppStateProvider + AppShell
│   └── globals.css         # full design system (ported from the prototype)
├── components/
│   ├── AppShell.tsx
│   ├── LandingScreen.tsx
│   ├── AuthScreen.tsx
│   ├── HomeScreen.tsx
│   ├── SetupScreen.tsx
│   ├── MainScreen.tsx
│   ├── OrdersPage.tsx
│   ├── InventoryPage.tsx
│   ├── SummaryPage.tsx
│   ├── SummaryScreen.tsx
│   ├── OrderPanel.tsx
│   ├── ItemPickerModal.tsx
│   ├── TicketCard.tsx
│   ├── SettingsModal.tsx
│   ├── NotificationBell.tsx
│   ├── ToastHost.tsx
│   ├── LoadingScreen.tsx
│   ├── Burst.tsx
│   └── icons/
│       ├── MatchaDrinkIcon.tsx
│       ├── CookieIcon.tsx
│       └── Barcode.tsx
├── context/
│   └── AppStateContext.tsx # all app state + actions, Supabase-backed
├── lib/
│   ├── types.ts             # PopupEvent, Order, MenuItem, etc.
│   ├── constants.ts          # localStorage key helpers
│   ├── calculations.ts       # pure business logic (see § 10)
│   ├── storage.ts             # localStorage wrapper (now just the menu template)
│   ├── id.ts                  # uid() generator (temp/optimistic ids only)
│   ├── sms.ts                  # builds the sms: link for the pickup-ready text
│   └── supabase/
│       ├── client.ts          # browser Supabase client
│       ├── server.ts          # server-component Supabase client
│       ├── middleware.ts      # session-refresh Supabase client
│       ├── events.ts          # events/menu_items/inventory/flavor_options <-> PopupEvent
│       ├── orders.ts          # orders/order_items <-> Order, + realtime subscription
│       ├── members.ts         # users/event_members — invites, roster
│       └── notifications.ts   # notifications — read/mark-read/subscribe only
└── supabase/
    ├── schema.sql                        # early design proposal — NOT what's deployed, see § 7
    ├── orders_phase.sql
    ├── inventory_events_phase.sql
    ├── collaboration_phase.sql            # shipped with the recursion bug — see fix file
    ├── notifications_phase.sql
    ├── realtime_phase.sql
    ├── fix_event_members_recursion.sql    # fixes the RLS recursion bug — see § 7
    ├── rls_hardening_phase.sql
    ├── undo_rls_hardening_phase.sql       # committed, run-status unconfirmed — see § 11 #10
    ├── realtime_event_members_phase.sql   # event_members realtime — see § 7/§ 5 "Collaboration"
    └── customer_sms_phase.sql             # orders.customer_phone — see § 5/§ 7
```

**As the app grows**, the recommended next structural moves (see `ROADMAP.md` for when):
- Split `app/` into real routes once there's a reason to (e.g. `/events/[id]`, `/events/[id]/summary`) instead of one client-side view switcher, so URLs can be shared/bookmarked.
- Reconcile `supabase/schema.sql` with the deployed phase files, or remove it (§ 11 #7).
- Add a `__tests__/` (or colocated `*.test.ts`) convention once automated tests start.

---

## 15. Prioritized Roadmap

See `ROADMAP.md` for the full list with rationale. Top of the list, in order:
1. ~~Verify the Next.js port~~ — done, `CHANGELOG.md` V6.1.
2. Add unit tests for `lib/calculations.ts`.
3. ~~Decide + build a real backend (auth + database)~~ — done: Supabase. See `CHANGELOG.md` V11.
4. ~~Migrate auth to the real backend~~ — done, `CHANGELOG.md` V11.
5. ~~Migrate events/orders persistence to the real backend~~ — done, `CHANGELOG.md` V11.
6. Add a "delete order" confirmation.
7. ~~Allow menu/add-on/syrup edits mid-event.~~ — done, `CHANGELOG.md` V12.1.
8. Add ingredient-cost input + true profit/margin display alongside Income.
9. Add "duplicate event as template" from Home.
10. ~~Add export/share of a past event summary~~ — done (V8, PDF export via the browser's print dialog).

(continues — see `ROADMAP.md`, whose "Multi-user / shared-stand support" item is also now done: `CHANGELOG.md` V11.1–V11.2. `ROADMAP.md` also tracks newer, post-V11 follow-ups: confirming `undo_rls_hardening_phase.sql` was actually run, reconciling `supabase/schema.sql`, adding the `orders.event_id` foreign key, and verifying the collaboration flows against real accounts now that the signup rate limit shouldn't block it anymore.)
