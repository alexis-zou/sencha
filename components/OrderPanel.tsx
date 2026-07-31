'use client';

import { useRef, useState } from 'react';
import { Order, OrderLineItem, PopupEvent } from '@/lib/types';
import { customBitsFor, formatMoney, lineTotal, remaining } from '@/lib/calculations';
import { burstEffect } from './Burst';
import ItemPickerModal from './ItemPickerModal';

export default function OrderPanel({
  event,
  editingOrder,
  onCancel,
  onSave,
}: {
  event: PopupEvent;
  editingOrder: Order | null;
  onCancel: () => void;
  onSave: (note: string, items: OrderLineItem[]) => void;
}) {
  const [note, setNote] = useState(editingOrder ? editingOrder.note : '');
  const [items, setItems] = useState<OrderLineItem[]>(editingOrder ? editingOrder.items.map((it) => ({ ...it })) : []);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerEditIndex, setPickerEditIndex] = useState<number | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  function computeShortages(candidateItems: OrderLineItem[]): string[] {
    const draftByItem: Record<string, number> = {};
    candidateItems.forEach((it) => {
      draftByItem[it.itemId] = (draftByItem[it.itemId] || 0) + it.qty;
    });
    const shortages: string[] = [];
    Object.entries(draftByItem).forEach(([itemId, need]) => {
      if (need <= 0) return;
      const have = remaining(itemId, event, editingOrder?.id ?? null);
      if (need > have) {
        const itemName = candidateItems.find((it) => it.itemId === itemId)?.itemName || 'Item';
        shortages.push(`${itemName}: only ${Math.max(0, have)} left, this order needs ${need}.`);
      }
    });
    return shortages;
  }

  const shortages = computeShortages(items);

  function handleRemoveLine(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handlePickerConfirm(line: OrderLineItem) {
    if (pickerEditIndex !== null) {
      setItems((prev) => prev.map((it, i) => (i === pickerEditIndex ? line : it)));
    } else {
      setItems((prev) => [...prev, line]);
    }
    setPickerOpen(false);
    setPickerEditIndex(null);
  }

  function handleConfirmOrder() {
    if (items.length === 0) {
      setError('Add a quantity for at least one item.');
      return;
    }
    setError('');
    const currentShortages = computeShortages(items);
    if (currentShortages.length > 0) {
      const proceed = window.confirm(
        'This order needs more stock than you currently have left:\n\n' +
          currentShortages.join('\n') +
          '\n\nAdd it anyway?'
      );
      if (!proceed) return;
    }
    burstEffect(confirmBtnRef.current, ['✨', '⭐', '🌟']);
    onSave(note.trim(), items);
  }

  return (
    <div className="order-panel">
      <div className="order-panel-heading-row">
        <h3>{editingOrder ? 'Edit order' : 'New order'}</h3>
        <span className="order-panel-stamp">✎ jot it down</span>
      </div>

      <div className="field-group">
        <label className="field-label">Name / table</label>
        <input
          className="order-note-input"
          type="text"
          placeholder="e.g. Sarah, Table 4"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div>
        {items.length === 0 ? (
          <div className="empty-state" style={{ padding: '16px 4px' }}>
            No items yet — tap &quot;+ Add item&quot; below.
          </div>
        ) : (
          <div className="draft-lines">
            {items.map((it, idx) => {
              const bits = customBitsFor(it);
              return (
                <div className="draft-line" key={idx}>
                  <div className="draft-line-info">
                    <span className="draft-line-name">
                      {it.qty}× {it.itemName}
                      {bits.length > 0 && <span className="draft-line-custom"> ({bits.join(', ')})</span>}
                    </span>
                    <span className="draft-line-dots" />
                  </div>
                  <div className="draft-line-price">{formatMoney(lineTotal(it))}</div>
                  <button
                    className="draft-line-edit"
                    type="button"
                    onClick={() => {
                      setPickerEditIndex(idx);
                      setPickerOpen(true);
                    }}
                  >
                    ✎
                  </button>
                  <button className="draft-line-remove" type="button" onClick={() => handleRemoveLine(idx)}>
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        className="add-row-btn"
        type="button"
        onClick={() => {
          setPickerEditIndex(null);
          setPickerOpen(true);
        }}
      >
        + Add item
      </button>

      {shortages.length > 0 && <div className="stock-warning">⚠ {shortages.join(' ')}</div>}
      {error && <div className="error-text">{error}</div>}

      <div className="panel-actions" style={{ marginTop: 14 }}>
        <button className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="confirm-btn" ref={confirmBtnRef} onClick={handleConfirmOrder}>
          {editingOrder ? 'Save changes' : 'Add to list'}
        </button>
      </div>

      {pickerOpen && (
        <ItemPickerModal
          menu={event.menu}
          syrups={event.syrups}
          milks={event.milks}
          editing={pickerEditIndex !== null}
          prefill={pickerEditIndex !== null ? items[pickerEditIndex] : null}
          onCancel={() => {
            setPickerOpen(false);
            setPickerEditIndex(null);
          }}
          onConfirm={handlePickerConfirm}
        />
      )}
    </div>
  );
}
