'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { describeNotification, AppNotification } from '@/lib/supabase/notifications';

const AUTO_DISMISS_MS = 4500;
const DRAG_THRESHOLD = 4;

// Mounted once at the app root (AppShell) so a teammate's change surfaces
// no matter which screen is currently showing -- toasts aren't scoped to
// the active event's own page. Always spawns at the top of the screen;
// `offset` tracks how far the person has dragged the stack from there,
// and persists across new toasts arriving/dismissing for the rest of
// the session.
export default function ToastHost() {
  const { toasts, dismissToast } = useAppState();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) draggedRef.current = true;
      setOffset({ x: drag.originX + dx, y: drag.originY + dy });
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
  }, []);

  function startDrag(e: React.PointerEvent) {
    draggedRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
  }

  // Distinguishes a drag from a tap-to-dismiss: consumed once per click so
  // it doesn't leak into the next unrelated interaction.
  function consumeDraggedFlag() {
    const v = draggedRef.current;
    draggedRef.current = false;
    return v;
  }

  return (
    <div
      className="toast-host"
      aria-live="polite"
      style={{ transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)` }}
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          notification={t}
          onDismiss={() => dismissToast(t.id)}
          onDragStart={startDrag}
          consumeDraggedFlag={consumeDraggedFlag}
        />
      ))}
    </div>
  );
}

function ToastItem({
  notification,
  onDismiss,
  onDragStart,
  consumeDraggedFlag,
}: {
  notification: AppNotification;
  onDismiss: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  consumeDraggedFlag: () => boolean;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification.id]);

  function handleClick() {
    if (!consumeDraggedFlag()) onDismiss();
  }

  return (
    <div className="toast-card" onPointerDown={onDragStart} onClick={handleClick}>
      {describeNotification(notification)}
    </div>
  );
}
