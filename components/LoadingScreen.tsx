'use client';

import Image from 'next/image';

// Shown only during the initial session/data bootstrap (AppShell) --
// previously a blank white flash (`if (loading) return null`) while
// Supabase restored the session and fetched events/orders/notifications.
export default function LoadingScreen() {
  return (
    <div id="loading-view" className="loading-view">
      <Image src="/sencha-icon.png" alt="Sencha" width={72} height={72} priority className="loading-icon" />
    </div>
  );
}
