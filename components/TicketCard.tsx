'use client';

import { useEffect, useRef, useState } from 'react';
import { Order } from '@/lib/types';
import { customBitsFor, orderTotal, lineTotal, formatMoney } from '@/lib/calculations';
import { burstEffect } from './Burst';

export default function TicketCard({
  order,
  readonly = false,
  busy = false,
  onToggleDone,
  onEdit,
  onDelete,
}: {
  order: Order;
  readonly?: boolean;
  // True while this specific order's toggle/delete is mid-flight --
  // disables those actions so a slow connection can't be double-tapped
  // into firing the same mutation twice.
  busy?: boolean;
  onToggleDone?: (id: string) => void;
  onEdit?: (order: Order) => void;
  onDelete?: (id: string) => void;
}) {
  const checkRef = useRef<HTMLButtonElement>(null);
  const wasDoneRef = useRef(order.done);
  const [justCompleted, setJustCompleted] = useState(false);

  // Fire the completion burst only on the false -> true transition,
  // mirroring the prototype's toggleDone() behavior.
  useEffect(() => {
    if (!wasDoneRef.current && order.done) {
      setJustCompleted(true);
      burstEffect(checkRef.current, ['✅', '🍵', '🍃', '✨']);
      const t = setTimeout(() => setJustCompleted(false), 460);
      wasDoneRef.current = order.done;
      return () => clearTimeout(t);
    }
    wasDoneRef.current = order.done;
  }, [order.done]);

  const cardClass =
    'ticket-card' + (order.done ? ' done' : '') + (justCompleted ? ' just-completed' : '') + (busy ? ' busy' : '');

  return (
    <div className={cardClass} onClick={() => !readonly && onEdit?.(order)}>
      <div className="ticket-top-row">
        <button
          ref={checkRef}
          className="check-circle"
          type="button"
          disabled={readonly || busy}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone?.(order.id);
          }}
        >
          {order.done ? '✓' : ''}
        </button>
        <div className="ticket-name">{order.note ? order.note : 'Order'}</div>
        {!readonly && (
          <div className="ticket-actions">
            <button
              className="edit-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(order);
              }}
            >
              ✎
            </button>
            <button
              className="del-btn"
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(order.id);
              }}
            >
              🗑
            </button>
          </div>
        )}
      </div>

      <div className="ticket-total-hero">
        <span className="ticket-total-hero-label">Total</span>
        <span className="ticket-total-hero-value">{formatMoney(orderTotal(order))}</span>
      </div>

      <div className="ticket-lines">
        {order.items.map((it, idx) => {
          const bits = customBitsFor(it);
          return (
            <div className="ticket-line" key={idx}>
              <span>
                {it.qty}× {it.itemName}
                {bits.length > 0 && <small> ({bits.join(', ')})</small>}
              </span>
              <span className="ticket-dots" />
              <span>{formatMoney(lineTotal(it))}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
