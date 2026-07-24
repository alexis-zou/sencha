// Core domain types for Matcha Stand.

// 'drink' items prompt for syrup/milk customization when added to an
// order; 'item' is any other product (food, merch) sold at a flat price.
export type MenuItemType = 'drink' | 'item';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  type: MenuItemType;
}

// Syrup and milk choices are both "name + optional upcharge" — modeled the
// same way since they behave identically as order customizations.
export interface FlavorOption {
  id: string;
  name: string;
  price: number;
}

export interface OrderLineItem {
  itemId: string;
  itemName: string;
  price: number; // base menu item unit price, denormalized at order time
  qty: number;
  // Only present when the item is type 'drink'.
  syrupId?: string;
  syrupName?: string;
  syrupPrice?: number;
  milkId?: string;
  milkName?: string;
  milkPrice?: number;
}

export interface Order {
  id: string;
  items: OrderLineItem[];
  note: string; // customer name / table, shown as the ticket header
  done: boolean;
  ts: number; // Date.now() at creation, used for sort order
}

// Starting stock per menu item (drinks + additional items only — syrup and
// milk are order customizations, not separately stocked products).
export type Inventory = Record<string, number>;

export type EventStatus = 'active' | 'ended';

export interface PopupEvent {
  id: string;
  eventName: string;
  eventDate: string; // "2026-07-25"
  startTime: string; // "09:00"
  endTime: string; // "13:00"
  inventory: Inventory;
  menu: MenuItem[]; // drinks (type 'drink') + additional items (type 'item')
  syrups: FlavorOption[];
  milks: FlavorOption[];
  orders: Order[];
  status: EventStatus;
  createdAt: number;
  endedAt: number | null;
}

// A reusable menu saved independently of any one event, so a stand doesn't
// have to re-enter drinks/syrups/milks/items for every recurring market.
export interface MenuTemplate {
  menu: MenuItem[];
  syrups: FlavorOption[];
  milks: FlavorOption[];
}

export type ViewName = 'auth' | 'home' | 'setup' | 'main' | 'summary';
// Tabs inside an active event's MainScreen. Note 'summary' here means the
// live, in-progress postcard tab (SummaryPage) — distinct from ViewName's
// 'summary', which is the read-only screen for an *ended* event.
export type MainPage = 'orders' | 'inventory' | 'summary';
export type AuthMode = 'signin' | 'signup';
