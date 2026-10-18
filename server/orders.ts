import { randomBytes } from 'node:crypto';
import type { Order, OrderLine, OrderRequest, OrderStatus, PaymentMethod, Totals } from '../src/shared/types';
import { PAYMENT_FEES, PESOS_PER_POINT, SENIOR_PWD_RATE, priceLine, round2 } from '../src/shared/pricing';
import { ONLINE_PAYMENT_METHODS, businessDate, storeStatus } from '../src/shared/store-info';
import * as db from './db';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const METHODS: PaymentMethod[] = ['cash', 'qr', 'card', 'bank'];
const nowIso = () => new Date().toISOString();

export function normalizePhone(raw?: string | null) {
  if (!raw) return null;
  let p = raw.replace(/[\s-]/g, '');
  if (p.startsWith('+63')) p = '0' + p.slice(3);
  if (!/^09\d{9}$/.test(p)) throw new HttpError(400, 'Enter a valid mobile number, e.g. 09171234567');
  return p;
}

const FEE_NAMES: Record<PaymentMethod, string> = { cash: 'Cash', qr: 'QR', card: 'Card', bank: 'Bank' };

function feeFor(method: PaymentMethod, base: number) {
  const rate = PAYMENT_FEES[method];
  return {
    fee: round2(base * rate),
    feeLabel: rate ? `${FEE_NAMES[method]} fee (${rate * 100}%)` : null,
  };
}

/** Price an order request. Throws HttpError with a customer-facing message on any problem. */
export async function quote(req: OrderRequest, pos: boolean): Promise<{ lines: OrderLine[]; totals: Totals }> {
  if (!Array.isArray(req.lines) || req.lines.length === 0) throw new HttpError(400, 'Your cart is empty.');
  if (!METHODS.includes(req.paymentMethod)) throw new HttpError(400, 'Choose a payment method.');

  const lines: OrderLine[] = [];
  for (const input of req.lines) {
    const item = await db.getMenuItem(input.itemId);
    if (!item) throw new HttpError(400, 'An item in your cart is no longer on the menu.');
    if (!item.available) throw new HttpError(409, `Sorry, ${item.name} is sold out right now.`);
    lines.push(priceLine(item, input));
  }
  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const discounts: Totals['discounts'] = [];

  const discountType = pos ? req.discountType ?? 'none' : 'none';
  if (discountType !== 'none') {
    if (!req.discountIdNo?.trim()) throw new HttpError(400, 'Enter the Senior Citizen / PWD ID number.');
    discounts.push({ label: `${discountType === 'senior' ? 'Senior Citizen' : 'PWD'} discount (20%)`, amount: round2(subtotal * SENIOR_PWD_RATE) });
  }

  if (req.voucherCode?.trim()) {
    if (discountType !== 'none') throw new HttpError(400, 'Promo codes can’t be combined with the Senior/PWD discount.');
    const v = await db.getVoucher(req.voucherCode.trim());
    if (!v || !v.active) throw new HttpError(400, 'That promo code isn’t valid.');
    if (subtotal < v.minSpend) throw new HttpError(400, `${v.code} needs a minimum spend of ₱${v.minSpend}.`);
    discounts.push({ label: `Promo ${v.code}`, amount: round2(v.kind === 'percent' ? (subtotal * v.value) / 100 : v.value) });
  }

  const phone = normalizePhone(req.phone);
  const redeem = Math.max(0, Math.floor(req.redeemPoints ?? 0));
  if (redeem > 0) {
    if (!phone) throw new HttpError(400, 'Add your mobile number to use Lore points.');
    const balance = (await db.getCustomer(phone))?.points ?? 0;
    if (redeem > balance) throw new HttpError(400, `You only have ${balance} points.`);
    const room = subtotal - discounts.reduce((s, d) => s + d.amount, 0);
    discounts.push({ label: `Lore points (${redeem})`, amount: Math.min(redeem, Math.max(0, room)) });
  }

  const discountTotal = round2(Math.min(subtotal, discounts.reduce((s, d) => s + d.amount, 0)));
  const base = round2(subtotal - discountTotal);
  const { fee, feeLabel } = feeFor(req.paymentMethod, base);
  return {
    lines,
    totals: {
      subtotal,
      discounts,
      discountTotal,
      fee,
      feeLabel,
      total: round2(base + fee),
      pointsEarned: phone ? Math.floor(base / PESOS_PER_POINT) : 0,
    },
  };
}

