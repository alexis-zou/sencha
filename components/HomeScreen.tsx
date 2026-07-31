'use client';

import { useAppState } from '@/context/AppStateContext';
import { totalProfit, formatEventDateTime, formatMoney } from '@/lib/calculations';

export default function HomeScreen() {
  const { currentUser, events, goToSetup, openEvent, signOut } = useAppState();

  const sorted = [...events].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div id="home-view">
      <div className="home-header">
        <div>
          <h1>Your Stands</h1>
          <div className="sub">{currentUser}</div>
        </div>
        <button className="signout-btn" onClick={() => signOut()}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
            <path
              d="M8 3H4.5A1.5 1.5 0 0 0 3 4.5v11A1.5 1.5 0 0 0 4.5 17H8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M12.5 13.5 16 10l-3.5-3.5M16 10H7.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Sign out</span>
        </button>
      </div>

      <div className="home-content">
        <button className="new-event-btn" onClick={goToSetup}>
          + New pop-up event
        </button>
        <div className="section-title" style={{ marginTop: 0 }}>
          Your events
        </div>
        <div>
          {sorted.length === 0 ? (
            <div className="empty-state">
              <span className="display">No pop-ups yet</span>
              Tap &quot;New pop-up event&quot; to set up your first stand.
            </div>
          ) : (
            sorted.map((ev) => {
              const profit = totalProfit(ev);
              return (
                <div key={ev.id} className="event-folder" onClick={() => openEvent(ev.id)}>
                  <span className="event-folder-tab" aria-hidden="true" />
                  <div className="event-folder-front">
                    <div className="event-card-top">
                      <div>
                        <div className="event-card-name">{ev.eventName}</div>
                        <div className="event-card-date">{formatEventDateTime(ev) || 'No date set'}</div>
                      </div>
                      <div className={'status-badge ' + ev.status}>{ev.status === 'active' ? 'Active' : 'Ended'}</div>
                    </div>
                    <div className="event-card-stats">
                      <span>
                        Income <b>{formatMoney(profit)}</b>
                      </span>
                      <span>
                        Orders <b>{ev.orders.length}</b>
                      </span>
                    </div>
                    {ev.status === 'ended' && <div className="event-folder-hint">Tap to view receipt →</div>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
