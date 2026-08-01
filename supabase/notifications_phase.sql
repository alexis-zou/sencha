-- ============================================================
-- Sencha -- Notifications phase
--
-- When one collaborator adds, edits (including checking off), or
-- deletes an order in a shared event, every *other* member of that
-- event gets a notification row. A trigger on public.orders creates
-- these server-side, fanned out via event_members -- not client-side
-- code after each mutation, so it's impossible for a client to
-- "forget" to notify teammates, and it works no matter which code
-- path touches orders in the future.
--
-- Security note: clients can SELECT and UPDATE (mark read) only their
-- own notifications. There is deliberately NO insert policy for the
-- `authenticated` role -- the only way a notification row gets
-- created is through the trigger below, running as SECURITY DEFINER.
-- Without this, any signed-in user could insert arbitrary
-- notifications into anyone else's feed.
-- ============================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  type text not null check (type in ('order_created', 'order_updated', 'order_completed', 'order_deleted')),
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "users see only their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "users can mark their own notifications read"
  on public.notifications for update
  using (user_id = auth.uid());

-- select + update only -- see the security note above for why insert
-- is deliberately not granted here.
grant select, update on public.notifications to authenticated;

-- ============================================================
-- The trigger that actually creates notifications
-- ============================================================
create function public.handle_order_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor_id uuid;
  actor_email text;
  target_event_id uuid;
  order_note text;
  notif_type text;
begin
  -- Notifications are a best-effort side effect -- never let a failure
  -- here (e.g. a malformed event_id from before Events existed in
  -- Supabase; orders.event_id is text with no FK, see
  -- orders_phase.sql) roll back the actual order mutation that
  -- triggered it.
  begin
    actor_id := auth.uid();

    if TG_OP = 'DELETE' then
      target_event_id := old.event_id::uuid;
      order_note := old.note;
      notif_type := 'order_deleted';
    else
      target_event_id := new.event_id::uuid;
      order_note := new.note;
      if TG_OP = 'INSERT' then
        notif_type := 'order_created';
      elsif old.done is distinct from new.done and new.done then
        notif_type := 'order_completed';
      else
        notif_type := 'order_updated';
      end if;
    end if;

    select email into actor_email from public.users where id = actor_id;

    insert into public.notifications (user_id, event_id, type, payload)
    select
      em.user_id,
      target_event_id,
      notif_type,
      jsonb_build_object(
        'actor_email', coalesce(actor_email, 'Someone'),
        'order_note', nullif(order_note, ''),
        'event_name', (select event_name from public.events where id = target_event_id)
      )
    from public.event_members em
    where em.event_id = target_event_id
      and em.user_id is distinct from actor_id;
  exception when others then
    null;
  end;

  return coalesce(new, old);
end;
$$;

create trigger on_order_change
  after insert or update or delete on public.orders
  for each row execute function public.handle_order_change();

-- ============================================================
-- Realtime: push new notifications to their recipient live
-- ============================================================
alter publication supabase_realtime add table public.notifications;
