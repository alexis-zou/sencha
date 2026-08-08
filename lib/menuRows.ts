// Shared "menu row" editing model used by both the new-event setup
// wizard (SetupScreen) and the mid-event menu editor (SettingsModal) --
// a lightweight draft shape (string price, so an input can hold "" or
// a half-typed value) that gets converted to/from the real MenuItem/
// FlavorOption shape at the boundaries.

import { uid } from '@/lib/id';
import { FlavorOption, MenuItem, MenuItemType } from '@/lib/types';

export interface Row {
  id: string;
  name: string;
  price: string;
}

export const newRow = (): Row => ({ id: uid(), name: '', price: '' });

export function menuItemToRow(item: MenuItem): Row {
  return { id: item.id, name: item.name, price: String(item.price) };
}

export function flavorOptionToRow(opt: FlavorOption): Row {
  return { id: opt.id, name: opt.name, price: opt.price ? String(opt.price) : '' };
}

export function rowsToMenuItems(rows: Row[], type: MenuItemType): MenuItem[] {
  return rows
    .map((r) => ({ id: r.id, name: r.name.trim(), price: parseFloat(r.price), type }))
    .filter((m) => m.name && !isNaN(m.price));
}

export function rowsToFlavorOptions(rows: Row[]): FlavorOption[] {
  return rows
    .map((r) => ({ id: r.id, name: r.name.trim(), price: parseFloat(r.price || '0') || 0 }))
    .filter((f) => f.name);
}

// Drinks and additional items both require a price (syrup/milk don't) --
// a row with a name but no valid price would otherwise be silently
// dropped by rowsToMenuItems with no feedback, vanishing from every
// later screen (inventory, order picker, summary) with no trace.
export function findRowMissingPrice(rows: Row[]): string | null {
  const row = rows.find((r) => r.name.trim() && isNaN(parseFloat(r.price)));
  return row ? row.name.trim() : null;
}
