'use client';

import { useEffect } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { describeNotification, AppNotification } from '@/lib/supabase/notifications';

const AUTO_DISMISS_MS = 4500;

// Mounted once at the app root (AppShell) so a teammate's change surfaces
// no matter which screen is currently showing -- toasts aren't scoped to
// the active event's own page.
export default function ToastHost() {
  const { toasts, dismissToast } = useAppState();

  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} notification={t} onDismiss={() => dismissToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ notification, onDismiss }: { notification: AppNotification; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification.id]);

  return (
    <div className="toast-card" onClick={onDismiss}>
      {describeNotification(notification)}
    </div>
  );
}
