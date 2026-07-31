'use client';

import { useState } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { totalProfit, formatEventDateTime, formatMoney } from '@/lib/calculations';
import OrdersPage from './OrdersPage';
import InventoryPage from './InventoryPage';
import SummaryPage from './SummaryPage';
import SettingsModal from './SettingsModal';

export default function MainScreen() {
  const { activeEvent, activePage, setActivePage, goHome, endActiveEvent, updateEventSettings } = useAppState();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!activeEvent) return null;

  async function handleEndEvent() {
    if (window.confirm('End this event? It will be saved and moved to your past events.')) {
      await endActiveEvent();
    }
  }

  return (
    <div id="main-view">
      <div className="topbar">
        <div className="topbar-left">
          <button className="home-btn" onClick={goHome}>
            ←
          </button>
          <div>
            <h1 className="event-name">{activeEvent.eventName}</h1>
            <div className="event-datetime">{formatEventDateTime(activeEvent)}</div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="profit-pill">
            <span className="lbl">Income</span>
            <span className="val">{formatMoney(totalProfit(activeEvent))}</span>
          </div>
          <button className="settings-btn" onClick={() => setSettingsOpen(true)}>
            ⚙
          </button>
          <button className="end-event-btn" onClick={handleEndEvent}>
            End Event
          </button>
        </div>
      </div>

      <div className="content">
        {activePage === 'orders' ? <OrdersPage /> : activePage === 'inventory' ? <InventoryPage /> : <SummaryPage />}
      </div>

      <div className="bottom-nav">
        <button
          className={'nav-btn' + (activePage === 'orders' ? ' active' : '')}
          onClick={() => setActivePage('orders')}
        >
          <span className="nav-icon-pill"><span className="nav-icon">📋</span></span>
          Orders
        </button>
        <button
          className={'nav-btn' + (activePage === 'inventory' ? ' active' : '')}
          onClick={() => setActivePage('inventory')}
        >
          <span className="nav-icon-pill"><span className="nav-icon">🍵</span></span>
          Inventory
        </button>
        <button
          className={'nav-btn' + (activePage === 'summary' ? ' active' : '')}
          onClick={() => setActivePage('summary')}
        >
          <span className="nav-icon-pill"><span className="nav-icon">📮</span></span>
          Summary
        </button>
      </div>

      {settingsOpen && (
        <SettingsModal
          event={activeEvent}
          onClose={() => setSettingsOpen(false)}
          onSave={updateEventSettings}
        />
      )}
    </div>
  );
}
