import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { OrderRequest } from '../src/shared/types';

// Tests use a throwaway in-memory copy of the database instead of Firestore.
process.env.LORE_DB = 'memory';
process.env.STAFF_CASHIER_PIN = '1111';
process.env.STAFF_MANAGER_PIN = '2222';
const db = await import('./db');
const { HttpError, applyCounterPayment, createOrder, payOnline, quote } = await import('./orders');

before(() => db.seed());

const latte = (choiceIds: Record<string, string[]> = {}, qty = 1) => ({ itemId: 'spanish-latte', qty, choiceIds });
const req = (over: Partial<OrderRequest> = {}): OrderRequest => ({
  customerName: 'Ana',
  type: 'pickup',
  pickupTime: new Date().toISOString(),
  lines: [latte()],
  paymentMethod: 'cash',
  ...over,
});
const isHttp = (status: number) => (e: unknown) => e instanceof HttpError && e.status === status;
const rejects = (fn: () => unknown, status: number) => assert.rejects(async () => fn(), isHttp(status));

test('prices options and quantity on the server', async () => {
  const { totals } = await quote(req({ lines: [latte({ size: ['16oz'], milk: ['oat'] }, 2)] }), false);
  assert.equal(totals.subtotal, (150 + 25 + 35) * 2);
  assert.equal(totals.total, 420);
});

test('ignores option ids that are not on the item', async () => {
  const { totals } = await quote(req({ lines: [latte({ size: ['999oz'], milk: ['gold'] })] }), false);
  assert.equal(totals.subtotal, 150);
});

test('adds the 1% QR fee after discounts', async () => {
  const { totals } = await quote(req({ paymentMethod: 'qr', voucherCode: 'WELCOME10', lines: [latte({}, 2)] }), false);
  assert.equal(totals.discountTotal, 30);
  assert.equal(totals.fee, 2.7);
  assert.equal(totals.total, 272.7);
});

test('enforces promo minimum spend', async () => {
  await rejects(() => quote(req({ voucherCode: 'LOREDAY' }), false), 400);
});

test('Senior/PWD discount is POS only and needs an ID', async () => {
  assert.equal((await quote(req({ discountType: 'senior', discountIdNo: '123' }), false)).totals.discountTotal, 0);
  assert.equal((await quote(req({ discountType: 'senior', discountIdNo: '123' }), true)).totals.discountTotal, 30);
  await rejects(() => quote(req({ discountType: 'pwd' }), true), 400);
});

test('online orders cannot use payment methods that are not set up', async () => {
  await rejects(() => createOrder(req({ paymentMethod: 'card' }), 'online'), 400);
  const order = await createOrder(req(), 'online');
  assert.throws(() => payOnline(order, { method: 'card' }), isHttp(400));
});

test('order numbers count up within a day', async () => {
  const a = await createOrder(req(), 'online');
  const b = await createOrder(req(), 'online');
  assert.equal(b.number, a.number + 1);
});

test('counter cash payment computes change and rejects short cash', async () => {
  const order = await createOrder(req({ payLater: true }), 'pos', 'Cashier');
  assert.throws(() => applyCounterPayment(order, { cashTendered: 100 }), isHttp(400));
  applyCounterPayment(order, { cashTendered: 200 });
  assert.equal(order.change, 50);
  assert.equal(order.paymentStatus, 'paid');
});

test('staff PINs are hashed and can be changed', async () => {
  assert.equal((await db.findStaffByPin('2222'))?.role, 'manager');
  await db.setStaffPin('manager', '4821');
  assert.equal((await db.findStaffByPin('4821'))?.role, 'manager');
  assert.equal(await db.findStaffByPin('2222'), null);
  await assert.rejects(db.setStaffPin('cashier', '4821'), /already uses/);
  await assert.rejects(db.setStaffPin('manager', '12'), /4 digits/);
});

test('wrong-PIN counter records and clears', async () => {
  await db.recordLoginFailure('ip-test');
  await db.recordLoginFailure('ip-test');
  assert.equal(await db.recentLoginFailures('ip-test'), 2);
  await db.clearLoginFailures('ip-test');
  assert.equal(await db.recentLoginFailures('ip-test'), 0);
});
