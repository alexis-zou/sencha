# ROADMAP.md — Future Features & Prioritized Plan

This is organized as: **the next 20 concrete development tasks** (in priority order), followed by **longer-term / less-defined ideas** that don't yet warrant a specific task.

The first several tasks are deliberately about *verifying and hardening the Next.js port itself* before building anything new — this conversion has not been runtime-tested (see `DECISIONS.md`), so trust needs to be established before layering features on top of it.

---

## Next 20 Development Tasks

### 1. Verify the Next.js port end-to-end
Run `npm install && npm run dev`. Manually click through every item in `CLAUDE.md` § 5 (every completed feature) and confirm it matches the original prototype's behavior and appearance. This was written and structurally validated without network access to install real dependencies — treat it as unverified until this step is done. Fix anything that doesn't match before proceeding.

### 2. Add unit tests for `lib/calculations.ts`
These are pure functions (no React, no DOM) — the highest-value, lowest-effort place to start automated testing. Cover: `usedByCategory`/`remaining` with and without `excludeOrderId`, `totalProfit` (done vs. pending orders), `orderTotal`, `badgeClass` boundary conditions (exactly 0, exactly 15%, exactly 2 units).

### 3. Add basic e2e smoke test for the core loop
Sign up → create event → add a multi-item order with a drink customization → mark it done → check income and inventory updated correctly → end event → view read-only summary. Playwright is already available in the current dev environment's global tooling.

### 4. ~~Decide on a real backend~~ — Done (V11)
Built on Supabase (hosted Postgres + Auth + Realtime), not the hand-rolled Postgres + Prisma/Drizzle approach this entry originally sketched — see `DECISIONS.md` for why Supabase specifically. `CLAUDE.md` § 7 has the deployed schema.

### 5. ~~Migrate authentication to the real backend~~ — Done (V11)
Real Supabase Auth (hashed passwords, real sessions, email confirmation) replaced the plaintext `auth:users`/`auth:session` localStorage scheme. See `CHANGELOG.md` V11 and `DECISIONS.md`'s "Local-only, prototype-level authentication" entry (now superseded).

### 6. ~~Migrate event/order persistence to the real backend~~ — Done (V11)
Events, Inventory, Settings, and Orders all read/write Supabase now, scoped by real user IDs via Row Level Security. `lib/storage.ts`'s `get/set/delete` shape was kept as-is and now only serves the reusable menu template — component code needed minimal changes since it already went through `AppStateContext`, not storage directly, exactly as this entry anticipated.

### 7. Add a delete-order confirmation
Currently 🗑 removes an order instantly with no undo. A lightweight native `confirm()` (consistent with the End Event / stock-warning pattern already in the app) is enough — no need for a custom modal.

### 8. Allow menu/add-ons/syrup edits mid-event
Currently the menu, add-ons, and syrup list are locked in at setup; only event name/date and the three inventory counts are editable via Settings afterward. Extend `SettingsModal` (or a dedicated "Edit menu" screen) to allow adding/renaming/repricing/removing items after the event has started. Watch out for: changing a price shouldn't retroactively change past orders' line-item prices (line items already denormalize `price`/`itemName` onto themselves for exactly this reason — see the schema note in `CLAUDE.md` § 7).

### 9. Add ingredient-cost input + true profit/margin
Per `DECISIONS.md`'s product-decision note: add an optional cost-per-unit field (at the menu-item level, at setup or in the new mid-event menu editor from #8), and show a margin figure *alongside* the existing "Income" figure — don't replace Income with margin, since gross revenue is still useful on its own.

### 10. Add "duplicate event as template" from Home
Recurring markets reuse the same menu/prices/syrups. Add a "Duplicate" action on an ended event's card (or a menu on the card) that opens Setup pre-filled with that event's menu/add-ons/syrups/inventory defaults, just needing a new name/date.

### 11. ~~Add export/share of a past event summary~~ — Done
`SummaryScreen.tsx`'s "🖨️ Export as PDF" button uses the browser's native print dialog (`window.print()`) against a dedicated `@media print` stylesheet, rather than a PDF-generation library (`jspdf`/`html2canvas`) — "Save as PDF" from that dialog is the export path. See `DECISIONS.md` for why. Revisit if a one-click silent download (no print dialog) becomes a real requirement.

### 12. Add password reset flow
Blocked on #5 (real backend + real email delivery). Until then, keep the current UI honest that this doesn't exist rather than implying it might.

### 13. Add reorder/duplicate for a line item within the order panel
Small quality-of-life addition to `OrderPanel`/`ItemPickerModal` — e.g. a "+1 more of this" shortcut when the same drink with the same customization is ordered again in the same session.

### 14. ~~Add optional pricing on syrup add-ons~~ — Done (V7)
Both syrup and milk are now `FlavorOption[]` with an optional per-unit price, entered at setup and shown inline in `ItemPickerModal` (e.g. "Oat Milk (+$0.75)"). Folded into the line item's total via `lineTotal()`. This was completed in the V7 setup-wizard redesign but not marked here until now.

