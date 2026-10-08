import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import clsx from 'clsx';
import type { MenuItem } from '../shared/types';
import { peso, resolveSelections } from '../shared/pricing';
import { makeLine, type CartLine } from '../store/cart';
import { Modal, Photo } from './ui';

function defaults(item: MenuItem) {
  const out: Record<string, string[]> = {};
  for (const g of item.optionGroups) out[g.id] = g.required && g.choices[0] ? [g.choices[0].id] : [];
  return out;
}

/** Customize an item (size, milk, sweetness, add-ons…) and add it to a cart. */
export function ItemDialog({
  item,
  onClose,
  onAdd,
  compact,
}: {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (line: CartLine) => void;
  compact?: boolean;
}) {
  const [choices, setChoices] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (item) {
      setChoices(defaults(item));
      setQty(1);
      setNote('');
    }
  }, [item]);

  if (!item) return null;
  const unit = item.price + resolveSelections(item, choices).reduce((s, x) => s + x.price, 0);

  const toggle = (groupId: string, choiceId: string, single: boolean) =>
    setChoices((c) => {
      const cur = c[groupId] ?? [];
      if (single) return { ...c, [groupId]: [choiceId] };
      return { ...c, [groupId]: cur.includes(choiceId) ? cur.filter((x) => x !== choiceId) : [...cur, choiceId] };
    });

  return (
    <Modal open onClose={onClose} label={item.name}>
      {!compact && <Photo src={item.image} alt={item.name} className="aspect-[8/7] max-h-[45vh] w-full" />}
      <div className="space-y-5 p-5 sm:p-6">
        <div>
          <div className="flex items-start justify-between gap-4 pr-8">
            <h2 className="font-display text-3xl font-semibold leading-tight">{item.name}</h2>
          </div>
          <p className="mt-1 text-sm text-espresso-600">{item.description}</p>
          <p className="mt-2 font-semibold text-clay-600">{peso(item.price)}</p>
        </div>

        {item.optionGroups.map((g) => (
          <fieldset key={g.id}>
            <legend className="label flex w-full justify-between">
              <span>{g.name}</span>
              <span className="font-normal normal-case tracking-normal text-espresso-600/70">
                {g.type === 'single' ? 'Choose 1' : 'Optional'}
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {g.choices.map((c) => {
                const on = (choices[g.id] ?? []).includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(g.id, c.id, g.type === 'single')}
                    className={clsx(
                      'rounded-full border px-3.5 py-2 text-sm transition',
                      on ? 'border-clay-500 bg-clay-500 text-white' : 'border-cream-300 bg-white text-espresso-800 hover:border-clay-400',
                    )}
                  >
                    {c.label}
                    {c.price > 0 && <span className={clsx('ml-1.5 text-xs', on ? 'text-white/80' : 'text-espresso-600')}>+{peso(c.price)}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div>
          <label className="label" htmlFor="item-note">Special instructions</label>
          <input id="item-note" className="input" maxLength={140} placeholder="e.g. less ice, no onions" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center gap-3 border-t border-cream-200 bg-cream-50/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
          <div className="flex items-center rounded-full border border-cream-300 bg-white">
            <button className="grid size-10 place-items-center rounded-full hover:bg-cream-100" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
              <Minus className="size-4" />
            </button>
            <span className="w-8 text-center font-semibold tabular-nums">{qty}</span>
            <button className="grid size-10 place-items-center rounded-full hover:bg-cream-100" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="Increase quantity">
              <Plus className="size-4" />
            </button>
          </div>
          <button
            className="btn-primary flex-1 py-3"
            disabled={!item.available}
            onClick={() => {
              onAdd(makeLine(item, choices, qty, note));
              onClose();
            }}
          >
            {item.available ? `Add · ${peso(unit * qty)}` : 'Sold out'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
