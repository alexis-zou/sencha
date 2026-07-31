-- ============================================================
-- Sencha -- collaborative popup ordering schema (proposal)
--
-- Design goals:
--   - Multiple people (event_members) can work the same stand.
--   - "Remaining stock" is derived, never stored redundantly.
--   - Order line items snapshot name/price at order time, so past
--     receipts stay accurate even if a menu item changes later.
--   - Every table's RLS policy reduces to "is this user a member of
--     the event this row belongs to?" via event_members.
--
-- Run this in the Supabase SQL editor. Tables are created in FK
-- dependency order; RLS + policies + triggers follow once every
-- table they reference exists.
-- ============================================================

-- ---------- 1. users (profile, extends auth.users 1:1) ----------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ---------- 2. events ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  event_date date,
  start_time time,
  end_time time,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

-- ---------- 3. event_members ----------
-- The access-control anchor for the whole schema: every RLS policy
-- below reduces to "does a row exist here for (this event, me)?"
create table public.event_members (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ---------- 4. menu_items ----------
-- Not one of the six named tables, but required: an order/inventory
-- row has to reference *something* sellable, and that thing needs its
-- own identity independent of how much of it is left.
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  type text not null check (type in ('drink', 'item')),
  created_at timestamptz not null default now()
);

-- ---------- 5. inventory ----------
-- Starting count only. Remaining is derived (see inventory_remaining
-- view below) -- storing it directly would mean hand-syncing a
-- redundant number on every single order.
create table public.inventory (
  menu_item_id uuid primary key references public.menu_items(id) on delete cascade,
  starting_count integer not null default 0 check (starting_count >= 0),
  updated_at timestamptz not null default now()
);

-- ---------- 6. orders ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  created_by uuid not null references public.users(id),
  customer_note text,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------- 7. order_items ----------
-- item_name/unit_price are deliberately denormalized snapshots -- a
-- past order should keep showing what the customer actually paid,
-- even if the menu item's price changes later.
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id),
  item_name text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0),
  notes text
);

-- ---------- 8. notifications ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  type text not null check (type in ('low_stock', 'new_order', 'member_joined', 'event_ended')),
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes (Postgres does not auto-index FK columns)
-- ============================================================
create index idx_events_owner on public.events(owner_id);
create index idx_event_members_user on public.event_members(user_id);
create index idx_menu_items_event on public.menu_items(event_id);
create index idx_orders_event on public.orders(event_id);
create index idx_orders_created_by on public.orders(created_by);
create index idx_order_items_order on public.order_items(order_id);
create index idx_order_items_menu_item on public.order_items(menu_item_id);
create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_event on public.notifications(event_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.menu_items enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.notifications enable row level security;

-- users: your own profile, plus teammates on any event you share
create policy "view own or shared-event profiles"
  on public.users for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.event_members mine
      join public.event_members theirs on theirs.event_id = mine.event_id
      where mine.user_id = auth.uid() and theirs.user_id = public.users.id
    )
  );

create policy "update own profile"
  on public.users for update
  using (id = auth.uid());

-- events: only visible/editable to members
create policy "members can view their events"
  on public.events for select
  using (exists (
    select 1 from public.event_members
    where event_id = events.id and user_id = auth.uid()
  ));

create policy "owner can create events"
  on public.events for insert
  with check (owner_id = auth.uid());

create policy "owner can update their event"
  on public.events for update
  using (owner_id = auth.uid());

-- event_members: visible to the event's own roster; only the owner adds/removes people
create policy "members can view their event's roster"
  on public.event_members for select
  using (exists (
    select 1 from public.event_members em
    where em.event_id = event_members.event_id and em.user_id = auth.uid()
  ));

create policy "owner adds members"
  on public.event_members for insert
  with check (exists (
    select 1 from public.events where id = event_id and owner_id = auth.uid()
  ));

