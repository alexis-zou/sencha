// Data access for Events/Inventory/Settings, backed by Supabase (see
// supabase/inventory_events_phase.sql). This is the only place that
// knows about the events/menu_items/inventory/flavor_options table
// shape -- everything above this layer still speaks in PopupEvent from
// lib/types.ts. Orders are handled separately (lib/supabase/orders.ts)
// and merged in by AppStateContext, not by this module.

import type { SupabaseClient } from '@supabase/supabase-js';
import { EventStatus, FlavorOption, MenuItem, MenuItemType, PopupEvent } from '@/lib/types';
import type { NewEventInput } from '@/context/AppStateContext';

interface EventRow {
  id: string;
  event_name: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  created_at: string;
  ended_at: string | null;
}

interface MenuItemRow {
  id: string;
  event_id: string;
  name: string;
  price: number | string;
  type: string;
}

interface FlavorOptionRow {
  id: string;
  event_id: string;
  kind: string;
  name: string;
  price: number | string;
}

function eventRowToBase(row: EventRow): Omit<PopupEvent, 'inventory' | 'menu' | 'syrups' | 'milks' | 'orders'> {
  return {
    id: row.id,
    eventName: row.event_name,
    eventDate: row.event_date || '',
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    status: row.status as EventStatus,
    createdAt: new Date(row.created_at).getTime(),
    endedAt: row.ended_at ? new Date(row.ended_at).getTime() : null,
  };
}

// Fetches every event the signed-in user has access to -- owned or
// invited as a collaborator (see supabase/collaboration_phase.sql) --
// with menu items, starting inventory, and syrup/milk options assembled
// into the app's existing PopupEvent shape. No client-side ownership
// filter here: RLS on the `events` table already scopes this to
// event_members rows for the current user, so a plain select returns
// exactly the right set for owner and invited members alike. `orders`
// always comes back empty -- AppStateContext merges those in separately
// from lib/supabase/orders.ts.
export async function fetchEvents(supabase: SupabaseClient): Promise<PopupEvent[]> {
  const { data: eventRows, error } = await supabase
    .from('events')
    .select('id, event_name, event_date, start_time, end_time, status, created_at, ended_at');
  if (error || !eventRows || eventRows.length === 0) return [];

  const eventIds = (eventRows as EventRow[]).map((e) => e.id);

  const [{ data: menuRows }, { data: flavorRows }] = await Promise.all([
    supabase
      .from('menu_items')
      .select('id, event_id, name, price, type')
      .in('event_id', eventIds)
      .order('sort_order'),
    supabase
      .from('flavor_options')
      .select('id, event_id, kind, name, price')
      .in('event_id', eventIds)
      .order('sort_order'),
  ]);

  const menuItemIds = ((menuRows as MenuItemRow[]) || []).map((m) => m.id);
  const { data: invRows } =
    menuItemIds.length > 0
      ? await supabase.from('inventory').select('menu_item_id, starting_count').in('menu_item_id', menuItemIds)
      : { data: [] as { menu_item_id: string; starting_count: number }[] };

  const invByItem: Record<string, number> = {};
  (invRows || []).forEach((r) => {
    invByItem[r.menu_item_id] = r.starting_count;
  });

  const menuByEvent: Record<string, MenuItem[]> = {};
  ((menuRows as MenuItemRow[]) || []).forEach((r) => {
    (menuByEvent[r.event_id] ||= []).push({
      id: r.id,
      name: r.name,
      price: Number(r.price),
      type: r.type as MenuItemType,
    });
  });

  const syrupsByEvent: Record<string, FlavorOption[]> = {};
  const milksByEvent: Record<string, FlavorOption[]> = {};
  ((flavorRows as FlavorOptionRow[]) || []).forEach((r) => {
    const bucket = r.kind === 'syrup' ? syrupsByEvent : milksByEvent;
    (bucket[r.event_id] ||= []).push({ id: r.id, name: r.name, price: Number(r.price) });
  });

  return (eventRows as EventRow[]).map((row) => {
    const menu = menuByEvent[row.id] || [];
    const inventory: Record<string, number> = {};
    menu.forEach((m) => {
      inventory[m.id] = invByItem[m.id] ?? 0;
    });
    return {
      ...eventRowToBase(row),
      menu,
      inventory,
      syrups: syrupsByEvent[row.id] || [],
      milks: milksByEvent[row.id] || [],
      orders: [],
    };
  });
}

