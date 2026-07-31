// Data access for the Orders feature, backed by Supabase (see
// supabase/orders_phase.sql). This is the only place that knows about
// the orders/order_items table shape -- everything above this layer
// (AppStateContext, OrdersPage, OrderPanel, TicketCard) still speaks
// in the app's existing Order/OrderLineItem types from lib/types.ts.

import type { SupabaseClient } from '@supabase/supabase-js';
import { Order, OrderLineItem } from '@/lib/types';

interface OrderRow {
  id: string;
  event_id: string;
  note: string;
  done: boolean;
  ts: number;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  item_id: string;
  item_name: string;
  price: number;
  qty: number;
  syrup_id: string | null;
  syrup_name: string | null;
  syrup_price: number | null;
  milk_id: string | null;
  milk_name: string | null;
  milk_price: number | null;
}

// Postgres `numeric` columns come back from PostgREST as JSON strings
// (not numbers) to avoid float precision loss -- every numeric field read
// off a row must be coerced explicitly, or downstream arithmetic
// (lineTotal, orderTotal) silently does string concatenation instead of
// addition.
function toLineItem(row: OrderItemRow): OrderLineItem {
  const item: OrderLineItem = {
    itemId: row.item_id,
    itemName: row.item_name,
    price: Number(row.price),
    qty: row.qty,
  };
  if (row.syrup_id) {
    item.syrupId = row.syrup_id;
    item.syrupName = row.syrup_name ?? undefined;
    item.syrupPrice = row.syrup_price != null ? Number(row.syrup_price) : undefined;
  }
  if (row.milk_id) {
    item.milkId = row.milk_id;
    item.milkName = row.milk_name ?? undefined;
    item.milkPrice = row.milk_price != null ? Number(row.milk_price) : undefined;
  }
  return item;
}

function toItemRows(orderId: string, items: OrderLineItem[]) {
  return items.map((it) => ({
    order_id: orderId,
    item_id: it.itemId,
    item_name: it.itemName,
    price: it.price,
    qty: it.qty,
    syrup_id: it.syrupId ?? null,
    syrup_name: it.syrupName ?? null,
    syrup_price: it.syrupPrice ?? null,
    milk_id: it.milkId ?? null,
    milk_name: it.milkName ?? null,
    milk_price: it.milkPrice ?? null,
  }));
}

// Fetches every order belonging to the signed-in user, across all of
// their events, grouped by event_id -- mirrors how the app already
// loads its entire events[] array in one shot at login.
export async function fetchOrdersByEvent(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, Order[]>> {
  const { data: orderRows, error: ordersErr } = await supabase
    .from('orders')
    .select('id, event_id, note, done, ts')
    .eq('user_id', userId);
  if (ordersErr || !orderRows) return {};

  const orderIds = orderRows.map((o) => o.id);
  let itemRows: OrderItemRow[] = [];
  if (orderIds.length > 0) {
    const { data, error } = await supabase.from('order_items').select('*').in('order_id', orderIds);
    if (!error && data) itemRows = data as OrderItemRow[];
  }

  const itemsByOrder: Record<string, OrderLineItem[]> = {};
  itemRows.forEach((row) => {
    (itemsByOrder[row.order_id] ||= []).push(toLineItem(row));
  });

  const grouped: Record<string, Order[]> = {};
  (orderRows as OrderRow[]).forEach((row) => {
    const order: Order = {
      id: row.id,
      note: row.note,
      done: row.done,
      ts: row.ts,
      items: itemsByOrder[row.id] || [],
    };
    (grouped[row.event_id] ||= []).push(order);
  });
  return grouped;
}

export async function createOrder(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  note: string,
  items: OrderLineItem[]
): Promise<Order> {
  const ts = Date.now();
  const { data: orderRow, error } = await supabase
    .from('orders')
    .insert({ event_id: eventId, user_id: userId, note, done: false, ts })
    .select('id, event_id, note, done, ts')
    .single();
  if (error || !orderRow) throw error || new Error('Failed to create order');

  if (items.length > 0) {
    const { error: itemsErr } = await supabase.from('order_items').insert(toItemRows(orderRow.id, items));
    if (itemsErr) throw itemsErr;
  }

  return { id: orderRow.id, note: orderRow.note, done: orderRow.done, ts: orderRow.ts, items };
}

// Full replace of an order's note + items, matching the app's existing
// "edit order" semantics (OrderPanel always submits the complete draft,
// not a partial diff).
export async function updateOrder(
  supabase: SupabaseClient,
  orderId: string,
  note: string,
  items: OrderLineItem[]
): Promise<void> {
  const { error } = await supabase.from('orders').update({ note }).eq('id', orderId);
  if (error) throw error;

  const { error: delErr } = await supabase.from('order_items').delete().eq('order_id', orderId);
  if (delErr) throw delErr;

  if (items.length > 0) {
    const { error: insErr } = await supabase.from('order_items').insert(toItemRows(orderId, items));
    if (insErr) throw insErr;
  }
}

export async function setOrderDone(supabase: SupabaseClient, orderId: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('orders').update({ done }).eq('id', orderId);
  if (error) throw error;
}

export async function deleteOrder(supabase: SupabaseClient, orderId: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', orderId);
  if (error) throw error;
}
