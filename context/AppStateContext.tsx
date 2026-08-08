'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchOrdersByEvent,
  createOrder as createOrderRemote,
  updateOrder as updateOrderRemote,
  setOrderDone as setOrderDoneRemote,
  deleteOrder as deleteOrderRemote,
  subscribeToOrders,
} from '@/lib/supabase/orders';
import {
  fetchEvents,
  createEventRemote,
  updateEventSettingsRemote,
  endEventRemote,
  EventSettingsPatch,
} from '@/lib/supabase/events';
import {
  fetchMembers,
  inviteMember as inviteMemberRemote,
  checkEmailRegistered as checkEmailRegisteredRemote,
  EventMember,
} from '@/lib/supabase/members';
import {
  fetchNotifications,
  markAllNotificationsRead,
  subscribeToNotifications,
  AppNotification,
} from '@/lib/supabase/notifications';
import { storage } from '@/lib/storage';
import { menuTemplateKey } from '@/lib/constants';
import { uid } from '@/lib/id';
import { AuthMode, MainPage, MenuTemplate, Order, OrderLineItem, PopupEvent, ViewName } from '@/lib/types';

export interface NewEventInput {
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  inventory: PopupEvent['inventory'];
  menu: PopupEvent['menu'];
  syrups: PopupEvent['syrups'];
  milks: PopupEvent['milks'];
}

interface AppStateValue {
  view: ViewName;
  loading: boolean;

  authMode: AuthMode;
  setAuthMode: (m: AuthMode) => void;
  authError: string;
  authInfo: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  currentUser: string | null;
  events: PopupEvent[];

  activeEvent: PopupEvent | null;
  activePage: MainPage;
  setActivePage: (p: MainPage) => void;

  summaryEvent: PopupEvent | null;

  goHome: () => void;
  goToAuth: () => void;
  goToSetup: () => void;
  createEvent: (input: NewEventInput) => Promise<PopupEvent>;
  openEvent: (id: string) => void;
  endActiveEvent: () => Promise<void>;
  updateEventSettings: (patch: EventSettingsPatch) => Promise<void>;
  saveMenuTemplate: (tpl: MenuTemplate) => Promise<void>;
  loadMenuTemplate: () => Promise<MenuTemplate | null>;

