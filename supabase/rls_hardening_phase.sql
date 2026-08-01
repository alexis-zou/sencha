-- ============================================================
-- Sencha -- RLS hardening pass (audit + explicit authenticated-only)
--
-- This does NOT change access logic. Every table already had RLS
-- enabled and was already effectively authenticated-only: `anon` was
-- never granted table privileges in any earlier migration, and every
-- policy's condition uses auth.uid(), which is null for anonymous
-- requests -- `user_id = null` is never true in SQL, so an anonymous
-- request already matched zero rows even without a `to authenticated`
-- clause. That's correct, but it's *implicit*: a reviewer has to know
-- both facts to convince themselves anon is actually blocked.
--
-- This file drops and recreates every policy (across
-- orders_phase.sql, inventory_events_phase.sql, and
-- collaboration_phase.sql) with an explicit `to authenticated`, and
-- adds an explicit `revoke ... from anon` per table so the access
-- model is declared, not inferred -- and can't silently drift if
-- someone grants anon something later without re-reading this file.
--
-- Event-scoped tables (events, menu_items, inventory,
-- flavor_options, orders, order_items) are already scoped through
-- event_members, not ownership -- that's unchanged here, only the
-- `to authenticated` declaration is new.
--
-- Run this after orders_phase.sql, inventory_events_phase.sql,
-- collaboration_phase.sql, and notifications_phase.sql. Wrapped in a
-- transaction so there's never a moment where a table has zero
-- policies live (RLS-enabled + zero policies denies everyone, so the
-- theoretical gap between a DROP and its CREATE fails *closed*, not
-- open -- the transaction wrapper just avoids even a transient
-- rejected request).
--
-- KNOWN BUG, fixed later: this file re-declared event_members'
-- "view roster" policy verbatim (only adding `to authenticated`),
-- carrying forward a self-referential subquery that causes Postgres
-- to detect infinite recursion (42P17) -- the audit that produced
-- this file traced through every policy's *logic* but didn't catch
-- that this one queries the very table it's attached to. See
-- supabase/fix_event_members_recursion.sql for the real fix; left
-- as-written here for an accurate history of what actually ran.
-- ============================================================

begin;

-- ---------- events ----------
revoke all on public.events from anon;
drop policy if exists "members can access their events" on public.events;
create policy "members can access their events"
  on public.events for all
  to authenticated
  using (exists (
    select 1 from public.event_members where event_id = events.id and user_id = auth.uid()
  ))
  with check (
    -- The creating INSERT has to pass before handle_new_event() has
    -- run and created the matching event_members row, so the owner
    -- check stands in for that one moment.
    user_id = auth.uid()
    or exists (select 1 from public.event_members where event_id = events.id and user_id = auth.uid())
  );

-- ---------- menu_items ----------
revoke all on public.menu_items from anon;
drop policy if exists "members can access menu items" on public.menu_items;
create policy "members can access menu items"
  on public.menu_items for all
  to authenticated
  using (exists (
    select 1 from public.event_members where event_id = menu_items.event_id and user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.event_members where event_id = menu_items.event_id and user_id = auth.uid()
  ));

-- ---------- inventory ----------
revoke all on public.inventory from anon;
drop policy if exists "members can access inventory" on public.inventory;
create policy "members can access inventory"
  on public.inventory for all
  to authenticated
  using (exists (
    select 1 from public.menu_items mi
    join public.event_members em on em.event_id = mi.event_id
    where mi.id = inventory.menu_item_id and em.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.menu_items mi
    join public.event_members em on em.event_id = mi.event_id
    where mi.id = inventory.menu_item_id and em.user_id = auth.uid()
  ));

-- ---------- flavor_options ----------
revoke all on public.flavor_options from anon;
drop policy if exists "members can access flavor options" on public.flavor_options;
create policy "members can access flavor options"
  on public.flavor_options for all
  to authenticated
  using (exists (
    select 1 from public.event_members where event_id = flavor_options.event_id and user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.event_members where event_id = flavor_options.event_id and user_id = auth.uid()
  ));

-- ---------- orders ----------
-- event_id is text (no FK -- see orders_phase.sql); cast
-- event_members.event_id (uuid) to text, not the other way, so a
-- stray malformed event_id can't blow up the whole policy.
revoke all on public.orders from anon;
drop policy if exists "members can access orders" on public.orders;
create policy "members can access orders"
  on public.orders for all
  to authenticated
  using (exists (
    select 1 from public.event_members em where em.event_id::text = orders.event_id and em.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.event_members em where em.event_id::text = orders.event_id and em.user_id = auth.uid()
  ));

-- ---------- order_items ----------
revoke all on public.order_items from anon;
drop policy if exists "members can access order items" on public.order_items;
create policy "members can access order items"
  on public.order_items for all
  to authenticated
  using (exists (
    select 1 from public.orders o
    join public.event_members em on em.event_id::text = o.event_id
    where o.id = order_items.order_id and em.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.orders o
    join public.event_members em on em.event_id::text = o.event_id
    where o.id = order_items.order_id and em.user_id = auth.uid()
  ));

-- ---------- event_members ----------
revoke all on public.event_members from anon;
drop policy if exists "members can view their event's roster" on public.event_members;
create policy "members can view their event's roster"
  on public.event_members for select
  to authenticated
  using (exists (
    select 1 from public.event_members em where em.event_id = event_members.event_id and em.user_id = auth.uid()
  ));

drop policy if exists "owner invites members" on public.event_members;
create policy "owner invites members"
  on public.event_members for insert
  to authenticated
  with check (exists (
    select 1 from public.events where id = event_id and user_id = auth.uid()
  ));

drop policy if exists "owner removes members" on public.event_members;
create policy "owner removes members"
  on public.event_members for delete
  to authenticated
  using (exists (
    select 1 from public.events where id = event_id and user_id = auth.uid()
  ));

-- ---------- users ----------
-- Already declared `to authenticated` in collaboration_phase.sql --
-- re-declared here too, only so this file is a complete, self-
-- contained reference of the final state, not because anything about
-- it is actually changing.
revoke all on public.users from anon;
drop policy if exists "authenticated users can look up any profile by email" on public.users;
create policy "authenticated users can look up any profile by email"
  on public.users for select
  to authenticated
  using (true);

-- ---------- notifications ----------
revoke all on public.notifications from anon;
drop policy if exists "users see only their own notifications" on public.notifications;
create policy "users see only their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users can mark their own notifications read" on public.notifications;
create policy "users can mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());

commit;
