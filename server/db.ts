import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from './firebase-admin';
import type { BoardData, Inquiry, MenuItem, Order, StaffRole, Voucher } from '../src/shared/types';
import { SEED_MENU, SEED_STAFF, SEED_VOUCHERS } from './seed';

/*
 * All data lives in Cloud Firestore. Collections:
 *   menu, orders, customers, vouchers, inquiries, staff, counters, loginGuard  — server only
 *   publicOrders/{id}, public/board, public/menu                              — read by the website for live updates
 * Tests set LORE_DB=memory to use a throwaway in-memory copy instead.
 */

type Data = Record<string, any>;
interface Backend {
  get(coll: string, id: string): Promise<Data | null>;
  set(coll: string, id: string, data: Data): Promise<void>;
  delete(coll: string, id: string): Promise<void>;
  where(coll: string, field?: string, op?: '==' | 'in', value?: unknown): Promise<Data[]>;
  /** Read-modify-write that can't interleave with another one on the same document. */
  update(coll: string, id: string, fn: (current: Data | null) => Data): Promise<Data>;
}

function firestoreBackend(): Backend {
  initFirebaseAdmin();
  const fs: Firestore = getFirestore();
  fs.settings({ ignoreUndefinedProperties: true });
  return {
    async get(coll, id) {
      const snap = await fs.collection(coll).doc(id).get();
      return snap.exists ? (snap.data() as Data) : null;
    },
    async set(coll, id, data) {
      await fs.collection(coll).doc(id).set(data);
    },
    async delete(coll, id) {
      await fs.collection(coll).doc(id).delete();
    },
    async where(coll, field, op, value) {
      const ref = fs.collection(coll);
      const snap = await (field ? ref.where(field, op!, value) : ref).get();
      return snap.docs.map((d) => d.data());
    },
    update(coll, id, fn) {
      const ref = fs.collection(coll).doc(id);
      return fs.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const next = fn(snap.exists ? (snap.data() as Data) : null);
        tx.set(ref, next);
        return next;
      });
    },
  };
}

function memoryBackend(): Backend {
  const store = new Map<string, Map<string, Data>>();
  const coll = (name: string) => store.get(name) ?? store.set(name, new Map()).get(name)!;
  const copy = <T>(x: T): T => (x == null ? x : structuredClone(x));
  return {
    async get(c, id) {
      return copy(coll(c).get(id) ?? null);
    },
    async set(c, id, data) {
      coll(c).set(id, copy(JSON.parse(JSON.stringify(data))));
    },
    async delete(c, id) {
      coll(c).delete(id);
    },
    async where(c, field, op, value) {
      const all = [...coll(c).values()].map(copy);
      if (!field) return all;
      return all.filter((d) => (op === 'in' ? (value as unknown[]).includes(d[field]) : d[field] === value));
    },
    async update(c, id, fn) {
      const next = fn(copy(coll(c).get(id) ?? null));
      coll(c).set(id, copy(next));
      return copy(next);
    },
  };
}

const db: Backend = process.env.LORE_DB === 'memory' ? memoryBackend() : firestoreBackend();
const byKey = <T>(xs: T[], key: (x: T) => string | number, desc = false) =>
  xs.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * (desc ? -1 : 1));

// ── Menu ──────────────────────────────────────────────
export async function listMenu(): Promise<MenuItem[]> {
  return byKey((await db.where('menu')) as MenuItem[], (m) => m.sort);
}
export async function getMenuItem(id: string) {
  return (await db.get('menu', id)) as MenuItem | null;
}
export async function saveMenuItem(item: MenuItem) {
  await db.set('menu', item.id, item);
}
export async function deleteMenuItem(id: string) {
  await db.delete('menu', id);
}

// ── Orders ────────────────────────────────────────────
/** Order numbers restart at 1 each business day. */
export async function nextOrderNumber(businessDate: string) {
  const c = await db.update('counters', `orders-${businessDate}`, (cur) => ({ n: (cur?.n ?? 0) + 1 }));
  return c.n as number;
}
export async function saveOrder(o: Order) {
  await db.set('orders', o.id, o);
}
export async function getOrder(id: string) {
  return (await db.get('orders', id)) as Order | null;
}
export async function ordersForDate(businessDate: string): Promise<Order[]> {
  return byKey((await db.where('orders', 'businessDate', '==', businessDate)) as Order[], (o) => o.createdAt);
}
export async function activeOrders(): Promise<Order[]> {
  return byKey((await db.where('orders', 'status', 'in', ['pending', 'preparing', 'ready'])) as Order[], (o) => o.createdAt);
}

// ── Customers / loyalty ───────────────────────────────
export async function getCustomer(phone: string) {
  return (await db.get('customers', phone)) as { phone: string; name: string; points: number; visits: number } | null;
}
export async function adjustPoints(phone: string, name: string, delta: number, visit: boolean) {
  await db.update('customers', phone, (c) => ({
    phone,
    name,
    points: Math.max(0, (c?.points ?? 0) + delta),
    visits: (c?.visits ?? 0) + (visit ? 1 : 0),
  }));
}

