'use client';

import { useAppState } from '@/context/AppStateContext';
import { remaining, badgeClass } from '@/lib/calculations';
import StockIcon from './icons/StockIcon';

export default function InventoryPage() {
  const { activeEvent } = useAppState();
  if (!activeEvent) return null;

  return (
    <div id="page-inventory" className="page">
      <div className="page-heading-row">
        <h2 className="page-heading tape-heading">Inventory</h2>
      </div>
      {activeEvent.menu.length === 0 ? (
        <div className="empty-state">No trackable items on this event&apos;s menu.</div>
      ) : (
        <div className="inv-grid">
          {activeEvent.menu.map((item) => {
            const left = remaining(item.id, activeEvent);
            const start = activeEvent.inventory[item.id] || 1;
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
      )}
    </div>
  );
}