export async function createOrder(req: OrderRequest, source: 'online' | 'pos', staffName?: string): Promise<Order> {
  const pos = source === 'pos';
  const customerName = (req.customerName ?? '').trim().slice(0, 60) || (pos ? 'Walk-in' : '');
  if (!customerName) throw new HttpError(400, 'Please enter your name.');
  if (!['dine-in', 'takeout', 'pickup'].includes(req.type)) throw new HttpError(400, 'Choose dine-in, takeout or pickup.');
  if (req.type === 'pickup' && !req.pickupTime) throw new HttpError(400, 'Choose a pickup time.');
  if (!pos) requireOnlineMethod(req.paymentMethod);
  if (!pos && !storeStatus().open && req.type !== 'pickup') {
    throw new HttpError(400, 'We’re closed right now — you can still schedule a pickup for when we open.');
  }

  const phone = normalizePhone(req.phone);
  const { lines, totals } = await quote(req, pos);
  const now = nowIso();
  const date = businessDate();
  const order: Order = {
    ...totals,
    id: randomBytes(8).toString('hex'),
    number: await db.nextOrderNumber(date),
    businessDate: date,
    createdAt: now,
    updatedAt: now,
    source,
    customerName,
    phone,
    type: req.type,
    table: req.type === 'dine-in' ? req.table?.trim().slice(0, 10) || null : null,
    pickupTime: req.type === 'pickup' ? req.pickupTime! : null,
    notes: req.notes?.trim().slice(0, 300) || null,
    lines,
    paymentMethod: req.paymentMethod,
    paymentStatus: 'unpaid',
    paymentRef: null,
    cardLast4: null,
    cashTendered: null,
    change: null,
    voucherCode: req.voucherCode?.trim().toUpperCase() || null,
    pointsRedeemed: Math.max(0, Math.floor(req.redeemPoints ?? 0)),
    status: pos ? 'preparing' : 'pending',
    statusHistory: [{ status: pos ? 'preparing' : 'pending', at: now, by: staffName }],
    handledBy: staffName ?? null,
  };

  if (pos && !req.payLater) applyCounterPayment(order, { method: req.paymentMethod, cashTendered: req.cashTendered, reference: req.paymentRef });
  if (phone && order.pointsRedeemed) await db.adjustPoints(phone, customerName, -order.pointsRedeemed, false);
  await db.saveOrder(order);
  return order;
}

/** Switch payment method before payment; the processing fee is recalculated. */
function setMethod(order: Order, method: PaymentMethod) {
  if (!METHODS.includes(method)) throw new HttpError(400, 'Unknown payment method.');
  order.paymentMethod = method;
  const base = round2(order.subtotal - order.discountTotal);
  Object.assign(order, feeFor(method, base));
  order.total = round2(base + order.fee);
}

/** Payment taken at the counter (POS sale or cashier collecting an online order). */
export function applyCounterPayment(
  order: Order,
  p: { method?: PaymentMethod; cashTendered?: number | null; reference?: string | null },
) {
  if (order.paymentStatus === 'paid') throw new HttpError(409, 'This order is already paid.');
  if (order.paymentStatus === 'refunded') throw new HttpError(409, 'This order was refunded.');
  if (p.method && p.method !== order.paymentMethod) setMethod(order, p.method);
  if (order.paymentMethod === 'cash') {
    const tendered = Number(p.cashTendered);
    if (!Number.isFinite(tendered) || tendered < order.total) throw new HttpError(400, 'Cash received is less than the total.');
    order.cashTendered = round2(tendered);
    order.change = round2(tendered - order.total);
  } else {
    order.paymentRef = p.reference?.trim().slice(0, 40) || order.paymentRef;
  }
  order.paymentStatus = 'paid';
  order.updatedAt = nowIso();
}

export interface OnlinePayment {
  method: PaymentMethod;
  reference?: string;
}

function requireOnlineMethod(method: PaymentMethod) {
  if (!ONLINE_PAYMENT_METHODS.includes(method)) throw new HttpError(400, 'That payment method isn’t available online. Choose another.');
}

/**
 * Online payment from the customer's phone. QR and bank transfers are submitted with a reference
 * number for the cashier to verify; cash is paid at the counter. Online card payments need a real
 * gateway (PayMongo / Xendit / Maya Checkout) and are not offered until one is connected.
 */
export function payOnline(order: Order, p: OnlinePayment) {
  if (order.status === 'cancelled') throw new HttpError(409, 'This order was cancelled.');
  if (order.paymentStatus === 'paid') throw new HttpError(409, 'This order is already paid.');
  requireOnlineMethod(p?.method);
  setMethod(order, p.method);

  if (p.method === 'cash') {
    order.paymentStatus = 'unpaid';
  } else {
    const ref = p.reference?.trim() ?? '';
    if (!/^[A-Za-z0-9-]{6,40}$/.test(ref)) throw new HttpError(400, 'Enter the reference number from your payment receipt.');
    order.paymentRef = ref;
    order.paymentStatus = 'pending_verification';
  }
  order.updatedAt = nowIso();
}

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export async function setStatus(order: Order, status: OrderStatus, by: string) {
  if (!NEXT[order.status].includes(status)) throw new HttpError(409, `Can’t move an order from ${order.status} to ${status}.`);
  if (status === 'completed' && order.paymentStatus !== 'paid') throw new HttpError(409, 'Collect payment before completing this order.');
  if (status === 'cancelled' && order.paymentStatus === 'paid') throw new HttpError(409, 'This order is paid — refund it instead.');
  order.status = status;
  order.statusHistory.push({ status, at: nowIso(), by });
  order.updatedAt = nowIso();
  if (status === 'completed' && order.phone) await db.adjustPoints(order.phone, order.customerName, order.pointsEarned, true);
  if (status === 'cancelled' && order.phone && order.pointsRedeemed) await db.adjustPoints(order.phone, order.customerName, order.pointsRedeemed, false);
}

export async function refund(order: Order, by: string) {
  if (order.paymentStatus !== 'paid') throw new HttpError(409, 'Only paid orders can be refunded.');
  const wasCompleted = order.status === 'completed';
  order.paymentStatus = 'refunded';
  order.status = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', at: nowIso(), by: `${by} (refund)` });
  order.updatedAt = nowIso();
  if (order.phone) {
    const delta = order.pointsRedeemed - (wasCompleted ? order.pointsEarned : 0);
    if (delta) await db.adjustPoints(order.phone, order.customerName, delta, false);
  }
}

/** What the customer-facing tracking page may see. */
export function publicOrder(o: Order) {
  return { ...o, phone: o.phone ? o.phone.slice(0, 4) + '•••' + o.phone.slice(-3) : null, handledBy: null };
}
