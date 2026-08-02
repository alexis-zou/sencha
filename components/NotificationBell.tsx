'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  function handleOpen() {
    setOffset({ x: 0, y: 0 });
    setOpen(true);
    if (unreadCount > 0) markNotificationsRead();
  }

  // Drag-to-reposition, same pattern as ToastHost: track pointer movement
  // against where the panel started, re-centered every time it's reopened.
  useEffect(() => {
    if (!open) return;
    function handleMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      setOffset({ x: drag.originX + (e.clientX - drag.startX), y: drag.originY + (e.clientY - drag.startY) });
    }
    function handleUp() {
      dragRef.current = null;
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [open]);

  function startDrag(e: React.PointerEvent) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
  }

  return (
    <div className="notif-dropdown-wrap">
      <button className="notif-bell-btn" onClick={handleOpen} aria-label="Notifications">
        🔔
        {unreadCount > 0 && <span className="notif-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <>
          <div className="notif-modal-scrim" onClick={() => setOpen(false)} />
          <div
            className="notif-modal-panel"
            style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
          >
            <div className="notif-modal-header" onPointerDown={startDrag}>
              <h2>Notifications</h2>
              <button className="icon-x" onClick={() => setOpen(false)}>✕</button>
            </div>
            {notifications.length === 0 ? (
              <div className="empty-state">
                <span className="display">All quiet</span>
                Updates from your teammates will show up here.
              </div>
            ) : (
              <div className="notif-list notif-list-scroll">
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
        </>
      )}
    </div>
  );
}
