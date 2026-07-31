-- ============================================================
-- Sencha -- "Inventory, Events, Settings" migration phase
--
-- Same approach as supabase/orders_phase.sql: single-owner RLS
-- (user_id = auth.uid()), not the event_members collaborative model
-- from the earlier schema.sql proposal -- this is a behavior-
-- preserving lift-and-shift of the existing single-user architecture,
-- not a jump to multi-user collaboration.
--
-- event_date/start_time/end_time are `text`, not Postgres date/time
-- types -- the app already treats them as opaque "HH:MM"/"YYYY-MM-DD"
-- strings everywhere (never does SQL-level date arithmetic on them),
-- and Postgres's `time` type round-trips as "HH:MM:SS" which would
-- need reformatting on every read. Storing them as the exact strings
-- the app already produces avoids that whole class of mismatch.
--
-- price columns are `numeric(10,2)` for exact decimal money math, but
-- note PostgREST returns numeric columns as JSON strings, not numbers
-- -- the client code (lib/supabase/events.ts) explicitly Number()s
-- every price field it reads back. (This was also a latent bug in the
-- Orders phase's order_items.price/syrup_price/milk_price, fixed in
-- this same commit -- see lib/supabase/orders.ts.)
--
-- Known loose end: orders.event_id (from orders_phase.sql) stays
-- plain text with no FK to events.id here. Tightening that requires
-- either cleaning up any pre-existing non-UUID event_id values or a
-- backfill, and risks failing outright if either exists -- deferred
-- rather than risking a destructive ALTER I can't test against your
-- actual data.
-- ============================================================

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  event_date text,
  start_time text,
  end_time text,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  type text not null check (type in ('drink', 'item')),
  sort_order integer not null default 0
);

create table public.inventory (
  menu_item_id uuid primary key references public.menu_items(id) on delete cascade,
  starting_count integer not null default 0 check (starting_count >= 0)
);

-- Syrup and milk are modeled identically in the app (FlavorOption:
-- name + optional upcharge) -- one table with a `kind` discriminator
-- mirrors that shared shape directly instead of two near-duplicate
-- tables.
create table public.flavor_options (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('syrup', 'milk')),
  name text not null,
  price numeric(10, 2) not null default 0,
  sort_order integer not null default 0
);

create index idx_events_user on public.events(user_id);
create index idx_menu_items_event on public.menu_items(event_id);
create index idx_flavor_options_event on public.flavor_options(event_id);

alter table public.events enable row level security;
alter table public.menu_items enable row level security;
alter table public.inventory enable row level security;
alter table public.flavor_options enable row level security;

create policy "users manage their own events"
  on public.events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users manage their own menu items"
  on public.menu_items for all
  using (exists (select 1 from public.events where id = menu_items.event_id and user_id = auth.uid()))
  with check (exists (select 1 from public.events where id = menu_items.event_id and user_id = auth.uid()));

create policy "users manage their own inventory"
  on public.inventory for all
  using (exists (
    select 1 from public.menu_items mi
    join public.events e on e.id = mi.event_id
    where mi.id = inventory.menu_item_id and e.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.menu_items mi
    join public.events e on e.id = mi.event_id
    where mi.id = inventory.menu_item_id and e.user_id = auth.uid()
  ));

create policy "users manage their own flavor options"
  on public.flavor_options for all
  using (exists (select 1 from public.events where id = flavor_options.event_id and user_id = auth.uid()))
  with check (exists (select 1 from public.events where id = flavor_options.event_id and user_id = auth.uid()));

-- RLS policies only govern *which rows* a role can touch -- Postgres also
-- requires the role to hold baseline table-level privileges before RLS is
-- even evaluated. The Supabase Table Editor grants these automatically
-- when you create a table through the UI; raw SQL via the SQL Editor does
-- not, and skipping this produces a `42501 permission denied for table`
-- error even though the RLS policies above are otherwise correct.
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.menu_items to authenticated;
grant select, insert, update, delete on public.inventory to authenticated;
grant select, insert, update, delete on public.flavor_options to authenticated;
