'use client';

import { useAppState } from '@/context/AppStateContext';
import { remaining, badgeClass, computeEventStats, formatEventDateTime, formatMoney } from '@/lib/calculations';
import MatchaDrinkIcon from './icons/MatchaDrinkIcon';
import CookieIcon from './icons/CookieIcon';
import Barcode from './icons/Barcode';
import TicketCard from './TicketCard';

export default function SummaryScreen() {
  const { summaryEvent, goHome } = useAppState();
  if (!summaryEvent) return null;

  const orderedOrders = [...summaryEvent.orders].sort((a, b) => a.ts - b.ts);
  const stats = computeEventStats(summaryEvent);

  return (
    <div id="summary-view">
      <div className="summary-header no-print">
        <button className="back-link" onClick={goHome}>
          ← Back to home
        </button>
        <h1>{summaryEvent.eventName}</h1>
        <div className="event-datetime">{formatEventDateTime(summaryEvent)}</div>
      </div>
      <div className="content">
        <button className="export-pdf-btn no-print" onClick={() => window.print()}>
          🖨️ Export as PDF
        </button>

        <div className="receipt" id="receipt-print-area">
          <div className="receipt-header">
            <div className="receipt-eyebrow">Sencha</div>
            <h2 className="receipt-title">{summaryEvent.eventName}</h2>
            <div className="receipt-date">{formatEventDateTime(summaryEvent)}</div>
          </div>

          <div className="receipt-divider" />

          {stats.itemsSold.length === 0 ? (
            <div className="empty-state">No orders were completed for this event.</div>
          ) : (
            <div className="receipt-lines">
              {stats.itemsSold.map((it) => (
                <div className="receipt-line" key={it.itemId}>
                  <span>
                    {it.qty}× {it.itemName}
                  </span>
                  <span className="receipt-dots" />
                  <span>{formatMoney(it.subtotal)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="receipt-divider" />

          <div className="receipt-total-row">
            <span>Total</span>
            <span className="receipt-dots" />
            <span>{formatMoney(stats.income)}</span>
          </div>

          <div className="receipt-meta-row">
            <span>
              {stats.completedOrders} order{stats.completedOrders === 1 ? '' : 's'} completed
            </span>
            {stats.pendingOrders > 0 && (
              <span>
                {stats.pendingOrders} left pending
              </span>
            )}
          </div>
          {(stats.topSyrup || stats.topMilk) && (
            <div className="receipt-meta-row">
              {stats.topSyrup && <span>Top syrup: {stats.topSyrup.name}</span>}
              {stats.topMilk && <span>Top milk: {stats.topMilk.name}</span>}
            </div>
          )}

          <div className="receipt-footer">
            <div className="receipt-thanks">thank you for stopping by ♡</div>
            <Barcode seed={summaryEvent.id} />
          </div>
        </div>

        <div className="section-title">Inventory used</div>
        <div className="inv-grid">
          {summaryEvent.menu.map((item) => {
            const left = remaining(item.id, summaryEvent);
            const start = summaryEvent.inventory[item.id] || 1;
            const fraction = Math.max(0, left) / start;
            const status = badgeClass(left);
            return (
              <div className="inv-card" key={item.id}>
                <div className="inv-icon-wrap">
                  {item.type === 'drink' ? (
                    <MatchaDrinkIcon fraction={fraction} size={64} />
                  ) : (
                    <CookieIcon fractionEaten={1 - fraction} size={64} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="inv-name-row">
                    <div className="inv-name">{item.name}</div>
                    <span className={'type-tag ' + item.type}>{item.type === 'drink' ? 'Drink' : 'Item'}</span>
                  </div>
                  <div className="inv-progress-track">
                    <div className={'inv-progress-fill ' + status} style={{ width: `${Math.round(fraction * 100)}%` }} />
                  </div>
                  <span className={'inv-count ' + status}>{Math.max(0, left)} left in stock</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="section-title no-print">Orders</div>
        <div className="no-print">
          {orderedOrders.length === 0 ? (
            <div className="empty-state">No orders were logged for this event.</div>
          ) : (
            orderedOrders.map((o) => <TicketCard key={o.id} order={o} readonly />)
          )}
        </div>
        <p className="readonly-note no-print">This event has ended and is read-only.</p>
      </div>
    </div>
  );
}
