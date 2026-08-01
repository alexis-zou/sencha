-- ============================================================
-- Sencha -- URGENT hotfix: infinite recursion in event_members RLS
--
-- Bug: "members can view their event's roster" (originally in
-- collaboration_phase.sql, re-declared identically in
-- rls_hardening_phase.sql) checks membership by querying
-- event_members FROM WITHIN a policy ON event_members:
--
--   using (exists (
--     select 1 from public.event_members em
--     where em.event_id = event_members.event_id and em.user_id = auth.uid()
--   ))
--
-- Evaluating this SELECT against event_members requires re-applying
-- this same policy, which requires evaluating the same SELECT again,
-- forever -- Postgres detects the cycle and throws
-- `42P17 infinite recursion detected in policy for relation
-- "event_members"`.
--
-- This doesn't just break viewing the roster: events, menu_items,
-- inventory, flavor_options, orders, and order_items ALL check
-- membership by querying event_members from their own policies, so
-- reading event_members' rows (to answer "is this user a member?")
-- triggers event_members' own broken policy too. The recursion
-- radiates out to nearly every table in the schema.
--
-- Fix: a SECURITY DEFINER function that queries event_members
-- directly. SECURITY DEFINER functions run as their owner (the table
-- owner, not the calling user), and table owners bypass RLS by
-- default (this project never sets FORCE ROW LEVEL SECURITY) -- so
-- the function's internal query never re-triggers event_members' own
-- policy, breaking the cycle. This is the standard fix for
-- self-referential RLS on a membership table.
--
-- Also re-points every other event_members-dependent policy at this
-- same function instead of its own inline subquery, so this class of
-- bug can't quietly reappear if event_members' policy changes again
-- later without every call site being re-audited by hand.
-- ============================================================

begin;

create or replace function public.is_event_member(check_event_id uuid, check_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.event_members
    where event_id = check_event_id and user_id = check_user_id
  );
$$;

grant execute on function public.is_event_member(uuid, uuid) to authenticated;

-- Text-typed overload for orders/order_items: orders.event_id is `text`
-- (no FK -- Events didn't exist in Supabase yet when Orders migrated,
-- see orders_phase.sql), so callers there have a text value in hand, not
-- a uuid. Compares by casting event_members.event_id (uuid) to text --
-- never fails -- rather than casting the text argument to uuid, which
-- would throw for any row that isn't a well-formed UUID string and take
-- the whole query down with it, not just that row.
create or replace function public.is_event_member(check_event_id text, check_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.event_members
    where event_id::text = check_event_id and user_id = check_user_id
  );
$$;

grant execute on function public.is_event_member(text, uuid) to authenticated;

-- ---------- event_members (the actual bug) ----------
drop policy if exists "members can view their event's roster" on public.event_members;
create policy "members can view their event's roster"
  on public.event_members for select
  to authenticated
  using (public.is_event_member(event_id, auth.uid()));

-- ---------- events ----------
drop policy if exists "members can access their events" on public.events;
create policy "members can access their events"
  on public.events for all
  to authenticated
  using (public.is_event_member(id, auth.uid()))
  with check (
    user_id = auth.uid()
    or public.is_event_member(id, auth.uid())
  );

-- ---------- menu_items ----------
drop policy if exists "members can access menu items" on public.menu_items;
create policy "members can access menu items"
  on public.menu_items for all
  to authenticated
  using (public.is_event_member(event_id, auth.uid()))
  with check (public.is_event_member(event_id, auth.uid()));

-- ---------- inventory ----------
drop policy if exists "members can access inventory" on public.inventory;
create policy "members can access inventory"
  on public.inventory for all
  to authenticated
  using (exists (
    select 1 from public.menu_items mi where mi.id = inventory.menu_item_id and public.is_event_member(mi.event_id, auth.uid())
  ))
  with check (exists (
    select 1 from public.menu_items mi where mi.id = inventory.menu_item_id and public.is_event_member(mi.event_id, auth.uid())
  ));

-- ---------- flavor_options ----------
drop policy if exists "members can access flavor options" on public.flavor_options;
create policy "members can access flavor options"
  on public.flavor_options for all
  to authenticated
  using (public.is_event_member(event_id, auth.uid()))
  with check (public.is_event_member(event_id, auth.uid()));

-- ---------- orders ----------
-- Uses the text-typed overload -- orders.event_id is text, and casting
-- it to uuid here (the other direction) is exactly the unsafe pattern
-- this file avoids everywhere else. See the overload's own comment.
drop policy if exists "members can access orders" on public.orders;
create policy "members can access orders"
  on public.orders for all
  to authenticated
  using (public.is_event_member(orders.event_id, auth.uid()))
  with check (public.is_event_member(orders.event_id, auth.uid()));

-- ---------- order_items ----------
drop policy if exists "members can access order items" on public.order_items;
create policy "members can access order items"
  on public.order_items for all
  to authenticated
  using (exists (
    select 1 from public.orders o where o.id = order_items.order_id and public.is_event_member(o.event_id, auth.uid())
  ))
  with check (exists (
    select 1 from public.orders o where o.id = order_items.order_id and public.is_event_member(o.event_id, auth.uid())
  ));

commit;
