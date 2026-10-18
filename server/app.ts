import express, { type NextFunction, type Request, type Response } from 'express';
import { randomBytes } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { initFirebaseAdmin } from './firebase-admin.js';
import type { BoardData, Inquiry, MenuItem, Order, OrderRequest, Report, StaffRole, Voucher } from '../src/shared/types.js';
import { businessDate, manilaParts, storeStatus } from '../src/shared/store-info.js';
import { round2 } from '../src/shared/pricing.js';
import * as db from './db.js';
import { HttpError, applyCounterPayment, createOrder, normalizePhone, payOnline, publicOrder, quote, refund, setStatus } from './orders.js';
import { CATEGORIES } from './seed.js';

initFirebaseAdmin();

export const app = express();
app.use(express.json({ limit: '100kb' }));
// Render sits in front of the server as a proxy; trust it so req.ip is the visitor.
app.set('trust proxy', true);

// ── Staff sign-in ───────────────────────────────────
// A correct PIN returns a Firebase custom token. The browser signs in with it, then sends its
// Firebase ID token on every staff request, and can read live orders from Firestore.
const SESSION_HOURS = 14;

type StaffReq = Request & { staff: { name: string; role: StaffRole } };
const requireStaff = (role?: StaffRole) => async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    const claims = token ? await getAuth().verifyIdToken(token).catch(() => null) : null;
    const tooOld = claims && Date.now() / 1000 - claims.auth_time > SESSION_HOURS * 3600;
    if (!claims?.role || tooOld) return next(new HttpError(401, 'Please log in again.'));
    if (role === 'manager' && claims.role !== 'manager') return next(new HttpError(403, 'Manager access only.'));
    (req as StaffReq).staff = { name: claims.staffName, role: claims.role };
    next();
  } catch (e) {
    next(e);
  }
};

// Wraps route handlers so thrown HttpErrors (sync or async) become JSON responses.
const h = (fn: (req: Request, res: Response) => unknown) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const out = await fn(req, res);
    if (out !== undefined) res.json(out);
  } catch (e) {
    next(e);
  }
};

// ── Live updates (the website listens to these Firestore documents) ──
async function boardData(): Promise<BoardData> {
  const today = await db.ordersForDate(businessDate());
  return {
    preparing: today.filter((o) => o.status === 'preparing' || o.status === 'pending').map((o) => o.number),
    ready: today.filter((o) => o.status === 'ready').map((o) => o.number),
  };
}

async function broadcast(order: Order) {
  await Promise.all([db.publishOrder(publicOrder(order)), boardData().then(db.publishBoard)]);
}

// ── Public API ──────────────────────────────────────
app.get('/api/store', h(() => ({ ...storeStatus(), categories: CATEGORIES })));
app.get('/api/menu', h(() => db.listMenu()));
app.get('/api/board', h(() => boardData()));

app.post('/api/orders/quote', h(async (req) => (await quote(req.body as OrderRequest, false)).totals));

app.post(
  '/api/orders',
  h(async (req) => {
    const order = await createOrder(req.body as OrderRequest, 'online');
    await broadcast(order);
    return publicOrder(order);
  }),
);

app.get(
  '/api/orders/:id',
  h(async (req) => {
    const order = await db.getOrder(String(req.params.id));
    if (!order) throw new HttpError(404, 'Order not found.');
    return publicOrder(order);
  }),
);

app.post(
  '/api/orders/:id/pay',
  h(async (req) => {
    const order = await db.getOrder(String(req.params.id));
    if (!order) throw new HttpError(404, 'Order not found.');
    payOnline(order, req.body);
    await db.saveOrder(order);
    await broadcast(order);
    return publicOrder(order);
  }),
);

app.get(
  '/api/loyalty/:phone',
  h(async (req) => {
    const phone = normalizePhone(String(req.params.phone));
    const c = phone ? await db.getCustomer(phone) : null;
    return { points: c?.points ?? 0, visits: c?.visits ?? 0 };
  }),
);

app.post(
  '/api/inquiries',
  h(async (req) => {
    const b = req.body ?? {};
    const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);
    const inquiry: Inquiry = {
      id: randomBytes(6).toString('hex'),
      createdAt: new Date().toISOString(),
      name: str(b.name, 80),
      contact: str(b.contact, 40),
      email: str(b.email, 120),
      service: ['coffee-cart', 'food-packs', 'both'].includes(b.service) ? b.service : 'coffee-cart',
      eventType: str(b.eventType, 60),
      eventDate: str(b.eventDate, 20),
      eventTime: str(b.eventTime, 20),
      guests: Math.max(1, Math.min(5000, Math.floor(Number(b.guests) || 0))),
      venue: str(b.venue),
      notes: str(b.notes, 1000),
      status: 'new',
    };
    if (!inquiry.name || !inquiry.contact || !inquiry.eventDate) throw new HttpError(400, 'Please fill in your name, contact number and event date.');
    await db.saveInquiry(inquiry);
    return { ok: true };
  }),
);

