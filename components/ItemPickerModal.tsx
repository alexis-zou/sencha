'use client';

import { useState } from 'react';
import { FlavorOption, MenuItem, OrderLineItem } from '@/lib/types';
import { ICE_OPTIONS } from '@/lib/constants';
import { formatMoney } from '@/lib/calculations';

const NONE_SYRUP: FlavorOption = { id: 'none', name: 'None', price: 0 };
const NO_MILK: FlavorOption = { id: 'none', name: 'No Milk', price: 0 };

export default function ItemPickerModal({
  menu,
  syrups,
  milks,
  prefill,
  editing,
  onCancel,
  onConfirm,
}: {
  menu: MenuItem[];
  syrups: FlavorOption[];
  milks: FlavorOption[];
  prefill: OrderLineItem | null;
  editing: boolean;
  onCancel: () => void;
  onConfirm: (line: OrderLineItem) => void;
}) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(prefill ? prefill.itemId : null);
  const [qty, setQty] = useState<number>(prefill ? prefill.qty : 1);
  const [syrupId, setSyrupId] = useState<string>(prefill?.syrupId || 'none');
  const [milkId, setMilkId] = useState<string>(prefill?.milkId || 'none');
  const [ice, setIce] = useState<string>(prefill?.ice || ICE_OPTIONS[0]);

  const selectedItem = menu.find((m) => m.id === selectedItemId) || null;
  const isDrink = selectedItem?.type === 'drink';
  const syrupOptions = [NONE_SYRUP, ...syrups];
  const milkOptions = [NO_MILK, ...milks];

  function optionLabel(o: FlavorOption): string {
    return o.price > 0 ? `${o.name} (+${formatMoney(o.price)})` : o.name;
  }

  function handleConfirm() {
    if (!selectedItem) return; // "Add item" stays disabled until something is picked, so this shouldn't fire
    const line: OrderLineItem = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      price: selectedItem.price,
      qty,
    };
    if (selectedItem.type === 'drink') {
      const syrup = syrupOptions.find((s) => s.id === syrupId) || NONE_SYRUP;
      const milk = milkOptions.find((m) => m.id === milkId) || NO_MILK;
      line.syrupId = syrup.id;
      line.syrupName = syrup.name;
      line.syrupPrice = syrup.price;
      line.milkId = milk.id;
      line.milkName = milk.name;
      line.milkPrice = milk.price;
      line.ice = ice;
    }
    onConfirm(line);
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-sheet">
        <div className="modal-close-row">
          <button className="icon-x" onClick={onCancel}>✕</button>
        </div>
        <h2>{editing ? 'Edit item' : 'Add item'}</h2>

        <div>
          {menu.map((m) => (
            <button
              key={m.id}
              type="button"
              className={'item-pick-btn' + (m.id === selectedItemId ? ' selected' : '')}
              onClick={() => setSelectedItemId(m.id)}
            >
              <span className="item-pick-name">{m.name}</span>
              <span className="item-pick-price">${m.price}</span>
            </button>
          ))}
        </div>

        {selectedItem && (
          <div className="configure-box">
            {isDrink && (
              <>
                <div className="field-group">
                  <label className="field-label">Syrup</label>
                  <select className="select-input" value={syrupId} onChange={(e) => setSyrupId(e.target.value)}>
                    {syrupOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {optionLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Milk</label>
                  <select className="select-input" value={milkId} onChange={(e) => setMilkId(e.target.value)}>
                    {milkOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {optionLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Ice</label>
                  <select className="select-input" value={ice} onChange={(e) => setIce(e.target.value)}>
                    {ICE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="qty-row">
              <span className="field-label" style={{ margin: 0 }}>
                Quantity
              </span>
              <div className="qty-controls">
                <button className="qty-btn" type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  −
                </button>
                <span className="qty-num">{qty}</span>
                <button className="qty-btn" type="button" onClick={() => setQty((q) => q + 1)}>
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="panel-actions" style={{ marginTop: 16 }}>
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-btn" disabled={!selectedItem} onClick={handleConfirm}>
            {editing ? 'Save item' : 'Add item'}
          </button>
        </div>
      </div>
    </div>
  );
}
