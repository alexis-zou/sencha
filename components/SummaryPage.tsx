'use client';

import { useAppState } from '@/context/AppStateContext';
import { computeEventStats, formatMoney } from '@/lib/calculations';

export default function SummaryPage() {
  const { activeEvent } = useAppState();
  if (!activeEvent) return null;

  const stats = computeEventStats(activeEvent);

  return (
    <div id="page-summary" className="page">
      <div className="page-heading-row">
        <h2 className="page-heading">Summary</h2>
      </div>

      <div className="postcard">
        <span className="postcard-stamp">🍵</span>

        <div className="postcard-stats-grid">
          <div className="postcard-stat">
            <span className="postcard-stat-label">Income</span>
            <span className="postcard-stat-value">{formatMoney(stats.income)}</span>
          </div>
          <div className="postcard-stat">
            <span className="postcard-stat-label">Orders</span>
            <span className="postcard-stat-value">{stats.totalOrders}</span>
          </div>
          <div className="postcard-stat">
            <span className="postcard-stat-label">Avg. order</span>
            <span className="postcard-stat-value">{formatMoney(stats.avgOrderValue)}</span>
          </div>
          <div className="postcard-stat">
            <span className="postcard-stat-label">Pending</span>
            <span className="postcard-stat-value">{stats.pendingOrders}</span>
          </div>
        </div>

        <div className="postcard-divider" />

        <div className="postcard-section-title">Top sellers</div>
        {stats.itemsSold.length === 0 ? (
          <div className="postcard-empty">Nothing sold yet — check back once orders come in.</div>
        ) : (
          <div className="postcard-list">
            {stats.itemsSold.slice(0, 5).map((it) => (
              <div className="postcard-list-row" key={it.itemId}>
                <span>{it.itemName}</span>
                <span>{it.qty} sold</span>
              </div>
            ))}
          </div>
        )}

        {(stats.topSyrup || stats.topMilk) && (
          <>
            <div className="postcard-divider" />
            <div className="postcard-section-title">Crowd favorites</div>
            <div className="postcard-list">
              {stats.topSyrup && (
                <div className="postcard-list-row">
                  <span>Favorite syrup</span>
                  <span>{stats.topSyrup.name}</span>
                </div>
              )}
              {stats.topMilk && (
                <div className="postcard-list-row">
                  <span>Favorite milk</span>
                  <span>{stats.topMilk.name}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
