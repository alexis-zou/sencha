'use client';

import { useEffect, useState } from 'react';
import { PopupEvent } from '@/lib/types';
import { useAppState } from '@/context/AppStateContext';
import { EventMember } from '@/lib/supabase/members';

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
  const { fetchEventMembers, inviteMember } = useAppState();
  const [eventName, setEventName] = useState(event.eventName);
  const [eventDate, setEventDate] = useState(event.eventDate || '');
  const [startTime, setStartTime] = useState(event.startTime || '');
  const [endTime, setEndTime] = useState(event.endTime || '');
  const [invValues, setInvValues] = useState<Record<string, string>>(
    Object.fromEntries(event.menu.map((m) => [m.id, String(event.inventory[m.id] ?? 0)]))
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [members, setMembers] = useState<EventMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    (async () => {
      setMembers(await fetchEventMembers(event.id));
      setMembersLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInvite() {
    const email = inviteEmail.trim();
    if (!email) {
      setInviteError('Enter an email address.');
      return;
    }
    setInviteError('');
    setInviteSuccess('');
    setInviting(true);
    try {
      const member = await inviteMember(event.id, email);
      setMembers((prev) => [...prev, member]);
      setInviteEmail('');
      setInviteSuccess(`${member.email} can now access this stand.`);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Could not send that invite — try again.');
    } finally {
      setInviting(false);
    }
  }

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
          <label className="field-label">Team</label>
          {!membersLoading &&
            members.map((m) => (
              <div className="inv-item-row" key={m.userId}>
                <div className="inv-item-label">
                  <span>{m.email}</span>
                </div>
                <span className={'type-tag ' + (m.role === 'owner' ? 'drink' : 'item')}>
                  {m.role === 'owner' ? 'Owner' : 'Staff'}
                </span>
              </div>
            ))}
          <div className="settings-invite-row">
            <input
              className="text-input"
              type="email"
              placeholder="teammate@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <button className="add-row-btn" type="button" onClick={handleInvite} disabled={inviting}>
              {inviting ? 'Inviting…' : '+ Invite'}
            </button>
          </div>
          {inviteError && <div className="error-text">{inviteError}</div>}
          {inviteSuccess && <div className="info-text">{inviteSuccess}</div>}
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
