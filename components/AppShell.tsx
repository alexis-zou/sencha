'use client';

import { useAppState } from '@/context/AppStateContext';
import LandingScreen from './LandingScreen';
import AuthScreen from './AuthScreen';
import HomeScreen from './HomeScreen';
import SetupScreen from './SetupScreen';
import MainScreen from './MainScreen';
import SummaryScreen from './SummaryScreen';
import ToastHost from './ToastHost';
import LoadingScreen from './LoadingScreen';

export default function AppShell() {
  const { view, loading } = useAppState();

  // A branded pulse instead of a blank white flash while the session
  // restores and events/orders/notifications load for the first time.
  if (loading) return <LoadingScreen />;

  return (
    <div id="app">
      {view === 'landing' && <LandingScreen />}
      {view === 'auth' && <AuthScreen />}
      {view === 'home' && <HomeScreen />}
      {view === 'setup' && <SetupScreen />}
      {view === 'main' && <MainScreen />}
      {view === 'summary' && <SummaryScreen />}
      <ToastHost />
    </div>
  );
}
