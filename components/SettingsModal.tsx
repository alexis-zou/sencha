'use client';

import { useState } from 'react';
import { PopupEvent } from '@/lib/types';

export default function SettingsModal({
  event,
  onClose,
  onSave,
}: {
  event: PopupEvent;
  onClose: () => void;
  onSave: (
    patch: Partial<Pick<PopupEvent, 'eventName' | 'eventDate' | 'startTime' | 'endTime' | 'inventory'>>
  ) => Promise<void>;
}) {
  const [eventName, setEventName] = useState(event.eventName);
  const [eventDate, setEventDate] = useState(event.eventDate || '');
  const [startTime, setStartTime] = useState(event.startTime || '');
  const [endTime, setEndTime] = useState(event.endTime || '');
  const [invValues, setInvValues] = useState<Record<string, string>>(
    Object.fromEntries(event.menu.map((m) => [m.id, String(event.inventory[m.id] ?? 0)]))
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const inventory: Record<string, number> = { ...event.inventory };
    event.menu.forEach((m) => {
      const n = parseInt(invValues[m.id], 10);
      if (!isNaN(n) && n >= 0) inventory[m.id] = n;
    });
    setError('');
    setSaving(true);
    try {
      await onSave({
        eventName: eventName.trim() || event.eventName,
        eventDate,
        startTime,
        endTime,
        inventory,
      });
      onClose();
    } catch {
      setError('Could not save your changes — check your connection and try again.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet">
        <div className="modal-close-row">
          <button className="icon-x" onClick={onClose}>✕</button>
        </div>
        <h2>Stand settings</h2>

        <div className="field-group">
          <label className="field-label">Event name</label>
          <input className="text-input" value={eventName} onChange={(e) => setEventName(e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Date</label>
          <input className="text-input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Start &amp; end time</label>
          <div className="time-row">
            <input className="text-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <input className="text-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>
        <div className="field-group">
          <label className="field-label">Starting inventory</label>
          {event.menu.map((m) => (
            <div className="inv-item-row" key={m.id}>
              <div className="inv-item-label">
                <span>{m.name}</span>
                <span className={'type-tag ' + m.type}>{m.type === 'drink' ? 'Drink' : 'Item'}</span>
              </div>
              <input
                className="text-input inv-item-input"
                type="number"
                min={0}
                value={invValues[m.id] ?? ''}
                onChange={(e) => setInvValues((v) => ({ ...v, [m.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="primary-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
