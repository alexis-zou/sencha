# DECISIONS.md — Architecture & Product Decisions

A running log of consequential decisions, why they were made, and what would trigger revisiting them. Organized roughly newest-first within each section. For a chronological version-by-version history, see `CHANGELOG.md`.

---

## Product decisions

### Two separate icon files, opaque vs. transparent — not one asset reused everywhere (V9.1)
**Decision:** `public/sencha-icon.png` (transparent background, used inside the app UI on the auth screen) and `app/icon.png`/`app/apple-icon.png` (fully opaque, no alpha channel at all, used for the favicon and iOS home-screen icon) are **deliberately different exports** of the same crop, not the same file referenced twice.
**Why:** iOS renders transparent PNG regions as solid black on the home screen rather than showing the wallpaper through — a real, easy-to-hit gotcha, not a hypothetical one, since the transparent icon had already been built for in-app use before this was caught. In-app, transparency is correct (the icon needs to blend into the app's own gradient background). For the home-screen/favicon context, transparency is actively wrong.
**Consequence:** if the logo artwork ever changes, **both** exports need regenerating from the source — updating only `public/sencha-icon.png` (the one visible in normal day-to-day UI work) and forgetting `app/apple-icon.png` would silently reintroduce the black-icon bug next time someone adds this to their home screen. Verify opacity (`PIL: img.mode == 'RGB'`, not `'RGBA'`) on the icon files specifically, not just the in-app image, after any regeneration.
**Revisit when:** if a build step is ever added to this project (currently there isn't one beyond `next build`), generating both variants from one master file via a script would remove the "two files to keep in sync" risk entirely.

### App renamed "Matcha Stand" → "Sencha"; new brand mark recreated as SVG, not embedded as an image file (V9)
**Superseded in V9.1:** the user supplied the actual source PNG afterward (`sencha_logo.png`), and asked for it used exactly, not reinterpreted — see the V9.1 entry below. `icons/SenchaLogo.tsx` was deleted. The reasoning below (no raster assets in the project) explains why SVG was the *first* attempt, not why it stayed — kept here for that context, not as current practice.
**Decision:** All user-facing product name text became "Sencha." The reference logo the user supplied (a shaded/painted raster illustration of a matcha bowl + whisk + cute face) was **redrawn as hand-coded SVG line art** (`icons/SenchaLogo.tsx`) rather than saved and embedded as an image asset.
**Why:** This project has zero raster image assets anywhere — every icon (`MatchaDrinkIcon`, `CookieIcon`, `Barcode`, the old leaf-mark) is hand-drawn SVG using the app's own palette variables, so it re-themes for free and stays crisp at any size with no extra network request. Recreating the new logo the same way keeps that pattern intact instead of introducing the app's first exception. Practically, this session also has no mechanism to extract and save the exact pixels of an image pasted into chat as a project file — SVG recreation was the available path, not just the preferred one.
**Consequence:** the new mark is a faithful *interpretation* of the reference (same composition: bowl, whisk, face, leaf) in the app's existing monoline style, not a pixel-identical reproduction of the shaded/painted original.
**Revisit when:** if a pixel-exact reproduction of a designed logo file ever matters (e.g. for external marketing use outside this app), that calls for actually importing the source file (Figma/Illustrator export) as a proper asset — a materially different task from "add an icon," and should be scoped as such.

### Landing page shown only to logged-out visitors, gated by the existing session check (V9)
**Decision:** `ViewName` gained `'landing'` as the new first-run screen, but `AppStateContext`'s bootstrap effect resolves straight to `'home'` (skipping landing) whenever a saved session already exists — the same check that already decided `'auth'` vs `'home'` before this change.
**Why:** A landing/pitch page is for first impressions; a returning user who's already signed in has already been sold on the app and re-showing marketing copy every time they open it would add friction, working against the app's core "fast, low-friction, under time pressure" principle (`CLAUDE.md` § 2).
**Revisit when:** if the landing page grows real content worth returning users seeing occasionally (e.g. a changelog/what's-new notice), that should be a deliberate, separate mechanism (a dismissible banner, a version-check) — not by routing signed-in users back through the landing view itself.

### Wordmark serif font scoped to the logo only, not adopted as a second UI font (V9)
**Decision:** Cormorant Garamond (new Google Fonts import) is applied only to `.brand-wordmark` — the "sencha" logotype on the landing page. Every actual UI heading in the app still uses Patrick Hand.
**Why:** `DESIGN.md` already has a standing rule against a second display font "for variety." A brand wordmark is conventionally allowed to differ from a product's in-app UI type (most apps' logo font ≠ their body/heading font) — this isn't "variety," it's a distinct logotype, so the existing rule doesn't actually apply to it. Worth stating explicitly so a future pass doesn't either (a) remove the wordmark font thinking it violates the rule, or (b) misread this as license to add more fonts elsewhere.

### Inventory badge replaced by a progress bar with an absolute (not percentage) low-stock threshold (V8)
**Decision:** `badgeClass()` changed from `left <= max(2, start * 0.15)` ("low" at ≤15% of starting stock) to a flat `left < 10`. The floating numeric badge overlaying the icon was also replaced by an actual progress-bar element (`.inv-progress-track`/`.inv-progress-fill`) that fills from green and turns a new, softer `--danger-light` red once low.
**Why:** Explicit user spec ("turns light red when stock is running low <10 remaining"). An absolute threshold is also arguably more useful in practice than a percentage one: 15% of a 200-cup starting stock is 30 cups (plenty of runway), while 15% of a 10-cup stock is ~1.5 (already critical) — a flat "single digits left" cue reads the same regardless of how big the starting batch was.
**Consequence:** `badgeClass()`'s signature dropped its `start` parameter (no longer needed). `--danger-light` (`#D99C8C`) was added to the palette as a lighter tint of the existing `--danger`, following `DESIGN.md`'s "extend the existing family, don't introduce an arbitrary new hue" rule.

### Ice removed as a drink customization (V8)
**Decision:** `ICE_OPTIONS`, `OrderLineItem.ice`, and the Ice `<select>` in `ItemPickerModal` were deleted outright, not just hidden.
**Why:** Explicit user request, no stated reason given — treated as a genuine scope cut, not a temporary hide, since the aesthetic direction for this pass (handwritten order sheet, "correspondence/postcard" feel) leaned toward a shorter, more personal customization flow (Syrup + Milk only).
**Revisit when:** if a future stand specifically needs to track ice preference (e.g. selling in a climate where "no ice" is a common, meaningful request), this would need to be re-added as a full round-trip (type, constant, UI, `customBitsFor`), not just un-hidden — there's no dormant flag left behind.

### Live "Event Summary" tab is per-event and completed-orders-only, not cross-event analytics (V8)
**Decision:** The new `SummaryPage` tab (and `computeEventStats()` powering it) reports on the *single currently active event*, computed only from orders marked `done`. It does not aggregate across multiple events — that's `ROADMAP.md` #16 ("basic analytics/history across events"), a distinct, larger, and still-unbuilt feature.
**Why:** Matches the explicit ask ("a cute postcard-like interface that lays out how much of each item has been sold... at the end of a pop-up sale") — scoped to one pop-up, consistent with how Income already only counts completed orders (a pending order-in-progress hasn't actually sold yet).
**Revisit when:** cross-event history (ROADMAP #16) gets built — it should almost certainly reuse `computeEventStats()` per-event and fold the results together, rather than duplicating the aggregation logic.

### PDF export via the browser's native print dialog, not a PDF-generation library (V8)
**Decision:** `SummaryScreen`'s "Export as PDF" button calls `window.print()` against a dedicated `@media print` stylesheet (hides app chrome, shows just the receipt + inventory), rather than adding `jspdf`/`html2canvas` or similar to generate and download a file directly.
**Why:** Consistent with this project's standing preference to minimize new dependencies (see "Plain CSS, not Tailwind" below, and the mobile port's identical StyleSheet-over-NativeWind choice) — every modern browser's print-to-PDF is a genuinely one-click "Save as PDF" path from the print dialog, at zero new dependency cost.
**Consequence:** the export is not a single silent click — the browser's print dialog appears first, requiring one more user action ("Save as PDF" / "Print"), and print-CSS quirks are a different debugging surface than a JS-driven canvas export.
**Revisit when:** if a genuinely one-click, dialog-free download becomes an explicit requirement (e.g. bulk-exporting many events at once), that's the point to reconsider a library-based approach — don't add one preemptively.

### Barcode on the ended-event receipt is decorative, not a real scannable symbology (V8)
**Decision:** `icons/Barcode.tsx` draws bars using a simple deterministic hash of the event's `id` as a seed — it renders consistently for the same event, but doesn't encode retrievable data and isn't a real barcode format (Code128, EAN, etc.).
**Why:** The reference mood (vintage evidence tags, a stylized shop receipt) called for a barcode as a *visual* cue that "this is a real receipt," not an actual scan-to-retrieve feature — no such lookup flow was requested or exists.
**Revisit when:** if a real "scan this to pull up the event" use case ever comes up, this needs to become a genuine encoding (e.g. of the event id) via a real barcode/QR library — the current implementation would need to be replaced outright, not extended.

### Washi-tape heading accent replaced by per-screen gradients; one paper-texture recipe reused across 3 surfaces (V8)
**Decision:** `.tape-heading` (the rotated sage rectangle behind major headings) was removed everywhere. Each top-level screen now has its own `linear-gradient(cream → pale)` background. Separately, a warmer/more visible variant of the app's existing paper-grain SVG texture (same turbulence-filter technique, tinted toward `--bread`, higher opacity) was applied to three distinct "paper surface" components: the order sheet (`OrderPanel`), the live summary postcard (`SummaryPage`), and the ended-event receipt (`SummaryScreen`).
**Why:** Explicit user direction toward a "down-to-earth... correspondence/postcard from Japan/teabag" feel, and that flat screens shouldn't visually blend into the app's default background. Reusing one texture recipe (rather than three bespoke ones) keeps the three "paper" surfaces reading as a deliberate family rather than three unrelated decorative choices.
**Revisit when:** if a fourth "paper surface" is added later, pull the shared `background-image` data-URI into one CSS custom property instead of copy-pasting the same SVG string a fourth time.

### Inventory generalized to per-menu-item, not a fixed matcha/bread/cookie trio (V7)
**Decision:** `PopupEvent.inventory` changed from a hardcoded `{ matcha, bread, cookie }` shape to `Record<string, number>` keyed by `MenuItem.id`. Every drink and additional item defined at setup gets its own tracked stock count; there is no longer a fixed set of trackable categories.
**Why:** The original 3-category model (`ROADMAP.md`'s long-deferred "support more than 3 inventory categories," open since V2) was a real limitation — a stand selling a fourth product type had nowhere to track it. Generalizing was also a prerequisite for the Setup-wizard redesign requested for V7: page 3 ("Starting inventory") needed to list *whatever* the person just defined on page 2, not a fixed trio.
**Consequence:** `MatchaIcon`/`BiteIcon` (each hardcoded to a specific product shape) were replaced by one generic `StockIcon` (a fill-level cup, tinted by item type) reused for every item — see `CLAUDE.md` § 9. `lib/calculations.ts`'s `usedByCategory`/`remaining(category, ...)` became `usedByItem`/`remaining(itemId, ...)`.
**Revisit when:** never expected to reverse — this is strictly more general than the old model and every current feature (setup, orders, inventory display, summary) already runs on it.

### Syrup and milk became priced, per-event options (V7)
**Decision:** Syrups (previously a free-only `string[]` of flavor names) and milks (previously a hardcoded free `MILK_OPTIONS` constant) are now both `FlavorOption[]` — `{ id, name, price }` — configured per event on the Setup wizard's menu page, same shape for both. Ice stayed a fixed, unpriced list (not part of setup) since it wasn't in scope for this pass.
**Why:** Real matcha stands often upcharge for oat/almond milk or specialty syrups; the old model couldn't represent that. Giving both the same `FlavorOption` shape (rather than two different ad hoc structures) kept `ItemPickerModal` and `lib/calculations.ts` simple — one `lineTotal()` helper folds in `syrupPrice`/`milkPrice` alongside the base item price.
**Consequence:** A bug was caught and fixed during verification: `TicketCard` and `OrderPanel`'s draft-line display were still showing raw `price × qty` (ignoring upcharges), so a line could show "$5" next to an order `Total` of "$6.25." Both now call `lineTotal()`. Watch for this pattern anywhere a line item's price is displayed standalone rather than via `lineTotal`/`orderTotal`/`totalProfit`.
**Revisit when:** if syrup/milk pricing needs to vary by drink (e.g. oat milk costs more in a large size) — not needed yet, flat per-option pricing has been sufficient.

### Setup wizard navigates only by explicit button/dot tap, no swipe gesture (V7)
**Decision:** The 3-page Setup wizard was initially built with a pointer-drag swipe gesture (drag past a threshold to advance/go back), matching the "swipe through like a scrapbook" brief. This was removed in favor of **button-only navigation** ("← Back" / "Continue →" at the bottom, plus tappable step dots) — dragging no longer does anything.
**Why:** User feedback: swipe-to-advance meant the page transition animation could fire from an accidental or exploratory drag, which felt out of the user's control on a form with real data entry. A deliberate tap is a clearer, more predictable trigger — especially important on a setup flow where accidentally jumping pages mid-typing would be disruptive, not just cosmetic.
**Consequence:** Simpler code (no `PointerEvent` drag-state tracking, no rubber-banding math) and, not incidentally, a simpler mobile port later — the planned React Native version of this wizard also uses button-only `Animated` transitions rather than `PanResponder` gesture handling.
**Revisit when:** if a future redesign wants gesture navigation back, treat it as an explicit, separately-considered UX decision — don't silently reintroduce drag-to-advance as a side effect of an unrelated change.

### Revenue-only "Income," not true profit (V1, carried through to today)
**Decision:** Income = price × quantity for completed orders. No ingredient cost is subtracted.
**Why:** Keeps the mental model simple for a first-time user setting up in under 2 minutes — asking someone to estimate cost-per-cup during a rushed setup adds friction for a number most stand owners don't track precisely anyway.
**Revisit when:** Users start asking "how much did I actually make" net of ingredients — see `ROADMAP.md` #8. When this happens, keep both figures visible (gross revenue *and* margin) rather than replacing one with the other — a stand owner cares about both "how much money came in" and "was this worth it."
**User-facing naming:** the calculation is internally still named `totalProfit()` (continuity with the original prototype code); all user-facing copy says **"Income."** Don't let these drift apart silently — if `totalProfit()` ever starts subtracting cost, rename it or split it into `totalRevenue()` / `totalMargin()` explicitly.

### Inventory decremented by pending *and* completed orders
**Decision:** `remaining()` subtracts quantities from every order regardless of `done` status.
**Why:** An order that's been placed but not yet handed over has already claimed that stock — if inventory only counted completed orders, two pending orders could both "see" the same last cup of matcha as available and the stand would oversell.
**Revisit when:** If a "cancel without deleting" state is ever added (distinct from delete), decide whether cancelled orders should release their claimed stock — almost certainly yes, but that's a new order status, not a change to this rule.

### Menu items vs. add-ons, syrup/milk/ice only on drinks
**Decision:** Menu items are always category `matcha` (drinks); add-ons are `bread` or `cookie`. Only `matcha`-category line items get asked for syrup/milk/ice when added to an order.
**Why:** Matches how a real matcha stand's menu is actually structured — nobody asks what milk goes in a cookie. Keeping the category enum closed (`matcha | bread | cookie`) rather than open-ended keeps the three-icon Inventory page meaningful; see the next entry.
**Revisit when:** A stand wants to sell a fourth inventory-tracked item type (e.g. a second drink base, or a merch item). At that point the category enum and the Inventory page's three-card layout both need to become dynamic — see `ROADMAP.md` for "support more than 3 inventory categories," deferred since V2.

### Local-only, prototype-level authentication
**Superseded in V11:** real Supabase Auth replaced this entirely — hashed passwords, real sessions, email confirmation. See `CLAUDE.md` § 4/§ 11 #5. Kept below for the original reasoning and as the "hard line" this was always meant to be crossed by, not as current practice.
**Decision:** Email/password sign up/sign in exists, but is validated purely against a plaintext map in `localStorage`. No hashing, no server, no real session security.
**Why:** The prototype's actual goal was letting one person organize multiple pop-up events under an account-shaped mental model (not real multi-user security) — a full auth backend wasn't warranted for that yet, and building one prematurely would have slowed down UI iteration for no real benefit at the time.
**This is a hard line, not a style choice:** this must not be treated as "good enough" once there's a real backend or any real user data at stake. See `ROADMAP.md` #3–4.

### "End Event" is a one-way, confirmed action; no "reopen"
**Decision:** Ending an event marks it `ended` permanently (from the UI's perspective) and switches it to a read-only Summary view. There's no "reopen" button.
**Why:** Matches the mental model of a pop-up market actually being over — reopening a finished event to change historical orders would undermine trusting the income/inventory numbers as a record of what happened.
**Revisit when:** If real mistakes happen often enough that people want to fix a finished event (e.g. forgot to mark an order done before ending), consider either (a) a narrow "reopen for editing" escape hatch with a clear warning, or (b) just making the pre-end confirmation more prominent about pending orders specifically.

---

## Architecture decisions

### A table's RLS policy must never query that same table — route through a `security definer` function instead (V11.4)
**Decision:** `event_members`'s original "members can view their event's roster" policy checked membership by querying `event_members` from within a policy defined *on* `event_members` — a self-referential subquery. Fixed by introducing `public.is_event_member(event_id, user_id)`, a `security definer` SQL function that queries `event_members` directly, and re-pointing every membership check in the schema (six other tables, not just the roster) at that function instead of an inline subquery.
**Why:** Evaluating the self-referential subquery re-applies the same policy, which needs to evaluate the subquery again, forever — Postgres detects the cycle and throws `42P17 infinite recursion detected in policy`. `security definer` functions run as their owner, and table owners bypass RLS by default, so the function's internal query never re-triggers the policy that called it, breaking the cycle. This is the standard, documented fix for self-referential RLS on a membership table, not a one-off workaround.
**Consequence:** because `events`, `menu_items`, `inventory`, `flavor_options`, `orders`, and `order_items` all checked membership by querying `event_members` from their own policies, this single bug in one table's policy broke nearly the entire schema, not just the roster view — worth remembering when a seemingly-isolated table starts throwing `42P17`. `orders`/`order_items` needed a second, `text`-typed overload of `is_event_member()` since `orders.event_id` still has no FK to `events.id` (see the schema-evolution entry below) and is a `text` column, not `uuid`.
**Revisit when:** never expected to reverse — every future membership check should go through `is_event_member()`, not a new inline subquery, specifically so this class of bug can't quietly reappear in one call site without every other one being re-audited by hand. See `supabase/fix_event_members_recursion.sql`.

### Supabase over a hand-rolled Postgres + Prisma backend (V11)
**Decision:** The real backend `ROADMAP.md` had flagged as a future decision was built on [Supabase](https://supabase.com) — hosted Postgres, Auth, and Realtime behind one client library — rather than a self-managed Postgres instance with a hand-rolled auth layer and an ORM (Prisma/Drizzle), which is what `ROADMAP.md`'s original entry had sketched as the likely path.
**Why:** Supabase's Row Level Security replaces what would otherwise be a hand-written application-level authorization layer, and its Realtime service (Postgres change broadcast over WebSocket) replaces what would otherwise need a separate pub/sub service for the multi-user live-sync feature. For a small, personal-use app being built solo, bundling database + auth + realtime behind one client library was a meaningfully smaller surface to build and operate than assembling the equivalent from separate pieces.
**Consequence:** the entire permission system is now Postgres RLS policies, not application code — see the next entry. This also means Sencha has no custom API server of its own; the browser talks to Supabase directly over HTTPS/WebSocket.
**Revisit when:** if Supabase's pricing/limits or platform constraints (e.g. the signup rate limit hit repeatedly during V11's development, see `CLAUDE.md` § 11 #6) become a real operational problem — at that scale, a self-hosted Postgres + a dedicated auth/realtime setup would be the natural next step, and RLS policies would need to be reimplemented as application-level authorization.

### Row Level Security is the entire access-control system — no client-side filtering (V11)
**Decision:** No query in `lib/supabase/*.ts` filters by `user_id`/`event_id` client-side (e.g. no `.eq('user_id', currentUserId)`). Every read/write relies entirely on Postgres RLS to only return/allow rows the signed-in user has access to.
**Why:** Client-side filters are advisory, not enforcing — anyone can call the same API with different parameters. RLS is enforced by the database itself regardless of what the client sends, so it's the only place a real access-control guarantee can live given this app has no custom backend server to put a check in instead. Duplicating the same check client-side would also just be more code that could drift out of sync with the real policy.
**Consequence:** every access-control question ("can this user see this event's orders?") has exactly one place to look — the RLS policies in `supabase/*.sql` — rather than being split between application code and database policy. See `CLAUDE.md` § 7 for the current policy shape and its one production bug so far (the recursion issue above).
**Revisit when:** never expected to reverse — reintroducing client-side filters would be redundant at best and a false sense of security at worst if a policy were ever accidentally too permissive.

### Order mutations are optimistic; event mutations are not (V11.3)
**Decision:** `addOrder`/`editOrder`/`toggleOrderDone`/`deleteOrder` in `AppStateContext.tsx` update local React state immediately, fire the Supabase write after, and roll the local change back (re-throwing so the calling page's `try`/`catch` can surface it) only if the write fails. `createEvent`/`endActiveEvent`/`updateEventSettings` deliberately stay await-then-update instead.
**Why:** Checking off or adding an order needs to feel instant under time pressure — the app's core product principle (`CLAUDE.md` § 2). Event-level actions are different: showing "event created" before the write is confirmed, then having it silently fail, would be actively misleading (e.g. the person navigates into an event that turns out not to exist), where a brief loading state is the honest choice instead.
**Consequence:** `addOrder` needed a temporary client-side id (replaced by the real row once Supabase responds) and de-duplication against its own Realtime echo landing before the request resolves — a real race, confirmed to happen in practice, not just a theoretical concern.
**Revisit when:** if a mutation is added where "instant feedback, silently fails" is *not* an acceptable failure mode (e.g. anything involving money changing hands for real) — that's a signal it belongs in the await-then-update camp, not the optimistic one.

### Postgres `numeric` columns return as strings from PostgREST — always coerce explicitly (V11)
**Decision:** Every price field (`price`, `syrupPrice`, `milkPrice`, etc.) read off a Supabase row in `lib/supabase/events.ts`/`orders.ts` is explicitly wrapped in `Number(...)`.
**Why:** Postgres's `numeric` type is arbitrary-precision, and PostgREST (Supabase's auto-generated REST layer) returns it as a JSON string rather than a JS number specifically to avoid silent floating-point precision loss on the wire. Skipping the coercion doesn't throw an error — `price * qty` just silently becomes string concatenation or `NaN` depending on the exact expression, which is much harder to notice than a crash. This was a real bug caught during the V11 migration, not a hypothetical one (see `CHANGELOG.md` V11).
**Consequence:** any new numeric/decimal column added to the schema needs the same explicit coercion at the point it's read off a Supabase row — there's no type-level guarantee that will catch a forgotten one, since TypeScript sees whatever the row interface claims, not what PostgREST actually returns.
**Revisit when:** never expected to reverse — this is a permanent property of PostgREST, not a version-specific quirk.

### Schema evolved incrementally; the real deployed shape diverges from the original `schema.sql` proposal (V11)
**Decision:** `supabase/schema.sql` (a full collaborative schema, event_members-anchored from the start) was drafted first as a design proposal but never deployed as written. Instead, Orders migrated first (single-owner RLS, since Events hadn't moved to Supabase yet), then Events/Inventory/Settings (also single-owner), and only then did `collaboration_phase.sql` introduce `event_members` and rewrite every table's RLS to the collaborative model the proposal had originally described.
**Why:** Migrating one feature at a time (Orders, then Events, then collaboration) kept each step small, testable, and revertible independently, rather than attempting one large migration matching the full proposal atomically. This is a normal, healthy way for a real schema to evolve — the proposal was directionally right, but sequencing the actual migrations around what already existed (and what was actually being asked for at each point) mattered more than matching the proposal's file exactly.
**Consequence:** column names and structure genuinely differ between `schema.sql` and what's live (`events.user_id` vs. the proposal's `owner_id`; `text` date/time columns vs. real Postgres `date`/`time` types; `orders.event_id` still has no FK to `events.id`). `schema.sql` is a historical design artifact, not documentation of the current database — see `CLAUDE.md` § 7 and § 11 #7 for the divergences, and don't trust it when debugging live behavior.
**Revisit when:** worth either reconciling `schema.sql` with the deployed shape or deleting it outright, so a future reader doesn't mistake it for current — tracked in `CLAUDE.md` § 12 and `ROADMAP.md`.

### Deployed via direct `vercel` CLI, not a GitHub-connected project
**Decision:** The first production deploy (https://senchaapp.vercel.app) was pushed straight from the local machine via `npx vercel --yes`, rather than pushing to GitHub first and importing the repo through Vercel's dashboard.
**Why:** Fastest path to "live URL to look at" when that was the explicit priority — no waiting on a GitHub repo creation/OAuth-import flow. `git init` still happened locally (a real prerequisite regardless, and good practice on its own), just not pushed to a remote yet.
**Known consequence:** every deploy right now is a manual `vercel --yes`/`vercel --prod` run from this machine — no automatic deploy-on-push, no per-PR preview URLs, no deploy history tied to commits. This is a real gap for anything beyond solo iteration.
**Revisit when:** the moment there's a GitHub remote worth having anyway (collaborators, backup, PR review) — connecting that repo in the Vercel dashboard is a five-minute change that adds CI-style auto-deploy without touching app code. Don't keep deploying by hand past that point.

### Local-first persistence, no backend yet
**Superseded in V11:** a real backend (Supabase) was built — see "Supabase over a hand-rolled Postgres + Prisma backend" above. `lib/storage.ts` now only handles the reusable menu template; accounts, events, and orders all migrated to Postgres, exactly along the seam this decision anticipated. Kept below for the original reasoning, not as current practice.
**Decision:** All data lives in `localStorage`, wrapped by `lib/storage.ts`'s small async `get/set/delete` interface — deliberately shaped to mirror Claude.ai's artifact `window.storage` API that the original prototype used.
**Why:** This lets the entire UI/UX be iterated on quickly (including inside Claude.ai during prototyping) without needing a database, hosting, or auth infrastructure decision made up front. It also means this Next.js port could be done as a pure UI recreation without needing new backend design decisions to be made under pressure.
**The seam:** `lib/storage.ts` is intentionally the *only* place that knows how persistence actually works. Every other module calls the same `storage.get/set/delete` shape. Swapping this module's internals for real HTTP calls to a backend (see `ROADMAP.md` #1) should not require changing any component or the `AppStateContext` logic that calls it — only `storage.ts` itself, and eventually the auth functions in `AppStateContext.tsx` (which currently read/write the plaintext user map directly and will need to become real API calls).
**Known consequence:** data is per-browser/per-device (see `CLAUDE.md` § 11, known gap #2). This is an accepted limitation of "local-first," not an oversight — it's the direct tradeoff for not needing a backend yet.

### Plain CSS, not Tailwind, for the initial Next.js port
**Decision:** `app/globals.css` is a near-verbatim copy of the prototype's `<style>` block — same class names, same custom properties, same structure. No utility-CSS framework was introduced in this pass.
**Why:** The instruction for this conversion was explicit: preserve the existing design and UX exactly, and don't add new features yet. Rewriting the styling in Tailwind (or CSS Modules, or styled-components) at the same time as restructuring the JS into React components would have doubled the surface area for visual regressions, with zero user-facing benefit in this pass. Keeping the CSS untouched made it possible to verify fidelity by diffing class names 1:1 against the prototype.
**Revisit when:** deliberately, as its own task — e.g. if Tailwind's constrained design tokens would help prevent future one-off inconsistencies, or if a component library is adopted for velocity. This should be its own PR/task with before/after screenshots, not bundled with a feature change.

### React Context instead of Redux/Zustand/Jotai/etc.
**Decision:** One `AppStateProvider` context holds all app state (auth, events, active/summary event IDs, current page) and exposes actions as plain functions.
**Why:** The state tree is genuinely small and shallow — one signed-in user, a flat array of their events, and a couple of "which one is currently open" pointers. A dedicated state library would add a dependency and boilerplate without solving a problem this app actually has (e.g. no complex derived-state graphs, no cross-cutting middleware needs, no time-travel debugging requirement).
**Revisit when:** if state genuinely grows more complex — e.g. real-time multi-user editing of a shared event (see `ROADMAP.md`'s longer-term ideas), which would likely want something like React Query/SWR for server state plus possibly a proper client state library for optimistic UI.

### Business logic kept in plain, pure TypeScript functions (`lib/calculations.ts`), not embedded in components
**Decision:** `usedByCategory`, `remaining`, `totalProfit`, `orderTotal`, `badgeClass`, formatting helpers — all pure functions taking plain data in, returning plain data out, with no React or DOM dependency.
**Why:** This is the highest-value code to unit test (see `CLAUDE.md` § 12 TODOs) and the most likely to have subtle bugs (off-by-one stock math, wrong exclusion logic when editing an order). Keeping it framework-free means tests don't need a DOM or React Testing Library, and the logic can be reused if the UI layer ever changes.
**Revisit when:** never, really — this pattern should hold as the app grows; add new pure functions here rather than inlining `.reduce()` calls in components.

### `Burst` (sparkle/completion animation) as an imperative DOM utility, not a React component
**Decision:** `components/Burst.tsx` exports a plain function `burstEffect(el, emojis)` that directly creates/animates/removes DOM nodes, called from `onClick` handlers — it is not a rendered React component and holds no state.
**Why:** The particles are pure fire-and-forget visual decoration with no data model behind them and no need to survive a re-render or be inspectable in React DevTools. Modeling this as component state (an array of active particles, timers to clear them, etc.) would add complexity for a purely cosmetic effect. This mirrors the original prototype's implementation exactly.
**Revisit when:** if the animation needs to become more sophisticated (physics, reduced-motion accessibility handling) it may be worth wrapping in a small hook — but the imperative-utility shape should probably stay.

### TicketCard's completion-burst trigger uses a `useEffect` + `useRef` "previous value" comparison
**Decision:** `TicketCard` compares the current `order.done` prop to a ref of its previous value inside a `useEffect`, firing the burst/pulse animation only on the `false → true` transition.
**Why:** `order.done` is now a prop controlled by parent state (as is idiomatic in React), unlike the original vanilla-JS version which mutated a DOM class directly inside the same function that flipped the boolean. This is the React-idiomatic way to detect "a specific prop transition just happened" without lifting animation state up into the parent unnecessarily.
**Revisit when:** if this pattern gets duplicated a third time elsewhere in the app, consider extracting a small `usePrevious`/`useTransitionEffect` hook.

### No automated build/runtime verification was possible in this handoff
**Decision/constraint:** This conversion was written and validated in a sandboxed environment with **no network access**, so `npm install` could not be run against the real `next`/`react`/`@types/*` packages. Validation instead used a hand-written TypeScript ambient-type shim (see `CHANGELOG.md` V6 entry) to catch structural/syntax errors, plus careful manual review against the original prototype's behavior.
**What this means for you:** treat this code as **structurally sound but functionally unverified**. The very first task in Claude Code should be `npm install && npm run dev`, followed by manually clicking through every screen against `CLAUDE.md` § 5's feature list. See `ROADMAP.md` #1.

---

## Naming/terminology notes (to avoid confusion later)

- **"Profit" in code, "Income" in UI.** See the product decision above. Search for `totalProfit` if you're looking for the income calculation.
- **"Menu items" vs. "Add-ons"** are a UI-only distinction over a single underlying `menu: MenuItem[]` array — both are `MenuItem` objects, distinguished purely by `category`. There is no separate `addons` array in the data model.
- **"Event" in code = one pop-up stand session** (`PopupEvent`), not a calendar/scheduling concept and not related to DOM/React events. If this ever gets confusing in code review, consider renaming the type to `StandSession` or similar — not done yet to avoid an unnecessary diff in this handoff.
