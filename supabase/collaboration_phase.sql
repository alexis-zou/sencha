-- ============================================================
-- Sencha -- Collaborative events phase
--
-- Adds public.users (a profile mirror of auth.users -- needed
-- because auth.users itself isn't queryable from client code, by
-- design, and an owner has to be able to resolve "is there a
-- registered account at this email?" to invite someone) and
-- event_members (who has access to an event, and with what role).
--
-- Every existing table's RLS switches from "owner only"
-- (events.user_id = auth.uid() / orders.user_id = auth.uid()) to
-- "any member of event_members for this event" -- this is the
-- event_members-anchored model the original schema.sql proposal
-- described, now actually adopted for real. Backfills existing data
-- first so this doesn't lock the current owner out of their own
-- events and orders the moment it runs.
--
-- Scope, matching what was actually asked for: any member has equal
-- access to an event's settings/inventory/orders once invited (this
-- is NOT a tiered permission system) -- the one owner-only action is
-- inviting/removing members. Notifications are explicitly out of
-- scope for this phase.
-- ============================================================

-- ---------- 1. public.users ----------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Backfill: existing accounts predate this table and the trigger
-- below only fires on *future* signups.
insert into public.users (id, email)
select id, email from auth.users
on conflict (id) do nothing;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.users enable row level security;

-- Any authenticated user can look up another user's id by exact
-- email. This is deliberately broader than "only people you already
-- share an event with" -- you can't share an event with someone you
-- haven't invited yet, so that narrower policy would make inviting
-- impossible. Exposure is limited to id + email, nothing else.
create policy "authenticated users can look up any profile by email"
  on public.users for select
  to authenticated
  using (true);

grant select on public.users to authenticated;

-- ---------- 2. event_members ----------
create table public.event_members (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index idx_event_members_user on public.event_members(user_id);

-- Backfill: every existing event's owner becomes its first member.
-- Without this, flipping the policies below to check event_members
-- would immediately lock every current owner out of their own
-- events -- there'd be zero event_members rows to match against.
insert into public.event_members (event_id, user_id, role)
select id, user_id, 'owner' from public.events
on conflict (event_id, user_id) do nothing;

-- Future events auto-add their owner as a member the same way.
create function public.handle_new_event()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.event_members (event_id, user_id, role)
  values (new.id, new.user_id, 'owner')
  on conflict (event_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_event_created
  after insert on public.events
  for each row execute function public.handle_new_event();

alter table public.event_members enable row level security;

create policy "members can view their event's roster"
  on public.event_members for select
  using (exists (
    select 1 from public.event_members em
    where em.event_id = event_members.event_id and em.user_id = auth.uid()
  ));

-- Only the event's owner can invite. Checks events.user_id (the
-- original, still-present "who owns this" column) rather than an
-- event_members role check, since that's the one unambiguous source
-- of "who's the owner" that predates event_members entirely.
create policy "owner invites members"
  on public.event_members for insert
  with check (exists (
    select 1 from public.events where id = event_id and user_id = auth.uid()
  ));

create policy "owner removes members"
  on public.event_members for delete
  using (exists (
    select 1 from public.events where id = event_id and user_id = auth.uid()
  ));

grant select, insert, delete on public.event_members to authenticated;

-- ============================================================
-- Re-point every existing table's RLS at event_members instead of
-- "owner only."
-- ============================================================

drop policy "users manage their own events" on public.events;
create policy "members can access their events"
  on public.events for all
  using (exists (
    select 1 from public.event_members where event_id = events.id and user_id = auth.uid()
  ))
  with check (
    -- The creating INSERT has to pass before handle_new_event() has
    -- run and created the matching event_members row, so the owner
    -- check has to stand in for that one moment.
    user_id = auth.uid()
    or exists (select 1 from public.event_members where event_id = events.id and user_id = auth.uid())
  );

drop policy "users manage their own menu items" on public.menu_items;
create policy "members can access menu items"
  on public.menu_items for all
  using (exists (
    select 1 from public.event_members where event_id = menu_items.event_id and user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.event_members where event_id = menu_items.event_id and user_id = auth.uid()
  ));

drop policy "users manage their own inventory" on public.inventory;
create policy "members can access inventory"
  on public.inventory for all
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

drop policy "users manage their own flavor options" on public.flavor_options;
create policy "members can access flavor options"
  on public.flavor_options for all
  using (exists (
    select 1 from public.event_members where event_id = flavor_options.event_id and user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.event_members where event_id = flavor_options.event_id and user_id = auth.uid()
  ));

-- orders.event_id is `text` (see orders_phase.sql -- Events didn't
-- exist in Supabase yet when Orders migrated), with no FK to
-- events.id. Casting event_members.event_id (uuid) to text for the
-- comparison, not the other way around: uuid -> text can never fail,
-- but text -> uuid throws for any row that isn't a well-formed UUID
-- string, which would break this policy for every row, not just bad
-- ones, if any stray non-UUID event_id ever existed.
drop policy "users manage their own orders" on public.orders;
create policy "members can access orders"
  on public.orders for all
  using (exists (
    select 1 from public.event_members em where em.event_id::text = orders.event_id and em.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.event_members em where em.event_id::text = orders.event_id and em.user_id = auth.uid()
  ));

drop policy "users manage their own order items" on public.order_items;
create policy "members can access order items"
  on public.order_items for all
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
