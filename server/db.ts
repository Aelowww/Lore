import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Inquiry, MenuItem, Order, StaffRole, Voucher } from '../src/shared/types';
import { SEED_MENU, SEED_STAFF, SEED_VOUCHERS } from './seed';

const dir = path.resolve('data');
mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(process.env.LORE_DB ?? path.join(dir, 'lore.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS menu_items (id TEXT PRIMARY KEY, sort INTEGER NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    number INTEGER NOT NULL,
    business_date TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS orders_by_date ON orders (business_date);
  CREATE TABLE IF NOT EXISTS customers (phone TEXT PRIMARY KEY, name TEXT NOT NULL, points INTEGER NOT NULL DEFAULT 0, visits INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS vouchers (code TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, pin TEXT NOT NULL);
`);

// First run: seed menu, vouchers and staff.
if ((db.prepare('SELECT COUNT(*) AS c FROM menu_items').get() as { c: number }).c === 0) {
  for (const m of SEED_MENU) saveMenuItem(m);
  for (const v of SEED_VOUCHERS) saveVoucher(v);
  for (const s of SEED_STAFF) db.prepare('INSERT OR IGNORE INTO staff VALUES (?, ?, ?, ?)').run(s.id, s.name, s.role, s.pin);
}

const parse = <T>(rows: unknown[]) => rows.map((r) => JSON.parse((r as { data: string }).data) as T);

// ── Menu ──────────────────────────────────────────────
export function listMenu(): MenuItem[] {
  return parse<MenuItem>(db.prepare('SELECT data FROM menu_items ORDER BY sort').all());
}
export function getMenuItem(id: string): MenuItem | null {
  const row = db.prepare('SELECT data FROM menu_items WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}
export function saveMenuItem(item: MenuItem) {
  db.prepare('INSERT OR REPLACE INTO menu_items (id, sort, data) VALUES (?, ?, ?)').run(item.id, item.sort, JSON.stringify(item));
}
export function deleteMenuItem(id: string) {
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
}

// ── Orders ────────────────────────────────────────────
export function nextOrderNumber(businessDate: string) {
  const row = db.prepare('SELECT MAX(number) AS n FROM orders WHERE business_date = ?').get(businessDate) as { n: number | null };
  return (row.n ?? 0) + 1;
}
export function saveOrder(o: Order) {
  db.prepare('INSERT OR REPLACE INTO orders (id, number, business_date, status, created_at, data) VALUES (?, ?, ?, ?, ?, ?)').run(
    o.id, o.number, o.businessDate, o.status, o.createdAt, JSON.stringify(o),
  );
}
export function getOrder(id: string): Order | null {
  const row = db.prepare('SELECT data FROM orders WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}
export function ordersForDate(businessDate: string): Order[] {
  return parse<Order>(db.prepare('SELECT data FROM orders WHERE business_date = ? ORDER BY created_at').all(businessDate));
}
export function activeOrders(): Order[] {
  return parse<Order>(
    db.prepare("SELECT data FROM orders WHERE status IN ('pending','preparing','ready') ORDER BY created_at").all(),
  );
}

// ── Customers / loyalty ───────────────────────────────
export function getCustomer(phone: string) {
  return (db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone) as
    | { phone: string; name: string; points: number; visits: number }
    | undefined) ?? null;
}
export function adjustPoints(phone: string, name: string, delta: number, visit: boolean) {
  db.prepare(
    `INSERT INTO customers (phone, name, points, visits) VALUES (?, ?, MAX(0, ?), ?)
     ON CONFLICT(phone) DO UPDATE SET name = excluded.name, points = MAX(0, points + ?), visits = visits + ?`,
  ).run(phone, name, delta, visit ? 1 : 0, delta, visit ? 1 : 0);
}

// ── Vouchers ──────────────────────────────────────────
export function listVouchers(): Voucher[] {
  return parse<Voucher>(db.prepare('SELECT data FROM vouchers ORDER BY code').all());
}
export function getVoucher(code: string): Voucher | null {
  const row = db.prepare('SELECT data FROM vouchers WHERE code = ?').get(code.toUpperCase()) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}
export function saveVoucher(v: Voucher) {
  db.prepare('INSERT OR REPLACE INTO vouchers (code, data) VALUES (?, ?)').run(v.code, JSON.stringify(v));
}

// ── Event inquiries ───────────────────────────────────
export function listInquiries(): Inquiry[] {
  return parse<Inquiry>(db.prepare('SELECT data FROM inquiries ORDER BY created_at DESC').all());
}
export function getInquiry(id: string): Inquiry | null {
  const row = db.prepare('SELECT data FROM inquiries WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}
export function saveInquiry(i: Inquiry) {
  db.prepare('INSERT OR REPLACE INTO inquiries (id, created_at, data) VALUES (?, ?, ?)').run(i.id, i.createdAt, JSON.stringify(i));
}

// ── Staff ─────────────────────────────────────────────
export function findStaffByPin(pin: string) {
  return (db.prepare('SELECT id, name, role FROM staff WHERE pin = ?').get(pin) as
    | { id: string; name: string; role: StaffRole }
    | undefined) ?? null;
}
