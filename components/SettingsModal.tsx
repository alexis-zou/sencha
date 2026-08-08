'use client';

import { useEffect, useState } from 'react';
import { PopupEvent } from '@/lib/types';
import { useAppState } from '@/context/AppStateContext';
import { EventMember } from '@/lib/supabase/members';
import { EventSettingsPatch } from '@/lib/supabase/events';
import {
  Row,
  newRow,
  menuItemToRow,
  flavorOptionToRow,
  rowsToMenuItems,
  rowsToFlavorOptions,
  findRowMissingPrice,
} from '@/lib/menuRows';

export default function SettingsModal({
  event,
  onClose,
  onSave,
}: {
  event: PopupEvent;
  onClose: () => void;
  onSave: (patch: EventSettingsPatch) => Promise<void>;
}) {
  const { fetchEventMembers, inviteMember } = useAppState();
  const [eventName, setEventName] = useState(event.eventName);
  const [eventDate, setEventDate] = useState(event.eventDate || '');
  const [startTime, setStartTime] = useState(event.startTime || '');
  const [endTime, setEndTime] = useState(event.endTime || '');

  const [drinkRows, setDrinkRows] = useState<Row[]>(
    event.menu.filter((m) => m.type === 'drink').map(menuItemToRow)
  );
  const [itemRows, setItemRows] = useState<Row[]>(event.menu.filter((m) => m.type === 'item').map(menuItemToRow));
  const [syrupRows, setSyrupRows] = useState<Row[]>(event.syrups.map(flavorOptionToRow));
  const [milkRows, setMilkRows] = useState<Row[]>(event.milks.map(flavorOptionToRow));

  const [invValues, setInvValues] = useState<Record<string, string>>(
    Object.fromEntries(event.menu.map((m) => [m.id, String(event.inventory[m.id] ?? 0)]))
  );
  const [menuEditorOpen, setMenuEditorOpen] = useState(false);
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

  // ---------- menu row helpers (same pattern as SetupScreen's menu page) ----------
  function addRow(setter: React.Dispatch<React.SetStateAction<Row[]>>) {
    setter((rows) => [...rows, newRow()]);
  }
  function removeRow(setter: React.Dispatch<React.SetStateAction<Row[]>>, id: string) {
    setter((rows) => rows.filter((r) => r.id !== id));
  }
  function updateRow(setter: React.Dispatch<React.SetStateAction<Row[]>>, id: string, patch: Partial<Row>) {
    setter((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function renderRows(rows: Row[], setter: React.Dispatch<React.SetStateAction<Row[]>>, opts: { namePlaceholder: string; priceRequired: boolean }) {
    return (
      <div className="detail-card">
        {rows.map((row) => (
          <div className="detail-row detail-row-menu" key={row.id}>
            <input
              className="detail-title-input"
              type="text"
              placeholder={opts.namePlaceholder}
              value={row.name}
              onChange={(e) => updateRow(setter, row.id, { name: e.target.value })}
            />
            <span className="price-input-wrap">
              <span className="price-prefix">$</span>
              <input
                className="detail-pill-input detail-pill-input-price"
                type="number"
                min={0}
                step="0.25"
                placeholder={opts.priceRequired ? 'req.' : 'opt.'}
                value={row.price}
                onChange={(e) => updateRow(setter, row.id, { price: e.target.value })}
              />
            </span>
            <button className="detail-row-remove" type="button" onClick={() => removeRow(setter, row.id)} aria-label="Remove">
              ×
            </button>
          </div>
        ))}
      </div>
    );
  }

  const trackableRows = [...drinkRows, ...itemRows];

  async function handleSave() {
    const missing = findRowMissingPrice(drinkRows) || findRowMissingPrice(itemRows);
    if (missing) {
      setError(`Add a price for "${missing}", or remove it.`);
      return;
    }
    const menu = [...rowsToMenuItems(drinkRows, 'drink'), ...rowsToMenuItems(itemRows, 'item')];
    const syrups = rowsToFlavorOptions(syrupRows);
    const milks = rowsToFlavorOptions(milkRows);
    const inventory: Record<string, number> = {};
    menu.forEach((m) => {
      const n = parseInt(invValues[m.id] ?? '0', 10);
      inventory[m.id] = !isNaN(n) && n >= 0 ? n : 0;
    });
    setError('');
    setSaving(true);
    try {
      await onSave({
        eventName: eventName.trim() || event.eventName,
        eventDate,
        startTime,
        endTime,
        menu,
        syrups,
        milks,
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
          {trackableRows.map((row) => (
            <div className="inv-item-row" key={row.id}>
              <div className="inv-item-label">
                <span>{row.name || '(unnamed)'}</span>
                <span className={'type-tag ' + (drinkRows.includes(row) ? 'drink' : 'item')}>
                  {drinkRows.includes(row) ? 'Drink' : 'Item'}
                </span>
              </div>
              <input
                className="text-input inv-item-input"
                type="number"
                min={0}
                value={invValues[row.id] ?? '0'}
                onChange={(e) => setInvValues((v) => ({ ...v, [row.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="field-group">
          <div className="settings-section-header">
            <label className="field-label" style={{ marginBottom: 0 }}>Menu</label>
            <button className="add-row-btn" type="button" onClick={() => setMenuEditorOpen((v) => !v)}>
              {menuEditorOpen ? 'Hide menu' : '✎ Edit menu'}
            </button>
          </div>

          {menuEditorOpen && (
            <>
              <div className="menu-section menu-section-drinks">
                <div className="menu-section-title">
                  <span className="menu-section-icon">🥤</span> Drinks
                </div>
                {renderRows(drinkRows, setDrinkRows, { namePlaceholder: 'Item name (e.g. Iced Matcha)', priceRequired: true })}
                <button className="add-row-btn" type="button" onClick={() => addRow(setDrinkRows)}>
                  + Add drink
                </button>
              </div>

              <div className="menu-section menu-section-syrup">
                <div className="menu-section-title">
                  <span className="menu-section-icon">🍯</span> Syrup
                </div>
                {renderRows(syrupRows, setSyrupRows, { namePlaceholder: 'e.g. Brown Sugar', priceRequired: false })}
                <button className="add-row-btn" type="button" onClick={() => addRow(setSyrupRows)}>
                  + Add syrup option
                </button>
              </div>

              <div className="menu-section menu-section-milk">
                <div className="menu-section-title">
                  <span className="menu-section-icon">🥛</span> Milk
                </div>
                {renderRows(milkRows, setMilkRows, { namePlaceholder: 'e.g. Oat Milk', priceRequired: false })}
                <button className="add-row-btn" type="button" onClick={() => addRow(setMilkRows)}>
                  + Add milk option
                </button>
              </div>

              <div className="menu-section menu-section-items">
                <div className="menu-section-title">
                  <span className="menu-section-icon">🍪</span> Additional items
                </div>
                {renderRows(itemRows, setItemRows, { namePlaceholder: 'e.g. Salt Bread', priceRequired: true })}
                <button className="add-row-btn" type="button" onClick={() => addRow(setItemRows)}>
                  + Add item
                </button>
              </div>
            </>
          )}
        </div>

        {error && <div className="error-text">{error}</div>}
        <button className="primary-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
