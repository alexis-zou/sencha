'use client';

import { useState } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { Order, OrderLineItem } from '@/lib/types';
import TicketCard from './TicketCard';
import OrderPanel from './OrderPanel';

export default function OrdersPage() {
  const { activeEvent, addOrder, editOrder, toggleOrderDone, deleteOrder } = useAppState();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

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

  async function handleSaveOrder(note: string, items: OrderLineItem[]) {
    try {
      setError('');
      if (editingOrder) {
        await editOrder(editingOrder.id, note, items);
      } else {
        await addOrder(note, items);
      }
      closePanel();
    } catch {
      setError('Could not save that order — check your connection and try again.');
    }
  }

  async function handleToggleDone(id: string) {
    try {
      setError('');
      await toggleOrderDone(id);
    } catch {
      setError('Could not update that order — check your connection and try again.');
    }
  }

  async function handleDelete(id: string) {
    try {
      setError('');
      await deleteOrder(id);
    } catch {
      setError('Could not delete that order — check your connection and try again.');
    }
  }

  return (
    <div id="page-orders" className="page">
      <div className="page-heading-row">
        <h2 className="page-heading">Orders</h2>
        <span className="order-count-pill">
          {pending.length} pending · {completed.length} done
        </span>
      </div>

      <button className="add-btn" onClick={openNewOrder}>
        + Add order
      </button>
      {error && <div className="error-text">{error}</div>}

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