create policy "owner removes members"
  on public.event_members for delete
  using (exists (
    select 1 from public.events where id = event_id and owner_id = auth.uid()
  ));

-- menu_items: any member can view/manage
create policy "members can view menu items"
  on public.menu_items for select
  using (exists (
    select 1 from public.event_members where event_id = menu_items.event_id and user_id = auth.uid()
  ));

create policy "members can add menu items"
  on public.menu_items for insert
  with check (exists (
    select 1 from public.event_members where event_id = menu_items.event_id and user_id = auth.uid()
  ));

create policy "members can update menu items"
  on public.menu_items for update
  using (exists (
    select 1 from public.event_members where event_id = menu_items.event_id and user_id = auth.uid()
  ));

-- inventory: any member of the owning event can view/manage
create policy "members can view inventory"
  on public.inventory for select
  using (exists (
    select 1 from public.menu_items mi
    join public.event_members em on em.event_id = mi.event_id
    where mi.id = inventory.menu_item_id and em.user_id = auth.uid()
  ));

create policy "members can insert inventory"
  on public.inventory for insert
  with check (exists (
    select 1 from public.menu_items mi
    join public.event_members em on em.event_id = mi.event_id
    where mi.id = inventory.menu_item_id and em.user_id = auth.uid()
  ));

create policy "members can update inventory"
  on public.inventory for update
  using (exists (
    select 1 from public.menu_items mi
    join public.event_members em on em.event_id = mi.event_id
    where mi.id = inventory.menu_item_id and em.user_id = auth.uid()
  ));

-- orders: any member can view/create/update; created_by must be yourself
create policy "members can view orders"
  on public.orders for select
  using (exists (
    select 1 from public.event_members where event_id = orders.event_id and user_id = auth.uid()
  ));

create policy "members can create orders"
  on public.orders for insert
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.event_members where event_id = orders.event_id and user_id = auth.uid())
  );

create policy "members can update orders"
  on public.orders for update
  using (exists (
    select 1 from public.event_members where event_id = orders.event_id and user_id = auth.uid()
  ));

-- order_items: follow the parent order's membership check
create policy "members can view order items"
  on public.order_items for select
  using (exists (
    select 1 from public.orders o
    join public.event_members em on em.event_id = o.event_id
    where o.id = order_items.order_id and em.user_id = auth.uid()
  ));

create policy "members can add order items"
  on public.order_items for insert
  with check (exists (
    select 1 from public.orders o
    join public.event_members em on em.event_id = o.event_id
    where o.id = order_items.order_id and em.user_id = auth.uid()
  ));

-- notifications: strictly private to the recipient
create policy "users see only their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "users can mark their notifications read"
  on public.notifications for update
  using (user_id = auth.uid());

-- ============================================================
-- Derived "remaining stock" -- never stored, always computed.
-- Counts pending + completed orders, matching Sencha's existing rule
-- that stock already claimed by an in-progress order isn't oversold.
-- security_invoker so the view honors the querying user's own RLS,
-- not the view owner's.
-- ============================================================
create view public.inventory_remaining
with (security_invoker = true) as
select
  mi.id as menu_item_id,
  mi.event_id,
  mi.name,
  inv.starting_count,
  inv.starting_count - coalesce(sum(oi.quantity), 0) as remaining
from public.menu_items mi
join public.inventory inv on inv.menu_item_id = mi.id
left join public.order_items oi on oi.menu_item_id = mi.id
left join public.orders o on o.id = oi.order_id
group by mi.id, mi.event_id, mi.name, inv.starting_count;

-- ============================================================
-- Triggers that keep the two self-consistency invariants true
-- ============================================================

-- Every auth.users signup gets a matching public.users profile row.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Every new event auto-adds its own owner as an event_members row --
-- without this, the owner would fail their own "members can view"
-- policy on the event they just created.
create function public.handle_new_event()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.event_members (event_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_event_created
  after insert on public.events
  for each row execute function public.handle_new_event();
