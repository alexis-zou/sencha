'use client';

import { useAppState } from '@/context/AppStateContext';
import { remaining, badgeClass, totalProfit, formatEventDateTime, formatMoney } from '@/lib/calculations';
import StockIcon from './icons/StockIcon';
import TicketCard from './TicketCard';

export default function SummaryScreen() {
  const { summaryEvent, goHome } = useAppState();
  if (!summaryEvent) return null;

  const orderedOrders = [...summaryEvent.orders].sort((a, b) => a.ts - b.ts);

  return (
    <div id="summary-view">
      <div className="summary-header">
        <button className="back-link" onClick={goHome}>
          ← Back to home
        </button>
        <h1 className="tape-heading">{summaryEvent.eventName}</h1>
        <div className="event-datetime">{formatEventDateTime(summaryEvent)}</div>
      </div>
      <div className="content">
        <div className="section-title" style={{ marginTop: 6 }}>
          Summary
        </div>
        <div className="event-card">
          <div className="event-card-stats">
            <span>
              Income <b>{formatMoney(totalProfit(summaryEvent))}</b>
            </span>
            <span>
              Orders <b>{summaryEvent.orders.length}</b>
            </span>
          </div>
        </div>

        <div className="section-title">Inventory used</div>
        <div className="inv-grid">
          {summaryEvent.menu.map((item) => {
            const left = remaining(item.id, summaryEvent);
            const start = summaryEvent.inventory[item.id] || 1;
            return (
              <div className="inv-card" key={item.id}>
                <div className="inv-icon-wrap">
                  <StockIcon
                    fraction={Math.max(0, left) / start}
                    color={item.type === 'drink' ? 'var(--sage)' : 'var(--bread)'}
                    size={72}
                  />
                  <div className={'inv-badge ' + badgeClass(left, start)}>{Math.max(0, left)}</div>
                </div>
                <div>
                  <div className="inv-name-row">
                    <div className="inv-name">{item.name}</div>
                    <span className={'type-tag ' + item.type}>{item.type === 'drink' ? 'Drink' : 'Item'}</span>
                  </div>
                  <div className="inv-sub">left in stock</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="section-title">Orders</div>
        <div>
          {orderedOrders.length === 0 ? (
            <div className="empty-state">No orders were logged for this event.</div>
          ) : (
            orderedOrders.map((o) => <TicketCard key={o.id} order={o} readonly />)
          )}
        </div>
        <p className="readonly-note">This event has ended and is read-only.</p>
      </div>
    </div>
  );
}
