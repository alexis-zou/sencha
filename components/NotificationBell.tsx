'use client';

import { useState } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { describeNotification, AppNotification, NotificationType } from '@/lib/supabase/notifications';

const ICONS: Record<NotificationType, string> = {
  order_created: '🧾',
  order_completed: '✅',
  order_updated: '✎',
  order_deleted: '🗑',
};

function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markNotificationsRead } = useAppState();
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
    if (unreadCount > 0) markNotificationsRead();
  }

  return (
    <>
      <button className="notif-bell-btn" onClick={handleOpen} aria-label="Notifications">
        🔔
        {unreadCount > 0 && <span className="notif-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal-sheet">
            <div className="modal-close-row">
              <button className="icon-x" onClick={() => setOpen(false)}>✕</button>
            </div>
            <h2>Notifications</h2>
            {notifications.length === 0 ? (
              <div className="empty-state">
                <span className="display">All quiet</span>
                Updates from your teammates will show up here.
              </div>
            ) : (
              <div className="notif-list">
                {notifications.map((n: AppNotification) => (
                  <div className={'notif-row' + (n.isRead ? '' : ' unread')} key={n.id}>
                    <span className="notif-icon">{ICONS[n.type]}</span>
                    <div className="notif-row-text">
                      <div>{describeNotification(n)}</div>
                      <div className="notif-row-time">{formatRelativeTime(n.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