// ── Staff API ───────────────────────────────────────
// A 4-digit PIN only has 10,000 combinations, so wrong guesses are capped per device and overall.
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_TOTAL = 30;

app.post(
  '/api/staff/login',
  h(async (req) => {
    const ipKey = 'ip-' + (req.ip ?? 'unknown').replace(/[^0-9a-fA-F.:]/g, '').replace(/[.:]/g, '_');
    const [mine, total] = await Promise.all([db.recentLoginFailures(ipKey), db.recentLoginFailures('all')]);
    if (mine >= MAX_FAILS_PER_IP || total >= MAX_FAILS_TOTAL) throw new HttpError(429, 'Too many wrong PINs. Wait 15 minutes and try again.');
    const s = await db.findStaffByPin(String(req.body?.pin ?? ''));
    if (!s) {
      await Promise.all([db.recordLoginFailure(ipKey), db.recordLoginFailure('all')]);
      throw new HttpError(401, 'Wrong PIN.');
    }
    await db.clearLoginFailures(ipKey);
    const customToken = await getAuth().createCustomToken(`staff-${s.id}`, { role: s.role, staffName: s.name });
    return { customToken, name: s.name, role: s.role };
  }),
);

const staff = express.Router();
staff.use(requireStaff());
const who = (req: Request) => (req as StaffReq).staff.name;

staff.get(
  '/orders',
  h((req) => (req.query.scope === 'today' ? db.ordersForDate(String(req.query.date ?? businessDate())) : db.activeOrders())),
);

staff.post('/orders/quote', h(async (req) => (await quote(req.body as OrderRequest, true)).totals));

staff.post(
  '/orders',
  h(async (req) => {
    const order = await createOrder(req.body as OrderRequest, 'pos', who(req));
    await broadcast(order);
    return order;
  }),
);

const loadOrder = async (id: unknown) => {
  const o = await db.getOrder(String(id));
  if (!o) throw new HttpError(404, 'Order not found.');
  return o;
};

/** Load an order, apply a change, save it and push it to everyone watching. */
const changeOrder = (fn: (order: Order, req: Request) => unknown) =>
  h(async (req) => {
    const order = await loadOrder(req.params.id);
    await fn(order, req);
    await db.saveOrder(order);
    await broadcast(order);
    return order;
  });

staff.patch(
  '/orders/:id/status',
  changeOrder(async (order, req) => {
    await setStatus(order, req.body.status, who(req));
    order.handledBy ??= who(req);
  }),
);

staff.post('/orders/:id/mark-paid', changeOrder((order, req) => applyCounterPayment(order, req.body ?? {})));

staff.post(
  '/orders/:id/reject-payment',
  changeOrder((order) => {
    if (order.paymentStatus !== 'pending_verification') throw new HttpError(409, 'Nothing to reject.');
    order.paymentStatus = 'unpaid';
    order.paymentRef = null;
    order.updatedAt = new Date().toISOString();
  }),
);

staff.post('/orders/:id/refund', changeOrder((order, req) => refund(order, who(req))));

staff.get(
  '/customers/:phone',
  h(async (req) => {
    const phone = normalizePhone(String(req.params.phone));
    return (phone && (await db.getCustomer(phone))) || { phone, name: '', points: 0, visits: 0 };
  }),
);

// Menu: any staff can mark items sold out; managers edit everything else.
staff.patch(
  '/menu/:id/availability',
  h(async (req) => {
    const item = await db.getMenuItem(String(req.params.id));
    if (!item) throw new HttpError(404, 'Item not found.');
    item.available = Boolean(req.body.available);
    await db.saveMenuItem(item);
    await db.publishMenuChange();
    return item;
  }),
);

function cleanItem(b: Partial<MenuItem>, existing?: MenuItem): MenuItem {
  const name = String(b.name ?? '').trim();
  const price = Number(b.price);
  if (!name) throw new HttpError(400, 'Name is required.');
  if (!Number.isFinite(price) || price < 0) throw new HttpError(400, 'Enter a valid price.');
  const id = existing?.id ?? (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + randomBytes(2).toString('hex'));
  return {
    id,
    name: name.slice(0, 60),
    description: String(b.description ?? '').slice(0, 300),
    category: CATEGORIES.includes(String(b.category)) ? String(b.category) : CATEGORIES[0],
    price: round2(price),
    image: b.image ? String(b.image).slice(0, 300) : null,
    available: b.available ?? true,
    featured: Boolean(b.featured),
    tags: Array.isArray(b.tags) ? b.tags.map(String).slice(0, 5) : [],
    optionGroups: Array.isArray(b.optionGroups) ? b.optionGroups : existing?.optionGroups ?? [],
    sort: existing?.sort ?? Date.now(),
  };
}

