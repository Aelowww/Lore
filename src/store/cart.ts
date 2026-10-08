import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MenuItem, OrderLine } from '../shared/types';
import { priceLine } from '../shared/pricing';

export interface CartLine extends OrderLine {
  key: string;
  image: string | null;
  choiceIds: Record<string, string[]>;
}

const lineKey = (itemId: string, choiceIds: Record<string, string[]>, note?: string) =>
  itemId + '|' + JSON.stringify(Object.entries(choiceIds).sort()) + '|' + (note ?? '');

export function makeLine(item: MenuItem, choiceIds: Record<string, string[]>, qty: number, note?: string): CartLine {
  const line = priceLine(item, { itemId: item.id, qty, choiceIds, note });
  return { ...line, key: lineKey(item.id, choiceIds, line.note), image: item.image, choiceIds };
}

interface CartState {
  lines: CartLine[];
  open: boolean;
  add: (line: CartLine) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

/** Shared by the customer cart and the POS register (separate instances). */
const cartSlice = (set: (fn: (s: CartState) => Partial<CartState>) => void): CartState => ({
  lines: [],
  open: false,
  add: (line) =>
    set((s) => {
      const existing = s.lines.find((l) => l.key === line.key);
      if (!existing) return { lines: [...s.lines, line] };
      return { lines: s.lines.map((l) => (l === existing ? withQty(l, l.qty + line.qty) : l)) };
    }),
  setQty: (key, qty) =>
    set((s) => ({
      lines: qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? withQty(l, qty) : l)),
    })),
  remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
  clear: () => set(() => ({ lines: [] })),
  setOpen: (open) => set(() => ({ open })),
});

const withQty = (l: CartLine, qty: number): CartLine => ({ ...l, qty, lineTotal: Math.round(l.unitPrice * qty * 100) / 100 });

export const useCart = create<CartState>()(
  persist((set) => cartSlice(set), {
    name: 'lore-cart',
    storage: createJSONStorage(() => localStorage),
    partialize: (s) => ({ lines: s.lines }) as CartState,
  }),
);

export const usePosCart = create<CartState>()((set) => cartSlice(set));

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartSubtotal = (lines: CartLine[]) => Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
export const toInput = (lines: CartLine[]) => lines.map((l) => ({ itemId: l.itemId, qty: l.qty, choiceIds: l.choiceIds, note: l.note }));