// ── Vouchers ──────────────────────────────────────────
export async function listVouchers(): Promise<Voucher[]> {
  return byKey((await db.where('vouchers')) as Voucher[], (v) => v.code);
}
export async function getVoucher(code: string) {
  return (await db.get('vouchers', code.toUpperCase())) as Voucher | null;
}
export async function saveVoucher(v: Voucher) {
  await db.set('vouchers', v.code, v);
}

// ── Event inquiries ───────────────────────────────────
export async function listInquiries(): Promise<Inquiry[]> {
  return byKey((await db.where('inquiries')) as Inquiry[], (i) => i.createdAt, true);
}
export async function getInquiry(id: string) {
  return (await db.get('inquiries', id)) as Inquiry | null;
}
export async function saveInquiry(i: Inquiry) {
  await db.set('inquiries', i.id, i);
}

// ── Live documents the website listens to ─────────────
export async function publishOrder(publicView: Data) {
  await db.set('publicOrders', publicView.id, publicView);
}
export async function publishBoard(board: BoardData) {
  await db.set('public', 'board', board);
}
/** Tells open menus to refetch. */
export async function publishMenuChange() {
  await db.set('public', 'menu', { version: Date.now() });
}

// ── Staff ─────────────────────────────────────────────
// PINs are stored as scrypt hashes ("salt:hash"), never in plain text.
type StaffRow = { id: string; name: string; role: StaffRole; pin: string };

function hashPin(pin: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`;
}
function pinMatches(pin: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  return timingSafeEqual(scryptSync(pin, salt, 32), Buffer.from(hash, 'hex'));
}
const randomPin = () => String(randomInt(0, 10000)).padStart(4, '0');
const allStaff = async () => (await db.where('staff')) as StaffRow[];

export async function findStaffByPin(pin: string) {
  const s = (await allStaff()).find((r) => pinMatches(pin, r.pin));
  return s ? { id: s.id, name: s.name, role: s.role } : null;
}

export async function setStaffPin(id: string, pin: string) {
  if (!/^\d{4}$/.test(pin)) throw new Error('A PIN is exactly 4 digits.');
  const staff = await allStaff();
  if (staff.some((s) => s.id !== id && pinMatches(pin, s.pin))) throw new Error('Another staff account already uses that PIN.');
  const me = staff.find((s) => s.id === id);
  if (!me) throw new Error(`No staff account "${id}".`);
  await db.set('staff', id, { ...me, pin: hashPin(pin) });
}

// ── PIN guessing protection ───────────────────────────
// Kept in the database because Cloud Functions may run several copies of the server at once.
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const recent = (times: number[] = []) => times.filter((t) => t > Date.now() - LOCK_WINDOW_MS);

export async function recentLoginFailures(key: string) {
  return recent((await db.get('loginGuard', key))?.times).length;
}
export async function recordLoginFailure(key: string) {
  await db.update('loginGuard', key, (cur) => ({ times: [...recent(cur?.times), Date.now()] }));
}
export async function clearLoginFailures(key: string) {
  await db.delete('loginGuard', key);
}

// ── First-time setup ──────────────────────────────────
/**
 * Adds the starting menu and promo codes if the menu is empty, and creates any missing staff
 * accounts. A PIN comes from STAFF_<ID>_PIN (e.g. STAFF_MANAGER_PIN) or is generated.
 * Returns the PINs it created so the caller can show them once.
 */
export async function seed() {
  if ((await db.where('menu')).length === 0) {
    for (const m of SEED_MENU) await saveMenuItem(m);
    for (const v of SEED_VOUCHERS) await saveVoucher(v);
  }
  const created: { id: string; name: string; pin: string }[] = [];
  for (const s of SEED_STAFF) {
    if (await db.get('staff', s.id)) continue;
    const envPin = process.env[`STAFF_${s.id.toUpperCase()}_PIN`];
    if (envPin && !/^\d{4}$/.test(envPin)) throw new Error(`STAFF_${s.id.toUpperCase()}_PIN must be exactly 4 digits.`);
    const existing = await allStaff();
    let pin = envPin ?? randomPin();
    while (!envPin && existing.some((o) => pinMatches(pin, o.pin))) pin = randomPin();
    await db.set('staff', s.id, { ...s, pin: hashPin(pin) });
    created.push({ id: s.id, name: s.name, pin });
  }
  return created;
}

/** Every collection, for the JSON backup script. */
export async function dumpAll() {
  const names = ['menu', 'orders', 'customers', 'vouchers', 'inquiries', 'staff', 'counters'];
  return Object.fromEntries(await Promise.all(names.map(async (n) => [n, await db.where(n)] as const)));
}
