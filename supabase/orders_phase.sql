-- ============================================================
-- Sencha -- "Orders only" migration phase
--
-- Scope: moves Order storage from localStorage to Supabase. Events
-- and Inventory (menu items, starting counts) are NOT migrated yet
-- and still live entirely in localStorage -- so event_id/item_id
-- below are plain text, matching the app's existing client-generated
-- uid() strings, with NO foreign key to public.events or
-- public.menu_items (those tables don't exist yet). This deliberately
-- diverges from the earlier collaborative schema.sql proposal, which
-- assumed Events had already migrated.
--
-- Column names mirror lib/types.ts's Order/OrderLineItem exactly
-- (note, done, ts, itemId, itemName, syrupId, ...) rather than the
-- fuller schema's naming (customer_note, status, unit_price, ...), so
-- the client-side mapping is a straight 1:1 copy, not a translation.
--
-- RLS is scoped to "you own your own orders" (user_id = auth.uid())
-- rather than the event_members-based collaborative model, since
-- event_members isn't live either. Revisit both when Events migrates.
-- ============================================================

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null default '',
  done boolean not null default false,
  ts bigint not null,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id text not null,
  item_name text not null,
  price numeric(10, 2) not null,
  qty integer not null check (qty > 0),
  syrup_id text,
  syrup_name text,
  syrup_price numeric(10, 2),
  milk_id text,
  milk_name text,
  milk_price numeric(10, 2)
);

create index idx_orders_user on public.orders(user_id);
create index idx_orders_event on public.orders(event_id);
create index idx_order_items_order on public.order_items(order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "users manage their own orders"
  on public.orders for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users manage their own order items"
  on public.order_items for all
  using (exists (select 1 from public.orders where id = order_items.order_id and user_id = auth.uid()))
  with check (exists (select 1 from public.orders where id = order_items.order_id and user_id = auth.uid()));
