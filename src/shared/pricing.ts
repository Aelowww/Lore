import type { CartLineInput, MenuItem, OrderLine, PaymentMethod, Selection } from './types';

/** Cashless processing fees, as posted by Lore on Instagram (QR 1%, card 3%). */
export const PAYMENT_FEES: Record<PaymentMethod, number> = { cash: 0, qr: 0.01, card: 0.03, bank: 0 };

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  qr: 'QR (GCash / Maya / QR Ph)',
  card: 'Credit / Debit Card',
  bank: 'Bank Transfer',
};

/** Loyalty: 1 point for every ₱50 spent; each point is worth ₱1 off. */
export const PESOS_PER_POINT = 50;
export const SENIOR_PWD_RATE = 0.2;

export const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Resolve chosen option ids against the item's option groups. Unknown ids are dropped,
 * single-choice groups keep only one, and required groups fall back to their first choice.
 */
export function resolveSelections(item: MenuItem, choiceIds: Record<string, string[]>): Selection[] {
  const out: Selection[] = [];
  for (const group of item.optionGroups) {
    let ids = (choiceIds[group.id] ?? []).filter((id) => group.choices.some((c) => c.id === id));
    if (group.type === 'single') ids = ids.slice(0, 1);
    if (group.required && ids.length === 0 && group.choices[0]) ids = [group.choices[0].id];
    for (const id of ids) {
      const c = group.choices.find((x) => x.id === id)!;
      out.push({ groupId: group.id, groupName: group.name, choiceId: c.id, label: c.label, price: c.price });
    }
  }
  return out;
}

export function priceLine(item: MenuItem, input: CartLineInput): OrderLine {
  const qty = Math.max(1, Math.min(50, Math.floor(input.qty || 1)));
  const selections = resolveSelections(item, input.choiceIds ?? {});
  const unitPrice = round2(item.price + selections.reduce((s, x) => s + x.price, 0));
  return {
    itemId: item.id,
    name: item.name,
    qty,
    basePrice: item.price,
    selections,
    unitPrice,
    lineTotal: round2(unitPrice * qty),
    note: input.note?.trim().slice(0, 140) || undefined,
  };
}

export function describeSelections(selections: Selection[]) {
  return selections.map((s) => s.label).join(' · ');
}

export const peso = (n: number) =>
  '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