### 15. Support more than 3 inventory categories
The `Category` type (`'matcha' | 'bread' | 'cookie'`) and the Inventory page's fixed three-card layout are both hardcoded. Generalize to an arbitrary list of tracked inventory items, each with its own name/icon/depletion visual — deferred since V2 of the original prototype, still not needed until a stand actually sells a fourth trackable item type.

### 16. Add basic analytics/history across events
Once there are several ended events, a stand owner will likely want a rollup view (e.g. "your best day this month," total income across all events) beyond browsing the Home list one card at a time.

### 17. Add accessibility pass
Keyboard navigation through the order panel/item picker, `aria-label`s on icon-only buttons (settings gear, home arrow, edit/delete pencils), color-contrast check on the amber "low stock" badge against its background, and a `prefers-reduced-motion` check for the sparkle/completion animations.

### 18. Add offline resilience messaging
Once there's a real backend (#6), decide what happens if a stand's wifi/data drops mid-market — likely want an optimistic-UI + retry-queue approach given the "never lose data mid-rush" product principle, plus a visible "offline, will sync" indicator so the user isn't left guessing.

### 19. ~~Multi-user / shared-stand support~~ — Done (V11.1–V11.2)
Invite-by-email + shared `event_members` access (`CHANGELOG.md` V11.1) plus Supabase Realtime for live order sync and in-app notifications (V11.2). Landed sooner than this list's original sequencing expected, once the backend (#6) existed. Not yet verified against two real signed-in accounts live — see #21 below.

### 20. Visual/design system pass (Tailwind or equivalent)
Per `DECISIONS.md`, plain CSS was a deliberate choice for the initial port to minimize conversion risk. Once the port is verified (#1) and the team has room to invest in it, revisit whether to formalize the design tokens in `DESIGN.md` into a proper system (Tailwind config, or a small internal component library) — do this as its own dedicated task with before/after visual review, not bundled into a feature change.

---

## Newly Surfaced (post-V11)

Follow-ups that came directly out of building the Supabase migration — smaller and more concrete than the numbered list above, worth doing soon:

### 21. Remove the live `TEMPORARY DEBUG` code
`context/AppStateContext.tsx`'s `debugWhoAmI()` and the matching branch in `components/SetupScreen.tsx`'s create-event error handler were added to diagnose the `event_members` RLS recursion bug (`CHANGELOG.md` V11.4). The bug is fixed; this diagnostic wasn't removed. Take out both, and drop the `debug_whoami()` function from the database. See `CLAUDE.md` § 11 #9.

### 22. Decide on `supabase/undo_rls_hardening_phase.sql`
Drafted but not committed or run — reverts `rls_hardening_phase.sql`'s `notifications` policy change specifically. Needs a decision: run it, or discard the file. See `CLAUDE.md` § 11 #10.

### 23. Reconcile or remove `supabase/schema.sql`
It's an early design proposal that was never deployed as written and now meaningfully diverges from the real schema (column names, RLS model, when things were added). Either update it to match the phase-file reality, or delete it so it stops reading as current documentation. See `CLAUDE.md` § 7/§ 11 #7.

### 24. Add a foreign key from `orders.event_id` to `events.id`
A known loose end since Orders and Events migrated to Supabase in separate phases before either table referenced the other. Needs a data-cleanliness check first (any non-UUID or orphaned `event_id` values) before the constraint can be added safely. See `CLAUDE.md` § 11 #8.

### 25. Verify the collaboration/Realtime/notifications flows against two real accounts
Every session that built invite-by-email, live order sync, and in-app notifications (V11.1–V11.2) was blocked by Supabase's signup rate limit before live multi-account testing was possible. Structurally sound (`tsc` clean, builds clean) but not yet confirmed with two real signed-in users on a shared event. See `CLAUDE.md` § 11 #6.

---

## Longer-Term / Less-Defined Ideas

Not yet sized or sequenced — flagged for future prioritization once the above is further along:

- **Native app wrapper** (or PWA install support) if stand owners want a home-screen icon / offline-first experience beyond a mobile web page.
- **Multiple concurrent active events** — currently the data model supports it (events is an array), but the UX has only ever been designed around one active event at a time; worth explicitly deciding whether running two stands simultaneously is a real use case.
- **Team/staff accounts under one business** — distinct from #19's "shared stand" idea; this would be more like multiple stands under one umbrella account with shared menus/reporting.
- **Printable/physical receipt integration** (e.g. Bluetooth receipt printer support) if stands want a physical ticket handed to customers, not just an on-screen one.
- **Push notifications** for low-stock thresholds, if the app becomes a PWA/native wrapper with that capability.
- **Themeable palettes** for stands that don't sell matcha (e.g. lemonade, coffee) — would require decoupling the visual identity from "matcha" specifically, a larger rebrand-style decision, not a small feature.
