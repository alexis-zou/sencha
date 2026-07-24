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

### 4. Decide on a real backend
Spike/decide: managed Postgres + an ORM (Prisma or Drizzle) is the natural fit given the relational schema sketched in `CLAUDE.md` § 7. Auth can either be hand-rolled against that database or use a managed auth provider — worth weighing given this is a small, personal-use app where "roll your own" may genuinely be simpler than integrating a third-party auth service.

### 5. Migrate authentication to the real backend
Replace the plaintext `auth:users`/`auth:session` localStorage scheme with real hashed-password storage and real sessions (e.g. HTTP-only cookies). This is the single most important item on this list from a "don't ship something that looks like an account system but isn't one" standpoint — see `DECISIONS.md`'s hard-line note on this.

### 6. Migrate event/order persistence to the real backend
Move `events: PopupEvent[]` from localStorage to the database, scoped by real user IDs. Keep `lib/storage.ts`'s `get/set/delete` shape as the contract if practical, or replace it with typed API-calling functions — either way, component code should need minimal changes since it already goes through `AppStateContext`, not storage directly.

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

### 19. Multi-user / shared-stand support
Let two people working one physical stand both add/complete orders live and see each other's changes. Requires the backend (#6) plus either polling or a real-time layer (e.g. WebSockets/a service like Pusher/Ably) — a genuinely bigger lift, sequenced late deliberately.

### 20. Visual/design system pass (Tailwind or equivalent)
Per `DECISIONS.md`, plain CSS was a deliberate choice for the initial port to minimize conversion risk. Once the port is verified (#1) and the team has room to invest in it, revisit whether to formalize the design tokens in `DESIGN.md` into a proper system (Tailwind config, or a small internal component library) — do this as its own dedicated task with before/after visual review, not bundled into a feature change.

---

## Longer-Term / Less-Defined Ideas

Not yet sized or sequenced — flagged for future prioritization once the above is further along:

- **Native app wrapper** (or PWA install support) if stand owners want a home-screen icon / offline-first experience beyond a mobile web page.
- **Multiple concurrent active events** — currently the data model supports it (events is an array), but the UX has only ever been designed around one active event at a time; worth explicitly deciding whether running two stands simultaneously is a real use case.
- **Team/staff accounts under one business** — distinct from #19's "shared stand" idea; this would be more like multiple stands under one umbrella account with shared menus/reporting.
- **Printable/physical receipt integration** (e.g. Bluetooth receipt printer support) if stands want a physical ticket handed to customers, not just an on-screen one.
- **Push notifications** for low-stock thresholds, if the app becomes a PWA/native wrapper with that capability.
- **Themeable palettes** for stands that don't sell matcha (e.g. lemonade, coffee) — would require decoupling the visual identity from "matcha" specifically, a larger rebrand-style decision, not a small feature.
