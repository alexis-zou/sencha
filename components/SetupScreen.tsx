'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { uid } from '@/lib/id';
import { FlavorOption, MenuItem, MenuItemType } from '@/lib/types';

interface Row {
  id: string;
  name: string;
  price: string;
}

const newRow = (): Row => ({ id: uid(), name: '', price: '' });

const PAGE_COUNT = 4;
const PAGE_TITLES = ['Event details', 'Build your menu', 'Starting inventory', 'Invite your team'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function rowsToMenuItems(rows: Row[], type: MenuItemType): MenuItem[] {
  return rows
    .map((r) => ({ id: r.id, name: r.name.trim(), price: parseFloat(r.price), type }))
    .filter((m) => m.name && !isNaN(m.price));
}

function rowsToFlavorOptions(rows: Row[]): FlavorOption[] {
  return rows
    .map((r) => ({ id: r.id, name: r.name.trim(), price: parseFloat(r.price || '0') || 0 }))
    .filter((f) => f.name);
}

export default function SetupScreen() {
  const { goHome, createEvent, saveMenuTemplate, loadMenuTemplate, checkEmailRegistered, inviteMember, debugWhoAmI } =
    useAppState();

  const [page, setPage] = useState(0);

  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [drinkRows, setDrinkRows] = useState<Row[]>([newRow()]);
  const [itemRows, setItemRows] = useState<Row[]>([newRow()]);
  const [syrupRows, setSyrupRows] = useState<Row[]>([newRow()]);
  const [milkRows, setMilkRows] = useState<Row[]>([newRow()]);
  const [inviteRows, setInviteRows] = useState<Row[]>([newRow()]);
  const [savedMsg, setSavedMsg] = useState('');

  const [invValues, setInvValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Carry a previously-saved menu into this new event as a starting point.
  useEffect(() => {
    (async () => {
      const tpl = await loadMenuTemplate();
      if (!tpl) return;
      const drinks = tpl.menu.filter((m) => m.type === 'drink').map((m) => ({ id: uid(), name: m.name, price: String(m.price) }));
      const items = tpl.menu.filter((m) => m.type === 'item').map((m) => ({ id: uid(), name: m.name, price: String(m.price) }));
      if (drinks.length) setDrinkRows(drinks);
      if (items.length) setItemRows(items);
      if (tpl.syrups.length) setSyrupRows(tpl.syrups.map((s) => ({ id: uid(), name: s.name, price: s.price ? String(s.price) : '' })));
      if (tpl.milks.length) setMilkRows(tpl.milks.map((m) => ({ id: uid(), name: m.name, price: m.price ? String(m.price) : '' })));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackableItems = [...rowsToMenuItems(drinkRows, 'drink'), ...rowsToMenuItems(itemRows, 'item')];

  // ---------- viewport height tracks whichever page is currently visible ----------
  // Without this, the wizard-track's flex children all stretch to match the
  // *tallest* page (the menu page), leaving a large gap under short pages
  // before the Continue button. ResizeObserver also re-fires if the current
  // page's own content changes height (e.g. adding a menu row).
  const page0Ref = useRef<HTMLDivElement>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const page3Ref = useRef<HTMLDivElement>(null);
  const pageRefs = [page0Ref, page1Ref, page2Ref, page3Ref];
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = pageRefs[page].current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportHeight(el.scrollHeight));
    ro.observe(el);
    setViewportHeight(el.scrollHeight);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // ---------- row helpers ----------
  function addRow(setter: React.Dispatch<React.SetStateAction<Row[]>>) {
    setter((rows) => [...rows, newRow()]);
  }
  function removeRow(setter: React.Dispatch<React.SetStateAction<Row[]>>, id: string) {
    setter((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  }
  function updateRow(setter: React.Dispatch<React.SetStateAction<Row[]>>, id: string, patch: Partial<Row>) {
    setter((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleSaveMenu() {
    await saveMenuTemplate({
      menu: [...rowsToMenuItems(drinkRows, 'drink'), ...rowsToMenuItems(itemRows, 'item')],
      syrups: rowsToFlavorOptions(syrupRows),
      milks: rowsToFlavorOptions(milkRows),
    });
    setSavedMsg('Saved — this menu will prefill your next pop-up.');
    setTimeout(() => setSavedMsg(''), 2400);
  }

  // Drinks and additional items both require a price (syrup/milk don't) --
  // a row with a name but no valid price would otherwise be silently
  // dropped by rowsToMenuItems with no feedback, vanishing from every
  // later screen (inventory, order picker, summary) with no trace.
  function findRowMissingPrice(rows: Row[]): string | null {
    const row = rows.find((r) => r.name.trim() && isNaN(parseFloat(r.price)));
    return row ? row.name.trim() : null;
  }

  function handleContinueFromMenu() {
    const missing = findRowMissingPrice(drinkRows) || findRowMissingPrice(itemRows);
    if (missing) {
      setError(`Add a price for "${missing}", or remove it.`);
      return;
    }
    setError('');
    setPage((p) => p + 1);
  }

  function handleContinueFromInventory() {
    let invError = false;
    trackableItems.forEach((m) => {
      const n = parseInt(invValues[m.id] ?? '', 10);
      if (isNaN(n) || n < 0) invError = true;
    });
    if (invError) {
      setError('Enter a starting count (0 or more) for every item.');
      return;
    }
    setError('');
    setPage((p) => p + 1);
  }

  async function handleStartSelling() {
    const menu = trackableItems;
    if (menu.length === 0) {
      setError('Add at least one drink or item with a name and price.');
      setPage(1);
      return;
    }
    const inventory: Record<string, number> = {};
    let invError = false;
    menu.forEach((m) => {
      const n = parseInt(invValues[m.id] ?? '', 10);
      if (isNaN(n) || n < 0) invError = true;
      inventory[m.id] = isNaN(n) || n < 0 ? 0 : n;
    });
    if (invError) {
      setError('Enter a starting count (0 or more) for every item.');
      setPage(2);
      return;
    }

    const inviteEmails = inviteRows.map((r) => r.name.trim()).filter(Boolean);
    const badFormat = inviteEmails.find((e) => !EMAIL_RE.test(e));
    if (badFormat) {
      setError(`"${badFormat}" doesn't look like a valid email address.`);
      setPage(3);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      // Validate every invite is a registered account *before* creating
      // anything -- if this ran after createEvent, a bad email would
      // leave a real event behind with no safe way to retry without
      // creating a duplicate.
      if (inviteEmails.length > 0) {
        const checks = await Promise.all(
          inviteEmails.map(async (email) => ({ email, ok: await checkEmailRegistered(email) }))
        );
        const notRegistered = checks.filter((c) => !c.ok).map((c) => c.email);
        if (notRegistered.length > 0) {
          setError(`No registered Sencha account for: ${notRegistered.join(', ')}.`);
          setPage(3);
          setSubmitting(false);
          return;
        }
      }

      const newEvent = await createEvent({
        eventName: eventName.trim() || 'My Stand',
        eventDate,
        startTime,
        endTime,
        inventory,
        menu,
        syrups: rowsToFlavorOptions(syrupRows),
        milks: rowsToFlavorOptions(milkRows),
      });

      if (inviteEmails.length > 0) {
        await Promise.all(inviteEmails.map((email) => inviteMember(newEvent.id, email)));
      }
    } catch (err) {
      // TEMPORARY DEBUG -- diagnosing the events-insert RLS failure.
      const who = await debugWhoAmI();
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Could not create your stand. DEBUG: ${detail} | whoami: ${who}`);
      setSubmitting(false);
    }
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

  return (
    <div id="setup-view" className="setup-wrap">
      <div className="wizard-topbar">
        <button
          className="wizard-icon-btn"
          type="button"
          onClick={() => (page === 0 ? goHome() : setPage((p) => p - 1))}
          aria-label={page === 0 ? 'Cancel' : 'Back'}
        >
          {page === 0 ? '✕' : '←'}
        </button>
        <div className="wizard-topbar-title">
          <span className="eyebrow">Step {page + 1} of {PAGE_COUNT}</span>
          <h1>{PAGE_TITLES[page]}</h1>
        </div>
        <div className="wizard-icon-btn-spacer" aria-hidden="true" />
      </div>

      <div className="wizard-dots">
        {Array.from({ length: PAGE_COUNT }).map((_, i) => (
          <button
            key={i}
            type="button"
            className={'wizard-dot' + (i === page ? ' active' : '')}
            onClick={() => setPage(i)}
            aria-label={`Go to step ${i + 1}`}
          />
        ))}
      </div>

      <div
        className="wizard-viewport"
        style={{
          height: viewportHeight !== undefined ? `${viewportHeight}px` : 'auto',
          transition: 'height 0.32s ease',
        }}
      >
        <div
          className="wizard-track"
          style={{
            width: `${PAGE_COUNT * 100}%`,
            transform: `translateX(${-page * (100 / PAGE_COUNT)}%)`,
            transition: 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* ---------- Page 1: event details ---------- */}
          <div className="wizard-page" style={{ width: `${100 / PAGE_COUNT}%` }} ref={page0Ref}>
            <div className="detail-card">
              <div className="detail-row">
                <input
                  className="detail-title-input"
                  type="text"
                  placeholder="Event name (e.g. Saturday Farmers Market)"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                />
              </div>
            </div>

            <div className="detail-card">
              <div className="detail-row">
                <span className="detail-label">Date</span>
                <input
                  className="detail-pill-input"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div className="detail-row">
                <span className="detail-label">Starts</span>
                <input
                  className="detail-pill-input"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="detail-row">
                <span className="detail-label">Ends</span>
                <input
                  className="detail-pill-input"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ---------- Page 2: menu ---------- */}
          <div className="wizard-page" style={{ width: `${100 / PAGE_COUNT}%` }} ref={page1Ref}>
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

            <button className="save-menu-btn" type="button" onClick={handleSaveMenu}>
              💾 Save this menu for next time
            </button>
            {savedMsg && <div className="save-menu-flash">{savedMsg}</div>}
          </div>

          {/* ---------- Page 3: starting inventory ---------- */}
          <div className="wizard-page" style={{ width: `${100 / PAGE_COUNT}%` }} ref={page2Ref}>
            {trackableItems.length === 0 ? (
              <div className="empty-state">
                <span className="display">Nothing to stock yet</span>
                Add a drink or item on the previous page first.
                <div style={{ marginTop: 14 }}>
                  <button className="back-link" style={{ padding: 0 }} onClick={() => setPage(1)}>
                    ← Back to menu
                  </button>
                </div>
              </div>
            ) : (
              <div className="detail-card">
                {trackableItems.map((item) => (
                  <div className="detail-row" key={item.id}>
                    <div className="detail-row-item-label">
                      <span className="detail-label">{item.name}</span>
                      <span className={'type-tag ' + item.type}>{item.type === 'drink' ? 'Drink' : 'Item'}</span>
                    </div>
                    <input
                      className="detail-pill-input"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="0"
                      value={invValues[item.id] ?? ''}
                      onChange={(e) => setInvValues((v) => ({ ...v, [item.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---------- Page 4: invite your team ---------- */}
          <div className="wizard-page" style={{ width: `${100 / PAGE_COUNT}%` }} ref={page3Ref}>
            <div className="menu-section menu-section-drinks">
              <div className="menu-section-title">
                <span className="menu-section-icon">🤝</span> Invite your team
              </div>
              <p className="wizard-invite-blurb">
                Add teammates who already have a Sencha account — they&apos;ll get full access to this stand as soon
                as it&apos;s created. Optional; you can always invite people later from Settings.
              </p>
              <div className="detail-card">
                {inviteRows.map((row) => (
                  <div className="detail-row detail-row-menu" key={row.id}>
                    <input
                      className="detail-title-input"
                      type="email"
                      placeholder="teammate@example.com"
                      value={row.name}
                      onChange={(e) => updateRow(setInviteRows, row.id, { name: e.target.value })}
                    />
                    <button
                      className="detail-row-remove"
                      type="button"
                      onClick={() => removeRow(setInviteRows, row.id)}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button className="add-row-btn" type="button" onClick={() => addRow(setInviteRows)}>
                + Add teammate
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="wizard-nav">
        {page < PAGE_COUNT - 1 ? (
          <button
            className="confirm-btn"
            type="button"
            onClick={
              page === 1 ? handleContinueFromMenu : page === 2 ? handleContinueFromInventory : () => setPage((p) => p + 1)
            }
          >
            Continue →
          </button>
        ) : (
          <button className="confirm-btn" type="button" onClick={handleStartSelling} disabled={submitting}>
            {submitting ? 'Setting up your stand…' : 'Start selling'}
          </button>
        )}
      </div>
    </div>
  );
}
