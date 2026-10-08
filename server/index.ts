import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Server } from 'socket.io';
import type { BoardData, Inquiry, MenuItem, Order, OrderRequest, Report, StaffRole, Voucher } from '../src/shared/types';
import { businessDate, manilaParts, storeStatus } from '../src/shared/store-info';
import { round2 } from '../src/shared/pricing';
import * as db from './db';
import { HttpError, applyCounterPayment, createOrder, normalizePhone, payOnline, publicOrder, quote, refund, setStatus } from './orders';
import { CATEGORIES } from './seed';

const app = express();
const http = createServer(app);
const io = new Server(http);
app.use(express.json({ limit: '100kb' }));

// ── Staff sessions (in memory; staff log in again after a server restart) ──
const sessions = new Map<string, { name: string; role: StaffRole; expires: number }>();
const SESSION_MS = 14 * 60 * 60 * 1000;

function staffFromToken(token?: string) {
  const s = token ? sessions.get(token) : undefined;
  if (!s || s.expires < Date.now()) return null;
  return s;
}

type StaffReq = Request & { staff: { name: string; role: StaffRole } };
const requireStaff = (role?: StaffRole) => (req: Request, _res: Response, next: NextFunction) => {
  const s = staffFromToken(req.headers.authorization?.replace(/^Bearer /, ''));
  if (!s) return next(new HttpError(401, 'Please log in again.'));
  if (role === 'manager' && s.role !== 'manager') return next(new HttpError(403, 'Manager access only.'));
  (req as StaffReq).staff = s;
  next();
};

// Wraps sync route handlers so thrown HttpErrors become JSON responses.
const h = (fn: (req: Request, res: Response) => unknown) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const out = fn(req, res);
    if (out !== undefined) res.json(out);
  } catch (e) {
    next(e);
  }
};

// ── Realtime ────────────────────────────────────────
function boardData(): BoardData {
  const today = db.ordersForDate(businessDate());
  return {
    preparing: today.filter((o) => o.status === 'preparing' || o.status === 'pending').map((o) => o.number),
    ready: today.filter((o) => o.status === 'ready').map((o) => o.number),
  };
}

function broadcast(order: Order) {
  io.to('staff').emit('order', order);
  io.to(`order:${order.id}`).emit('order', publicOrder(order));
  io.to('board').emit('board', boardData());
}

io.on('connection', (socket) => {
  socket.on('subscribe', (msg: { channel: string; token?: string }) => {
    if (msg?.channel === 'staff') {
      if (staffFromToken(msg.token)) socket.join('staff');
    } else if (msg?.channel === 'board') {
      socket.join('board');
      socket.emit('board', boardData());
    } else if (typeof msg?.channel === 'string' && /^order:[a-f0-9]{16}$/.test(msg.channel)) {
      socket.join(msg.channel);
    }
  });
});

// ── Public API ──────────────────────────────────────
app.get('/api/store', h(() => ({ ...storeStatus(), categories: CATEGORIES })));
app.get('/api/menu', h(() => db.listMenu()));

app.post('/api/orders/quote', h((req) => quote(req.body as OrderRequest, false).totals));

app.post(
  '/api/orders',
  h((req) => {
    const order = createOrder(req.body as OrderRequest, 'online');
    broadcast(order);
    return publicOrder(order);
  }),
);

app.get(
  '/api/orders/:id',
  h((req) => {
    const order = db.getOrder(String(req.params.id));
    if (!order) throw new HttpError(404, 'Order not found.');
    return publicOrder(order);
  }),
);

app.post(
  '/api/orders/:id/pay',
  h((req) => {
    const order = db.getOrder(String(req.params.id));
    if (!order) throw new HttpError(404, 'Order not found.');
    payOnline(order, req.body);
    db.saveOrder(order);
    broadcast(order);
    return publicOrder(order);
  }),
);

app.get(
  '/api/loyalty/:phone',
  h((req) => {
    const phone = normalizePhone(String(req.params.phone));
    const c = phone ? db.getCustomer(phone) : null;
    return { points: c?.points ?? 0, visits: c?.visits ?? 0 };
  }),
);

app.get('/api/board', h(() => boardData()));

app.post(
  '/api/inquiries',
  h((req) => {
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
    db.saveInquiry(inquiry);
    io.to('staff').emit('inquiry', inquiry);
    return { ok: true };
  }),
);

// ── Staff API ───────────────────────────────────────
app.post(
  '/api/staff/login',
  h((req) => {
    const s = db.findStaffByPin(String(req.body?.pin ?? ''));
    if (!s) throw new HttpError(401, 'Wrong PIN.');
    const token = randomBytes(24).toString('hex');
    sessions.set(token, { name: s.name, role: s.role, expires: Date.now() + SESSION_MS });
    return { token, name: s.name, role: s.role };
  }),
);

