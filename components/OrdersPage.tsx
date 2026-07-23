'use client';

import { useState } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { Order, OrderLineItem } from '@/lib/types';
import { uid } from '@/lib/id';
import TicketCard from './TicketCard';
import OrderPanel from './OrderPanel';

export default function OrdersPage() {
  const { activeEvent, updateActiveEvent } = useAppState();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  if (!activeEvent) return null;

  const pending = activeEvent.orders.filter((o) => !o.done).sort((a, b) => a.ts - b.ts);
  const completed = activeEvent.orders.filter((o) => o.done).sort((a, b) => b.ts - a.ts);

  function openNewOrder() {
    setEditingOrder(null);
    setPanelOpen(true);
  }

  function openEditOrder(order: Order) {
    setEditingOrder(order);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingOrder(null);
  }

  function handleSaveOrder(note: string, items: OrderLineItem[]) {
    if (editingOrder) {
      updateActiveEvent((ev) => ({
        ...ev,
        orders: ev.orders.map((o) => (o.id === editingOrder.id ? { ...o, note, items } : o)),
      }));
    } else {
      const newOrder: Order = { id: uid(), items, note, done: false, ts: Date.now() };
      updateActiveEvent((ev) => ({ ...ev, orders: [...ev.orders, newOrder] }));
    }
    closePanel();
  }

  function handleToggleDone(id: string) {
    updateActiveEvent((ev) => ({
      ...ev,
      orders: ev.orders.map((o) => (o.id === id ? { ...o, done: !o.done } : o)),
    }));
  }

  function handleDelete(id: string) {
    updateActiveEvent((ev) => ({ ...ev, orders: ev.orders.filter((o) => o.id !== id) }));
  }

  return (
    <div id="page-orders" className="page">
      <div className="page-heading-row">
        <h2 className="page-heading tape-heading">Orders</h2>
        <span className="order-count-pill">
          {pending.length} pending · {completed.length} done
        </span>
      </div>

      <button className="add-btn" onClick={openNewOrder}>
        + Add order
      </button>

      {panelOpen && (
        <OrderPanel event={activeEvent} editingOrder={editingOrder} onCancel={closePanel} onSave={handleSaveOrder} />
      )}

      <div className="section-title">
        Incomplete {pending.length > 0 && `(${pending.length})`}
      </div>
      <div>
        {pending.length === 0 ? (
          <div className="empty-state">
            <span className="display">All caught up</span>
            No pending orders — add one above when the next customer orders.
          </div>
        ) : (
          pending.map((o) => (
            <TicketCard
              key={o.id}
              order={o}
              onToggleDone={handleToggleDone}
              onEdit={openEditOrder}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <div className="section-title">
        Completed {completed.length > 0 && `(${completed.length})`}
      </div>
      <div>
        {completed.length === 0 ? (
          <div className="empty-state">Completed orders will show up here once you check them off.</div>
        ) : (
          completed.map((o) => (
            <TicketCard
              key={o.id}
              order={o}
              onToggleDone={handleToggleDone}
              onEdit={openEditOrder}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
