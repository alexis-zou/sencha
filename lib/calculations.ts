import { Order, OrderLineItem, PopupEvent } from './types';

export function usedByItem(itemId: string, ev: PopupEvent, excludeOrderId?: string | null): number {
  return ev.orders
    .filter((o) => o.id !== excludeOrderId)
    .reduce((sum, o) => sum + o.items.filter((it) => it.itemId === itemId).reduce((s, it) => s + it.qty, 0), 0);
}

export function remaining(itemId: string, ev: PopupEvent, excludeOrderId?: string | null): number {
  return (ev.inventory[itemId] ?? 0) - usedByItem(itemId, ev, excludeOrderId);
}

// Syrup/milk upcharges are added per unit, same as the base item price.
function lineUnitPrice(it: OrderLineItem): number {
  return it.price + (it.syrupPrice || 0) + (it.milkPrice || 0);
}

export function lineTotal(it: OrderLineItem): number {
  return lineUnitPrice(it) * it.qty;
}

export function totalProfit(ev: PopupEvent): number {
  return ev.orders.filter((o) => o.done).reduce((sum, o) => sum + o.items.reduce((s, it) => s + lineTotal(it), 0), 0);
}

export function orderTotal(o: Order): number {
  return o.items.reduce((s, it) => s + lineTotal(it), 0);
}

export function badgeClass(left: number): '' | 'low' | 'out' {
  if (left <= 0) return 'out';
  if (left < 10) return 'low';
  return '';
}

export function formatMoney(n: number): string {
  return '$' + n.toFixed(2).replace(/\.00$/, '');
}

export function formatEventDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatTimeRange(startTime?: string | null, endTime?: string | null): string {
  const start = startTime ? formatTime(startTime) : '';
  const end = endTime ? formatTime(endTime) : '';
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

export function formatEventDateTime(ev: Pick<PopupEvent, 'eventDate' | 'startTime' | 'endTime'>): string {
  const date = formatEventDate(ev.eventDate);
  const time = formatTimeRange(ev.startTime, ev.endTime);
  if (date && time) return `${date} · ${time}`;
  return date || time;
}

export function customBitsFor(it: { syrupName?: string; milkName?: string }): string[] {
  const bits: string[] = [];
  if (it.syrupName && it.syrupName !== 'None') bits.push(it.syrupName);
  if (it.milkName && it.milkName !== 'No Milk') bits.push(it.milkName);
  return bits;
}

export interface EventStats {
  income: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  avgOrderValue: number;
  itemsSold: { itemId: string; itemName: string; qty: number; subtotal: number }[]; // sorted desc by qty
  topSyrup: { name: string; count: number } | null;
  topMilk: { name: string; count: number } | null;
}

// Sales-facing stats, deliberately computed from *completed* orders only —
// matches the existing rule that Income only counts done orders, so a
// pending order in progress doesn't inflate "what actually sold."
export function computeEventStats(ev: PopupEvent): EventStats {
  const completed = ev.orders.filter((o) => o.done);
  const income = totalProfit(ev);

  const itemQty: Record<string, { itemName: string; qty: number; subtotal: number }> = {};
  const syrupCount: Record<string, number> = {};
  const milkCount: Record<string, number> = {};

  completed.forEach((o) => {
    o.items.forEach((it) => {
      if (!itemQty[it.itemId]) itemQty[it.itemId] = { itemName: it.itemName, qty: 0, subtotal: 0 };
      itemQty[it.itemId].qty += it.qty;
      itemQty[it.itemId].subtotal += lineTotal(it);
      if (it.syrupName && it.syrupName !== 'None') syrupCount[it.syrupName] = (syrupCount[it.syrupName] || 0) + it.qty;
      if (it.milkName && it.milkName !== 'No Milk') milkCount[it.milkName] = (milkCount[it.milkName] || 0) + it.qty;
    });
  });

  const topOf = (rec: Record<string, number>): { name: string; count: number } | null => {
    const entries = Object.entries(rec);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return { name: entries[0][0], count: entries[0][1] };
  };

  return {
    income,
    totalOrders: ev.orders.length,
    completedOrders: completed.length,
    pendingOrders: ev.orders.length - completed.length,
    avgOrderValue: completed.length > 0 ? income / completed.length : 0,
    itemsSold: Object.entries(itemQty)
      .map(([itemId, v]) => ({ itemId, itemName: v.itemName, qty: v.qty, subtotal: v.subtotal }))
      .sort((a, b) => b.qty - a.qty),
    topSyrup: topOf(syrupCount),
    topMilk: topOf(milkCount),
  };
}
