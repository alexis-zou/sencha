'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchOrdersByEvent,
  createOrder as createOrderRemote,
  updateOrder as updateOrderRemote,
  setOrderDone as setOrderDoneRemote,
  deleteOrder as deleteOrderRemote,
} from '@/lib/supabase/orders';
import {
  fetchEvents,
  createEventRemote,
  updateEventSettingsRemote,
  endEventRemote,
  EventSettingsPatch,
} from '@/lib/supabase/events';
import { storage } from '@/lib/storage';
import { menuTemplateKey } from '@/lib/constants';
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
  createEvent: (input: NewEventInput) => Promise<void>;
  openEvent: (id: string) => void;
  endActiveEvent: () => Promise<void>;
  updateEventSettings: (patch: EventSettingsPatch) => Promise<void>;
  saveMenuTemplate: (tpl: MenuTemplate) => Promise<void>;
  loadMenuTemplate: () => Promise<MenuTemplate | null>;

  // Orders live in Supabase now (see lib/supabase/orders.ts) -- these are
  // the only way to mutate an order (see OrdersPage.tsx).
  addOrder: (note: string, items: OrderLineItem[]) => Promise<void>;
  editOrder: (orderId: string, note: string, items: OrderLineItem[]) => Promise<void>;
  toggleOrderDone: (orderId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
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

  const supabase = useMemo(() => createClient(), []);

  async function loadUserInto(email: string, userId: string) {
    setCurrentUser(email);
    setCurrentUserId(userId);
    const [loadedEvents, grouped] = await Promise.all([
      fetchEvents(supabase, userId),
      fetchOrdersByEvent(supabase, userId),
    ]);
    setEvents(loadedEvents);
    setOrdersByEvent(grouped);
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

  async function createEvent(input: NewEventInput) {
    if (!currentUserId) return;
    const newEvent = await createEventRemote(supabase, currentUserId, input);
    setEvents((prev) => [...prev, newEvent]);
    setActiveEventId(newEvent.id);
    setActivePage('orders');
    setView('main');
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
    await updateEventSettingsRemote(supabase, activeEventId, patch);
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== activeEventId) return e;
        const next = { ...e };
        if (patch.eventName !== undefined) next.eventName = patch.eventName;
        if (patch.eventDate !== undefined) next.eventDate = patch.eventDate;
        if (patch.startTime !== undefined) next.startTime = patch.startTime;
        if (patch.endTime !== undefined) next.endTime = patch.endTime;
        if (patch.inventory) next.inventory = { ...e.inventory, ...patch.inventory };
        return next;
      })
    );
  }

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

  async function addOrder(note: string, items: OrderLineItem[]) {
    if (!activeEventId || !currentUserId) return;
    const newOrder = await createOrderRemote(supabase, currentUserId, activeEventId, note, items);
    setOrdersByEvent((prev) => ({ ...prev, [activeEventId]: [...(prev[activeEventId] || []), newOrder] }));
  }

  async function editOrder(orderId: string, note: string, items: OrderLineItem[]) {
    if (!activeEventId) return;
    await updateOrderRemote(supabase, orderId, note, items);
    setOrdersByEvent((prev) => ({
      ...prev,
      [activeEventId]: (prev[activeEventId] || []).map((o) => (o.id === orderId ? { ...o, note, items } : o)),
    }));
  }

  async function toggleOrderDone(orderId: string) {
    if (!activeEventId) return;
    const current = (ordersByEvent[activeEventId] || []).find((o) => o.id === orderId);
    if (!current) return;
    const nextDone = !current.done;
    await setOrderDoneRemote(supabase, orderId, nextDone);
    setOrdersByEvent((prev) => ({
      ...prev,
      [activeEventId]: (prev[activeEventId] || []).map((o) => (o.id === orderId ? { ...o, done: nextDone } : o)),
    }));
  }

  async function deleteOrder(orderId: string) {
    if (!activeEventId) return;
    await deleteOrderRemote(supabase, orderId);
    setOrdersByEvent((prev) => ({
      ...prev,
      [activeEventId]: (prev[activeEventId] || []).filter((o) => o.id !== orderId),
    }));
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
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext<AppStateValue | null>(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
