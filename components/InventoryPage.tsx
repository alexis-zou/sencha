'use client';

import { useAppState } from '@/context/AppStateContext';
import { remaining, badgeClass } from '@/lib/calculations';
import MatchaDrinkIcon from './icons/MatchaDrinkIcon';
import CookieIcon from './icons/CookieIcon';

export default function InventoryPage() {
  const { activeEvent } = useAppState();
  if (!activeEvent) return null;

  return (
    <div id="page-inventory" className="page">
      <div className="page-heading-row">
        <h2 className="page-heading">Inventory</h2>
      </div>
      {activeEvent.menu.length === 0 ? (
        <div className="empty-state">No trackable items on this event&apos;s menu.</div>
      ) : (
        <div className="inv-grid">
          {activeEvent.menu.map((item) => {
            const left = remaining(item.id, activeEvent);
            const start = activeEvent.inventory[item.id] || 1;
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
      )}
    </div>
  );
}
