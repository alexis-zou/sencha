'use client';

import { useAppState } from '@/context/AppStateContext';
import AuthScreen from './AuthScreen';
import HomeScreen from './HomeScreen';
import SetupScreen from './SetupScreen';
import MainScreen from './MainScreen';
import SummaryScreen from './SummaryScreen';

export default function AppShell() {
  const { view, loading } = useAppState();

  if (loading) return null; // avoids an auth-screen flash while session restores

  return (
    <div id="app">
      {view === 'auth' && <AuthScreen />}
      {view === 'home' && <HomeScreen />}
      {view === 'setup' && <SetupScreen />}
      {view === 'main' && <MainScreen />}
      {view === 'summary' && <SummaryScreen />}
    </div>
  );
}
