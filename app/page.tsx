'use client';

import { AppStateProvider } from '@/context/AppStateContext';
import AppShell from '@/components/AppShell';

export default function Home() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}
