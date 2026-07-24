'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { storage } from '@/lib/storage';
import { USERS_KEY, SESSION_KEY, eventsKey, menuTemplateKey } from '@/lib/constants';
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

  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [events, setEvents] = useState<PopupEvent[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [summaryEventId, setSummaryEventId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<MainPage>('orders');

  // ---- bootstrap: restore session on first load ----
  useEffect(() => {
    (async () => {
      const session = await storage.get(SESSION_KEY);
      if (session?.value) {
        const email = session.value;
        const evRes = await storage.get(eventsKey(email));
        const loadedEvents: PopupEvent[] = evRes?.value ? JSON.parse(evRes.value) : [];
        setCurrentUser(email);
        setEvents(normalizeEvents(loadedEvents));
        setView('home');
      } else {
        setView('landing');
      }
      setLoading(false);
    })();
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
  }

  async function signIn(email: string, password: string) {
    const e = email.trim().toLowerCase();
    if (!e || !password) {
      setAuthError('Enter both an email and a password.');
      return;
    }
    const usersRes = await storage.get(USERS_KEY);
    const users: Record<string, string> = usersRes?.value ? JSON.parse(usersRes.value) : {};
    if (!users[e] || users[e] !== password) {
      setAuthError('Incorrect email or password.');
      return;
    }
    await logInAs(e);
  }

  async function signUp(email: string, password: string) {
    const e = email.trim().toLowerCase();
    if (!e || !password) {
      setAuthError('Enter both an email and a password.');
      return;
    }
    const usersRes = await storage.get(USERS_KEY);
    const users: Record<string, string> = usersRes?.value ? JSON.parse(usersRes.value) : {};
    if (users[e]) {
      setAuthError('An account with that email already exists — try signing in instead.');
      return;
    }
    users[e] = password;
    await storage.set(USERS_KEY, JSON.stringify(users));
    await logInAs(e);
  }

  async function logInAs(email: string) {
    setAuthError('');
    await storage.set(SESSION_KEY, email);
    const evRes = await storage.get(eventsKey(email));
    const loadedEvents: PopupEvent[] = evRes?.value ? JSON.parse(evRes.value) : [];
    setCurrentUser(email);
    setEvents(normalizeEvents(loadedEvents));
    setView('home');
  }

  async function signOut() {
    await storage.delete(SESSION_KEY);
    setCurrentUser(null);
    setEvents([]);
    setActiveEventId(null);
    setSummaryEventId(null);
    setView('auth');
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