async function insertFlavorOptions(
  supabase: SupabaseClient,
  eventId: string,
  kind: 'syrup' | 'milk',
  rows: FlavorOption[]
): Promise<FlavorOption[]> {
  if (rows.length === 0) return [];
  const { data, error } = await supabase
    .from('flavor_options')
    .insert(rows.map((f, i) => ({ event_id: eventId, kind, name: f.name, price: f.price, sort_order: i })))
    .select('id, name, price');
  if (error || !data) throw error || new Error(`Failed to create ${kind} options`);
  return data.map((r) => ({ id: r.id, name: r.name, price: Number(r.price) }));
}

export async function createEventRemote(
  supabase: SupabaseClient,
  userId: string,
  input: NewEventInput
): Promise<PopupEvent> {
  const { data: eventRow, error } = await supabase
    .from('events')
    .insert({
      user_id: userId,
      event_name: input.eventName,
      event_date: input.eventDate || null,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
    })
    .select('id, event_name, event_date, start_time, end_time, status, created_at, ended_at')
    .single();
  if (error || !eventRow) throw error || new Error('Failed to create event');
  const eventId = (eventRow as EventRow).id;

  async function insertMenuAndInventory(): Promise<{ menu: MenuItem[]; inventory: Record<string, number> }> {
    if (input.menu.length === 0) return { menu: [], inventory: {} };
    const { data: menuRows, error: menuErr } = await supabase
      .from('menu_items')
      .insert(input.menu.map((m, i) => ({ event_id: eventId, name: m.name, price: m.price, type: m.type, sort_order: i })))
      .select('id, name, price, type');
    if (menuErr || !menuRows) throw menuErr || new Error('Failed to create menu items');

    const invPayload = (menuRows as MenuItemRow[]).map((r, i) => ({
      menu_item_id: r.id,
      starting_count: input.inventory[input.menu[i].id] ?? 0,
    }));
    const { error: invErr } = await supabase.from('inventory').insert(invPayload);
    if (invErr) throw invErr;

    const menu = (menuRows as MenuItemRow[]).map((r) => ({
      id: r.id,
      name: r.name,
      price: Number(r.price),
      type: r.type as MenuItemType,
    }));
    const inventory: Record<string, number> = {};
    invPayload.forEach((p) => {
      inventory[p.menu_item_id] = p.starting_count;
    });
    return { menu, inventory };
  }

  const [{ menu, inventory }, syrups, milks] = await Promise.all([
    insertMenuAndInventory(),
    insertFlavorOptions(supabase, eventId, 'syrup', input.syrups),
    insertFlavorOptions(supabase, eventId, 'milk', input.milks),
  ]);

  return {
    ...eventRowToBase(eventRow as EventRow),
    menu,
    inventory,
    syrups,
    milks,
    orders: [],
  };
}

export interface EventSettingsPatch {
  eventName?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  inventory?: Record<string, number>;
}

export async function updateEventSettingsRemote(
  supabase: SupabaseClient,
  eventId: string,
  patch: EventSettingsPatch
): Promise<void> {
  const eventPatch: Record<string, string> = {};
  if (patch.eventName !== undefined) eventPatch.event_name = patch.eventName;
  if (patch.eventDate !== undefined) eventPatch.event_date = patch.eventDate;
  if (patch.startTime !== undefined) eventPatch.start_time = patch.startTime;
  if (patch.endTime !== undefined) eventPatch.end_time = patch.endTime;

  const tasks: PromiseLike<{ error: { message: string } | null }>[] = [];
  if (Object.keys(eventPatch).length > 0) {
    tasks.push(supabase.from('events').update(eventPatch).eq('id', eventId));
  }
  if (patch.inventory) {
    Object.entries(patch.inventory).forEach(([menuItemId, count]) => {
      tasks.push(supabase.from('inventory').update({ starting_count: count }).eq('menu_item_id', menuItemId));
    });
  }
  const results = await Promise.all(tasks);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export async function endEventRemote(supabase: SupabaseClient, eventId: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', eventId);
  if (error) throw error;
}