  // Orders live in Supabase now (see lib/supabase/orders.ts) -- these are
  // the only way to mutate an order (see OrdersPage.tsx).
  addOrder: (note: string, items: OrderLineItem[], customerPhone: string) => Promise<void>;
  editOrder: (orderId: string, note: string, items: OrderLineItem[], customerPhone: string) => Promise<void>;
  toggleOrderDone: (orderId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;

  // Collaborative access (see lib/supabase/members.ts). Only the event's
  // owner can invite -- enforced by RLS, not by hiding the action here.
  // Both take an explicit eventId (not the implicit activeEventId the
  // order functions use) because the setup wizard needs to invite right
  // after creating a brand-new event, in the same handler -- the
  // component's `inviteMember` closure wouldn't see a freshly-set
  // activeEventId until the next render, so implicit lookup would invite
  // against the wrong (or no) event.
  fetchEventMembers: (eventId: string) => Promise<EventMember[]>;
  inviteMember: (eventId: string, email: string) => Promise<EventMember>;
  checkEmailRegistered: (email: string) => Promise<boolean>;
  debugWhoAmI: () => Promise<string>; // TEMPORARY DEBUG -- remove after diagnosis

  // In-app notifications (see lib/supabase/notifications.ts). Spans every
  // event the user belongs to, not just the active one -- a teammate's
  // change should surface even while browsing Home or a different event.
  notifications: AppNotification[];
  unreadCount: number;
  markNotificationsRead: () => Promise<void>;
  toasts: AppNotification[];
  dismissToast: (id: string) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewName>('landing');
  const [authMode, setAuthModeState] = useState<AuthMode>('signin');
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');

  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<PopupEvent[]>([]);
  // Orders, keyed by event id -- fetched from Supabase, kept separate from
  // `events` (which stays localStorage-backed and never carries real order
  // data anymore; see the merge in eventsWithOrders below).
  const [ordersByEvent, setOrdersByEvent] = useState<Record<string, Order[]>>({});
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [summaryEventId, setSummaryEventId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<MainPage>('orders');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  const supabase = useMemo(() => createClient(), []);

  // Single place that touches ordersByEvent's shape -- addOrder, editOrder,
  // toggleOrderDone, deleteOrder, and the realtime handler below all used
  // to repeat the same `{ ...prev, [eventId]: <transform>(prev[eventId]) }`
  // spread by hand. Also used to roll an optimistic update back to its
  // prior state if the underlying write fails.
  function applyOrdersUpdate(eventId: string, updater: (orders: Order[]) => Order[]) {
    setOrdersByEvent((prev) => ({ ...prev, [eventId]: updater(prev[eventId] || []) }));
  }

  async function loadUserInto(email: string, userId: string) {
    setCurrentUser(email);
    setCurrentUserId(userId);
    const [loadedEvents, grouped, loadedNotifications] = await Promise.all([
      fetchEvents(supabase),
      fetchOrdersByEvent(supabase),
      fetchNotifications(supabase, userId),
    ]);
    setEvents(loadedEvents);
    setOrdersByEvent(grouped);
    setNotifications(loadedNotifications);
    setView((v) => (v === 'setup' || v === 'main' || v === 'summary' ? v : 'home'));
  }

  // ---- auth is Supabase-backed now: one listener is the single source of
  // truth for both the initial bootstrap (it fires once immediately with
  // whatever session already exists, restored from Supabase's own cookie)
  // and every later transition (sign in, sign out, token refresh, a
  // session expiring or being revoked in another tab). This is also what
  // "protects the dashboard": losing a valid session for any reason drops
  // the view back to 'landing', so Home/Setup/Main/Summary are never
  // reachable without a live Supabase session. ----
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const email = session?.user?.email;
      const userId = session?.user?.id;
      if (email && userId) {
        loadUserInto(email, userId);
      } else {
        setCurrentUser(null);
        setCurrentUserId(null);
        setEvents([]);
        setOrdersByEvent({});
        setNotifications([]);
        setToasts([]);
        setActiveEventId(null);
        setSummaryEventId(null);
        // An explicit sign-out (or a session lost elsewhere) drops straight
        // to the sign-in form, same as before Supabase -- only a visitor
        // who was never signed in at all sees the landing/marketing page.
        setView(event === 'SIGNED_OUT' ? 'auth' : 'landing');
      }
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- live orders: every insert/update/delete on the active event's
  // orders, from any connected client (including teammates on a shared
  // event), reconciles into the same ordersByEvent state addOrder/
  // editOrder/etc. already update optimistically for the acting client's
  // own actions. The upsert is dedup-safe by id, so the client that made
  // a change doesn't end up with a duplicate when its own event echoes
  // back a moment later. ----
  useEffect(() => {
    if (!activeEventId) return;
    const unsubscribe = subscribeToOrders(supabase, activeEventId, (event) => {
      applyOrdersUpdate(activeEventId, (orders) => {
        if (event.type === 'delete') {
          return orders.filter((o) => o.id !== event.orderId);
        }
        const idx = orders.findIndex((o) => o.id === event.order.id);
        return idx === -1 ? [...orders, event.order] : orders.map((o, i) => (i === idx ? event.order : o));
      });
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEventId]);

  // ---- live notifications: one subscription per signed-in session (not
  // per active event -- a teammate's change to *any* shared event should
  // surface here, whichever screen you're actually looking at). New rows
  // both prepend to the notifications list (badge count) and enter the
  // toast queue (transient, see ToastHost). ----
  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeToNotifications(supabase, currentUserId, (n) => {
      setNotifications((prev) => [n, ...prev]);
      setToasts((prev) => [...prev, n]);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  function setAuthMode(m: AuthMode) {
    setAuthModeState(m);
    setAuthError('');
    setAuthInfo('');
  }

  async function signIn(email: string, password: string) {
    const e = email.trim().toLowerCase();
    if (!e || !password) {
      setAuthError('Enter both an email and a password.');
      return;
    }
    setAuthError('');
    setAuthInfo('');
    const { error } = await supabase.auth.signInWithPassword({ email: e, password });
    if (error) {
      setAuthError(error.message);
      return;
    }
    // onAuthStateChange fires SIGNED_IN and takes it from here.
  }

  async function signUp(email: string, password: string) {
    const e = email.trim().toLowerCase();
    if (!e || !password) {
      setAuthError('Enter both an email and a password.');
      return;
    }
    setAuthError('');
    setAuthInfo('');
    const { data, error } = await supabase.auth.signUp({ email: e, password });
    if (error) {
      setAuthError(error.message);
      return;
    }
    if (!data.session) {
      // Email confirmation is required on this project -- no session yet,
      // so onAuthStateChange won't fire with a user until they click the
      // confirmation link and come back to sign in.
      setAuthInfo('Almost there — check your email to confirm your account, then sign in.');
      setAuthModeState('signin');
    }
    // If a session did come back (confirmations disabled), onAuthStateChange
    // fires SIGNED_IN and logs them straight in.
  }

  async function signOut() {
    await supabase.auth.signOut();
    // onAuthStateChange fires SIGNED_OUT and resets state/view.
  }

  function goHome() {
    setActiveEventId(null);
    setSummaryEventId(null);
    setView('home');
  }

  function goToAuth() {
    setView('auth');
  }

  function goToSetup() {
    setView('setup');
  }

  async function createEvent(input: NewEventInput): Promise<PopupEvent> {
    if (!currentUserId) throw new Error('Not signed in.');
    const newEvent = await createEventRemote(supabase, currentUserId, input);
    setEvents((prev) => [...prev, newEvent]);
    setActiveEventId(newEvent.id);
    setActivePage('orders');
    setView('main');
    return newEvent;
  }

  async function saveMenuTemplate(tpl: MenuTemplate) {
    if (!currentUser) return;
    await storage.set(menuTemplateKey(currentUser), JSON.stringify(tpl));
  }

  async function loadMenuTemplate(): Promise<MenuTemplate | null> {
    if (!currentUser) return null;
    const res = await storage.get(menuTemplateKey(currentUser));
    if (!res?.value) return null;
    try {
      return JSON.parse(res.value) as MenuTemplate;
    } catch {
      return null;
    }
  }

  function openEvent(id: string) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    if (ev.status === 'active') {
      setActiveEventId(id);
      setActivePage('orders');
      setView('main');
    } else {
      setSummaryEventId(id);
      setView('summary');
    }
  }

  async function endActiveEvent() {
    if (!activeEventId) return;
    await endEventRemote(supabase, activeEventId);
    setEvents((prev) =>
      prev.map((e) => (e.id === activeEventId ? { ...e, status: 'ended' as const, endedAt: Date.now() } : e))
    );
    setActiveEventId(null);
    setView('home');
  }

  async function updateEventSettings(patch: EventSettingsPatch) {
    if (!activeEventId) return;
    const current = events.find((e) => e.id === activeEventId);
    if (!current) return;
    const result = await updateEventSettingsRemote(supabase, activeEventId, patch, current);
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== activeEventId) return e;
        const next = { ...e };
        if (patch.eventName !== undefined) next.eventName = patch.eventName;
        if (patch.eventDate !== undefined) next.eventDate = patch.eventDate;
        if (patch.startTime !== undefined) next.startTime = patch.startTime;
        if (patch.endTime !== undefined) next.endTime = patch.endTime;
        // Menu/inventory/syrups/milks come back from the server with
        // real ids (new rows only had a client-side temp id going in),
        // so these replace rather than merge into the previous state.
        if (result.menu) next.menu = result.menu;
        if (result.inventory) next.inventory = result.inventory;
        else if (patch.inventory) next.inventory = { ...e.inventory, ...patch.inventory };
        if (result.syrups) next.syrups = result.syrups;
        if (result.milks) next.milks = result.milks;
        return next;
      })
    );
  }

  async function fetchEventMembers(eventId: string): Promise<EventMember[]> {
    return fetchMembers(supabase, eventId);
  }

  async function inviteMember(eventId: string, email: string): Promise<EventMember> {
    return inviteMemberRemote(supabase, eventId, email);
  }

  async function checkEmailRegistered(email: string): Promise<boolean> {
    return checkEmailRegisteredRemote(supabase, email);
  }

  // TEMPORARY DEBUG -- diagnosing the events-insert RLS failure. Remove
  // once resolved (see SetupScreen.tsx's catch block, which is the only
  // caller).
  async function debugWhoAmI(): Promise<string> {
    const { data, error } = await supabase.rpc('debug_whoami');
    if (error) return `debug_whoami error: ${error.message}`;
    return JSON.stringify(data);
  }

  async function markNotificationsRead() {
    if (!currentUserId) return;
    const previouslyUnreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (previouslyUnreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead(supabase, currentUserId);
    } catch {
      // Best-effort: roll the badge back rather than leave it silently
      // wrong (server still has these unread) with no way to retell they
      // failed -- the next bell tap just tries again.
      setNotifications((prev) =>
        prev.map((n) => (previouslyUnreadIds.includes(n.id) ? { ...n, isRead: false } : n))
      );
    }
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  // Single merge point: every event handed to the rest of the app gets its
  // `.orders` overlaid from Supabase, so HomeScreen, InventoryPage's stock
  // math, SummaryPage, TicketCard etc. all keep working unmodified -- they
  // still just read `event.orders`, unaware it now comes from a different
  // source than the rest of the event object.
  const eventsWithOrders = useMemo(
    () => events.map((e) => ({ ...e, orders: ordersByEvent[e.id] || [] })),
    [events, ordersByEvent]
  );

  const activeEvent = useMemo(
    () => eventsWithOrders.find((e) => e.id === activeEventId) || null,
    [eventsWithOrders, activeEventId]
  );
  const summaryEvent = useMemo(
    () => eventsWithOrders.find((e) => e.id === summaryEventId) || null,
    [eventsWithOrders, summaryEventId]
  );

  // All four order mutations below are optimistic: local state updates
  // first (so checking off / adding / deleting an order feels instant,
  // matching the app's own "usable under time pressure" design goal),
  // then the write fires, and on failure the optimistic change is rolled
  // back and the error re-thrown so the calling page's own try/catch
  // (see OrdersPage.tsx) can surface it. Contrast with createEvent/
  // endActiveEvent/updateEventSettings, which stay await-then-update on
  // purpose -- those are exactly the cases where showing success before
  // it's confirmed would be wrong (e.g. navigating into an event that
  // turns out not to have been created).

  async function addOrder(note: string, items: OrderLineItem[], customerPhone: string) {
    if (!activeEventId || !currentUserId) return;
    const eventId = activeEventId;
    const tempId = `temp-${uid()}`;
    applyOrdersUpdate(eventId, (orders) => [
      ...orders,
      { id: tempId, note, done: false, ts: Date.now(), items, customerPhone: customerPhone || undefined },
    ]);
    try {
      const newOrder = await createOrderRemote(supabase, currentUserId, eventId, note, items, customerPhone);
      applyOrdersUpdate(eventId, (orders) => {
        const withoutTemp = orders.filter((o) => o.id !== tempId);
        // The realtime echo of this same insert can land before this
        // await resolves and already have added the real row -- don't
        // add it twice.
        return withoutTemp.some((o) => o.id === newOrder.id) ? withoutTemp : [...withoutTemp, newOrder];
      });
    } catch (err) {
      applyOrdersUpdate(eventId, (orders) => orders.filter((o) => o.id !== tempId));
      throw err;
    }
  }

  async function editOrder(orderId: string, note: string, items: OrderLineItem[], customerPhone: string) {
    if (!activeEventId) return;
    const eventId = activeEventId;
    const previous = (ordersByEvent[eventId] || []).find((o) => o.id === orderId);
    applyOrdersUpdate(eventId, (orders) =>
      orders.map((o) => (o.id === orderId ? { ...o, note, items, customerPhone: customerPhone || undefined } : o))
    );
    try {
      await updateOrderRemote(supabase, orderId, note, items, customerPhone);
    } catch (err) {
      if (previous) {
        applyOrdersUpdate(eventId, (orders) => orders.map((o) => (o.id === orderId ? previous : o)));
      }
      throw err;
    }
  }

  async function toggleOrderDone(orderId: string) {
    if (!activeEventId) return;
    const eventId = activeEventId;
    const current = (ordersByEvent[eventId] || []).find((o) => o.id === orderId);
    if (!current) return;
    const nextDone = !current.done;
    applyOrdersUpdate(eventId, (orders) => orders.map((o) => (o.id === orderId ? { ...o, done: nextDone } : o)));
    try {
      await setOrderDoneRemote(supabase, orderId, nextDone);
    } catch (err) {
      applyOrdersUpdate(eventId, (orders) => orders.map((o) => (o.id === orderId ? { ...o, done: current.done } : o)));
      throw err;
    }
  }

  async function deleteOrder(orderId: string) {
    if (!activeEventId) return;
    const eventId = activeEventId;
    const removed = (ordersByEvent[eventId] || []).find((o) => o.id === orderId);
    applyOrdersUpdate(eventId, (orders) => orders.filter((o) => o.id !== orderId));
    try {
      await deleteOrderRemote(supabase, orderId);
    } catch (err) {
      if (removed) {
        applyOrdersUpdate(eventId, (orders) => (orders.some((o) => o.id === orderId) ? orders : [...orders, removed]));
      }
      throw err;
    }
  }

  const value: AppStateValue = {
    view,
    loading,
    authMode,
    setAuthMode,
    authError,
    authInfo,
    signIn,
    signUp,
    signOut,
    currentUser,
    events: eventsWithOrders,
    activeEvent,
    activePage,
    setActivePage,
    summaryEvent,
    goHome,
    goToAuth,
    goToSetup,
    createEvent,
    openEvent,
    endActiveEvent,
    updateEventSettings,
    saveMenuTemplate,
    loadMenuTemplate,
    addOrder,
    editOrder,
    toggleOrderDone,
    deleteOrder,
    fetchEventMembers,
    inviteMember,
    checkEmailRegistered,
    debugWhoAmI,
    notifications,
    unreadCount,
    markNotificationsRead,
    toasts,
    dismissToast,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext<AppStateValue | null>(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
