'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { storage } from '@/lib/storage';
import { eventsKey, menuTemplateKey } from '@/lib/constants';
import { uid } from '@/lib/id';
import { AuthMode, MainPage, MenuTemplate, PopupEvent, ViewName } from '@/lib/types';

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
  updateActiveEvent: (updater: (ev: PopupEvent) => PopupEvent) => void;
  saveMenuTemplate: (tpl: MenuTemplate) => Promise<void>;
  loadMenuTemplate: () => Promise<MenuTemplate | null>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

// Old saved events may predate a field added later — default defensively so
// older local data never crashes the app.
function normalizeEvents(evs: PopupEvent[]): PopupEvent[] {
  return evs.map((e) => ({ ...e, syrups: e.syrups || [], milks: e.milks || [], inventory: e.inventory || {} }));
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewName>('landing');
  const [authMode, setAuthModeState] = useState<AuthMode>('signin');
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');

  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [events, setEvents] = useState<PopupEvent[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [summaryEventId, setSummaryEventId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<MainPage>('orders');

  const supabase = useMemo(() => createClient(), []);

  async function loadUserInto(email: string) {
    const evRes = await storage.get(eventsKey(email));
    const loadedEvents: PopupEvent[] = evRes?.value ? JSON.parse(evRes.value) : [];
    setCurrentUser(email);
    setEvents(normalizeEvents(loadedEvents));
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
      if (email) {
        loadUserInto(email);
      } else {
        setCurrentUser(null);
        setEvents([]);
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

  // ---- persist events whenever they change (post-login) ----
  useEffect(() => {
    if (!currentUser || loading) return;
    storage.set(eventsKey(currentUser), JSON.stringify(events));
  }, [events, currentUser, loading]);

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
    const newEvent: PopupEvent = {
      id: uid(),
      eventName: input.eventName,
      eventDate: input.eventDate,
      startTime: input.startTime,
      endTime: input.endTime,
      inventory: input.inventory,
      menu: input.menu,
      syrups: input.syrups,
      milks: input.milks,
      orders: [],
      status: 'active',
      createdAt: Date.now(),
      endedAt: null,
    };
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
    setEvents((prev) =>
      prev.map((e) => (e.id === activeEventId ? { ...e, status: 'ended' as const, endedAt: Date.now() } : e))
    );
    setActiveEventId(null);
    setView('home');
  }

  function updateActiveEvent(updater: (ev: PopupEvent) => PopupEvent) {
    if (!activeEventId) return;
    setEvents((prev) => prev.map((e) => (e.id === activeEventId ? updater(e) : e)));
  }

  const activeEvent = useMemo(
    () => events.find((e) => e.id === activeEventId) || null,
    [events, activeEventId]
  );
  const summaryEvent = useMemo(
    () => events.find((e) => e.id === summaryEventId) || null,
    [events, summaryEventId]
  );

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
    events,
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
    updateActiveEvent,
    saveMenuTemplate,
    loadMenuTemplate,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext<AppStateValue | null>(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