staff.post(
  '/menu',
  requireStaff('manager'),
  h(async (req) => {
    const item = cleanItem(req.body);
    await db.saveMenuItem(item);
    await db.publishMenuChange();
    return item;
  }),
);

staff.put(
  '/menu/:id',
  requireStaff('manager'),
  h(async (req) => {
    const existing = await db.getMenuItem(String(req.params.id));
    if (!existing) throw new HttpError(404, 'Item not found.');
    const item = cleanItem(req.body, existing);
    await db.saveMenuItem(item);
    await db.publishMenuChange();
    return item;
  }),
);

staff.delete(
  '/menu/:id',
  requireStaff('manager'),
  h(async (req) => {
    await db.deleteMenuItem(String(req.params.id));
    await db.publishMenuChange();
    return { ok: true };
  }),
);

staff.get('/vouchers', h(() => db.listVouchers()));
staff.put(
  '/vouchers/:code',
  requireStaff('manager'),
  h(async (req) => {
    const b = req.body as Voucher;
    const code = String(req.params.code).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    const value = Number(b.value);
    if (!code) throw new HttpError(400, 'Enter a code.');
    if (!(value > 0) || (b.kind === 'percent' && value > 100)) throw new HttpError(400, 'Enter a valid discount value.');
    const v: Voucher = {
      code,
      description: String(b.description ?? '').slice(0, 120),
      kind: b.kind === 'fixed' ? 'fixed' : 'percent',
      value,
      minSpend: Math.max(0, Number(b.minSpend) || 0),
      active: b.active !== false,
    };
    await db.saveVoucher(v);
    return v;
  }),
);

staff.get('/inquiries', h(() => db.listInquiries()));
staff.patch(
  '/inquiries/:id',
  h(async (req) => {
    const i = await db.getInquiry(String(req.params.id));
    if (!i) throw new HttpError(404, 'Inquiry not found.');
    if (!['new', 'contacted', 'confirmed', 'declined'].includes(req.body.status)) throw new HttpError(400, 'Bad status.');
    i.status = req.body.status;
    await db.saveInquiry(i);
    return i;
  }),
);

staff.get(
  '/reports',
  requireStaff('manager'),
  h(async (req): Promise<Report> => {
    const date = String(req.query.date ?? businessDate());
    const all = await db.ordersForDate(date);
    const paid = all.filter((o) => o.paymentStatus === 'paid');
    const sum = (xs: Order[], f: (o: Order) => number) => round2(xs.reduce((s, o) => s + f(o), 0));
    const items = new Map<string, { name: string; qty: number; total: number }>();
    for (const o of paid) for (const l of o.lines) {
      const it = items.get(l.name) ?? { name: l.name, qty: 0, total: 0 };
      it.qty += l.qty;
      it.total = round2(it.total + l.lineTotal);
      items.set(l.name, it);
    }
    const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0, count: 0 }));
    for (const o of paid) {
      const slot = byHour[manilaParts(new Date(o.createdAt)).hour];
      slot.total = round2(slot.total + o.total);
      slot.count++;
    }
    const gross = sum(paid, (o) => o.subtotal);
    const net = sum(paid, (o) => o.total);
    return {
      date,
      orderCount: paid.length,
      gross,
      discounts: sum(paid, (o) => o.discountTotal),
      fees: sum(paid, (o) => o.fee),
      net,
      averageTicket: paid.length ? round2(net / paid.length) : 0,
      byPayment: (['cash', 'qr', 'card', 'bank'] as const).map((method) => {
        const xs = paid.filter((o) => o.paymentMethod === method);
        return { method, count: xs.length, total: sum(xs, (o) => o.total) };
      }),
      byType: (['dine-in', 'takeout', 'pickup'] as const).map((type) => ({ type, count: paid.filter((o) => o.type === type).length })),
      byHour: byHour.filter((x) => x.hour >= 9 && x.hour <= 22),
      topItems: [...items.values()].sort((a, b) => b.qty - a.qty).slice(0, 8),
      cancelled: all.filter((o) => o.status === 'cancelled' && o.paymentStatus !== 'refunded').length,
      refunded: all.filter((o) => o.paymentStatus === 'refunded').length,
    };
  }),
);

app.use('/api/staff', staff);
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found.')));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});