const staff = express.Router();
staff.use(requireStaff());
const who = (req: Request) => (req as StaffReq).staff.name;

staff.get(
  '/orders',
  h((req) => (req.query.scope === 'today' ? db.ordersForDate(String(req.query.date ?? businessDate())) : db.activeOrders())),
);

staff.post('/orders/quote', h((req) => quote(req.body as OrderRequest, true).totals));

staff.post(
  '/orders',
  h((req) => {
    const order = createOrder(req.body as OrderRequest, 'pos', who(req));
    broadcast(order);
    return order;
  }),
);

const loadOrder = (id: unknown) => {
  const o = db.getOrder(String(id));
  if (!o) throw new HttpError(404, 'Order not found.');
  return o;
};

staff.patch(
  '/orders/:id/status',
  h((req) => {
    const order = loadOrder(req.params.id);
    setStatus(order, req.body.status, who(req));
    order.handledBy ??= who(req);
    db.saveOrder(order);
    broadcast(order);
    return order;
  }),
);

staff.post(
  '/orders/:id/mark-paid',
  h((req) => {
    const order = loadOrder(req.params.id);
    applyCounterPayment(order, req.body ?? {});
    db.saveOrder(order);
    broadcast(order);
    return order;
  }),
);

staff.post(
  '/orders/:id/reject-payment',
  h((req) => {
    const order = loadOrder(req.params.id);
    if (order.paymentStatus !== 'pending_verification') throw new HttpError(409, 'Nothing to reject.');
    order.paymentStatus = 'unpaid';
    order.paymentRef = null;
    order.updatedAt = new Date().toISOString();
    db.saveOrder(order);
    broadcast(order);
    return order;
  }),
);

staff.post(
  '/orders/:id/refund',
  h((req) => {
    const order = loadOrder(req.params.id);
    refund(order, who(req));
    db.saveOrder(order);
    broadcast(order);
    return order;
  }),
);

staff.get(
  '/customers/:phone',
  h((req) => {
    const phone = normalizePhone(String(req.params.phone));
    return (phone && db.getCustomer(phone)) || { phone, name: '', points: 0, visits: 0 };
  }),
);

// Menu: any staff can mark items sold out; managers edit everything else.
staff.patch(
  '/menu/:id/availability',
  h((req) => {
    const item = db.getMenuItem(String(req.params.id));
    if (!item) throw new HttpError(404, 'Item not found.');
    item.available = Boolean(req.body.available);
    db.saveMenuItem(item);
    io.emit('menu');
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
  h((req) => {
    const item = cleanItem(req.body);
    db.saveMenuItem(item);
    io.emit('menu');
    return item;
  }),
);

staff.put(
  '/menu/:id',
  requireStaff('manager'),
  h((req) => {
    const existing = db.getMenuItem(String(req.params.id));
    if (!existing) throw new HttpError(404, 'Item not found.');
    const item = cleanItem(req.body, existing);
    db.saveMenuItem(item);
    io.emit('menu');
    return item;
  }),
);

staff.delete(
  '/menu/:id',
  requireStaff('manager'),
  h((req) => {
    db.deleteMenuItem(String(req.params.id));
    io.emit('menu');
    return { ok: true };
  }),
);

staff.get('/vouchers', h(() => db.listVouchers()));
staff.put(
  '/vouchers/:code',
  requireStaff('manager'),
  h((req) => {
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
    db.saveVoucher(v);
    return v;
  }),
);

staff.get('/inquiries', h(() => db.listInquiries()));
staff.patch(
  '/inquiries/:id',
  h((req) => {
    const i = db.getInquiry(String(req.params.id));
    if (!i) throw new HttpError(404, 'Inquiry not found.');
    if (!['new', 'contacted', 'confirmed', 'declined'].includes(req.body.status)) throw new HttpError(400, 'Bad status.');
    i.status = req.body.status;
    db.saveInquiry(i);
    return i;
  }),
);

staff.get(
  '/reports',
  requireStaff('manager'),
  h((req): Report => {
    const date = String(req.query.date ?? businessDate());
    const all = db.ordersForDate(date);
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

// ── Production: serve the built client ──────────────
const dist = path.resolve('dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

const port = Number(process.env.PORT ?? 3001);
http.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use — is Lore already running in another terminal? Close it and try again.`);
    process.exit(1);
  }
  throw err;
});
http.listen(port, () => console.log(`☕ Lore API listening on http://localhost:${port}`));
