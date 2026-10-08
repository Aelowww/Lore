import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Banknote, Check, CheckCircle2, Clock, Coffee, CreditCard, Landmark, Lock, PartyPopper, QrCode, ShoppingBag, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { socket, useChannel } from '../lib/socket';
import { describeSelections, peso, PAYMENT_FEES, PAYMENT_LABELS, round2 } from '../shared/pricing';
import { PAYMENT_ACCOUNTS } from '../shared/store-info';
import type { Order, PaymentMethod } from '../shared/types';
import { ErrorNote, PayPill, Segmented, Spinner, fmtTime, orderNo } from '../components/ui';

const STEPS = [
  { status: 'pending', label: 'Received', icon: ShoppingBag },
  { status: 'preparing', label: 'Preparing', icon: Coffee },
  { status: 'ready', label: 'Ready', icon: PartyPopper },
  { status: 'completed', label: 'Enjoy!', icon: CheckCircle2 },
] as const;

function Tracker({ order }: { order: Order }) {
  if (order.status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-5 text-rose-800 ring-1 ring-rose-200">
        <XCircle className="size-6" />
        <div>
          <p className="font-semibold">This order was cancelled{order.paymentStatus === 'refunded' ? ' and refunded' : ''}.</p>
          <p className="text-sm">Questions? Message us on Facebook or Instagram.</p>
        </div>
      </div>
    );
  }
  const idx = STEPS.findIndex((s) => s.status === order.status);
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < idx || order.status === 'completed';
        const current = i === idx && order.status !== 'completed';
        return (
          <li key={s.status} className="flex flex-col items-center gap-2 text-center">
            <span
              className={clsx(
                'grid size-12 place-items-center rounded-full transition',
                done && 'bg-clay-500 text-white',
                current && 'animate-pulse-ring bg-espresso-900 text-cream-50',
                !done && !current && 'bg-cream-200 text-espresso-600',
              )}
            >
              {done ? <Check className="size-5" /> : <Icon className="size-5" />}
            </span>
            <span className={clsx('text-xs font-semibold sm:text-sm', current ? 'text-espresso-900' : 'text-espresso-600')}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function QrPanel({ order, amount }: { order: Order; amount: number }) {
  const [src, setSrc] = useState<string | null>(PAYMENT_ACCOUNTS.qrImage);
  useEffect(() => {
    if (PAYMENT_ACCOUNTS.qrImage) return;
    QRCode.toDataURL(`LORE COFFEE STATION|ORDER ${orderNo(order.number)}|PHP ${amount.toFixed(2)}|DEMO`, {
      margin: 1,
      width: 480,
      color: { dark: '#22120c', light: '#ffffff' },
    }).then(setSrc);
  }, [order.number, amount]);
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {src ? <img src={src} alt="Payment QR code" className="size-56 rounded-2xl border border-cream-200 bg-white p-2" /> : <div className="size-56 animate-pulse rounded-2xl bg-cream-100" />}
      <p className="text-sm text-espresso-600">
        Scan with GCash, Maya or any bank app that supports QR Ph, pay <strong>{peso(amount)}</strong>, then enter the reference number below.
      </p>
      {!PAYMENT_ACCOUNTS.qrImage && <p className="chip bg-amber-50 text-amber-800 ring-1 ring-amber-200">Demo QR — the shop’s QR Ph code goes here</p>}
    </div>
  );
}

function BankPanel({ amount }: { amount: number }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-espresso-600">
        Transfer exactly <strong>{peso(amount)}</strong> to one of these accounts, then enter the reference number.
      </p>
      {PAYMENT_ACCOUNTS.bank.map((b) => (
        <div key={b.bank} className="rounded-xl bg-cream-100 px-4 py-3 text-sm">
          <p className="font-semibold">{b.bank}</p>
          <p>{b.accountName}</p>
          <p className="font-mono tabular-nums">{b.accountNumber}</p>
        </div>
      ))}
    </div>
  );
}

function CardForm({ onPay, busy }: { onPay: (card: { number: string; expiry: string; cvc: string; name: string }) => void; busy: boolean }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const set = (k: keyof typeof card) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    if (k === 'number') v = v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
    if (k === 'expiry') v = v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
    if (k === 'cvc') v = v.replace(/\D/g, '').slice(0, 4);
    setCard((c) => ({ ...c, [k]: v }));
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onPay(card);
      }}
    >
      <div>
        <label className="label" htmlFor="cc-name">Name on card</label>
        <input id="cc-name" className="input" autoComplete="cc-name" value={card.name} onChange={set('name')} required />
      </div>
      <div>
        <label className="label" htmlFor="cc-number">Card number</label>
        <input id="cc-number" className="input font-mono" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" value={card.number} onChange={set('number')} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="cc-exp">Expiry</label>
          <input id="cc-exp" className="input font-mono" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={card.expiry} onChange={set('expiry')} required />
        </div>
        <div>
          <label className="label" htmlFor="cc-cvc">CVC</label>
          <input id="cc-cvc" className="input font-mono" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={card.cvc} onChange={set('cvc')} required />
        </div>
      </div>
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
        Demo card gateway — no real charge is made. Test with 4242 4242 4242 4242 (approved) or 4000 0000 0000 0002 (declined), any future expiry and CVC.
      </p>
      <button className="btn-primary w-full py-3" disabled={busy}>
        {busy ? <Spinner className="size-4" /> : <><Lock className="size-4" /> Pay now</>}
      </button>
    </form>
  );
}

function PaymentBox({ order, onUpdate }: { order: Order; onUpdate: (o: Order) => void }) {
  const [method, setMethod] = useState<PaymentMethod>(order.paymentMethod);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Preview of the total for the selected method (the server recalculates on payment).
  const base = round2(order.subtotal - order.discountTotal);
  const amount = round2(base + round2(base * PAYMENT_FEES[method]));

  const pay = async (body: object) => {
    setBusy(true);
    setError(null);
    try {
      onUpdate(await api<Order>(`/orders/${order.id}/pay`, { body: { method, ...body } }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Changing method changes the fee, so re-quote by telling the server (cash = pay at counter).
  const switchTo = async (m: PaymentMethod) => {
    setMethod(m);
    setError(null);
    if (m === 'cash') await pay({ method: 'cash' });
  };

  if (order.paymentStatus === 'paid') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-5 text-emerald-800 ring-1 ring-emerald-200">
        <CheckCircle2 className="size-6 shrink-0" />
        <div>
          <p className="font-semibold">Paid · {peso(order.total)}</p>
          <p className="text-sm">
            {PAYMENT_LABELS[order.paymentMethod]}
            {order.cardLast4 && ` ending ${order.cardLast4}`}
            {order.paymentRef && ` · Ref ${order.paymentRef}`}
          </p>
        </div>
      </div>
    );
  }
  if (order.paymentStatus === 'refunded' || order.status === 'cancelled') return null;
  if (order.paymentStatus === 'pending_verification') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-5 text-amber-900 ring-1 ring-amber-200">
        <Clock className="size-6 shrink-0" />
        <div>
          <p className="font-semibold">Checking your payment…</p>
          <p className="text-sm">Our cashier is confirming reference {order.paymentRef}. This page updates on its own.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="card space-y-5 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Pay for your order</h2>
        <span className="text-xl font-semibold tabular-nums">{peso(amount)}</span>
      </div>
      <Segmented
        value={method}
        onChange={switchTo}
        options={[
          { value: 'qr', label: <span className="flex items-center justify-center gap-1.5"><QrCode className="size-4" /> QR</span> },
          { value: 'card', label: <span className="flex items-center justify-center gap-1.5"><CreditCard className="size-4" /> Card</span> },
          { value: 'bank', label: <span className="flex items-center justify-center gap-1.5"><Landmark className="size-4" /> Bank</span> },
          { value: 'cash', label: <span className="flex items-center justify-center gap-1.5"><Banknote className="size-4" /> Cash</span> },
        ]}
      />
      {PAYMENT_FEES[method] > 0 && <p className="text-xs text-espresso-600">Includes a {PAYMENT_FEES[method] * 100}% processing fee.</p>}
      {method === 'cash' && order.paymentMethod === 'cash' && (
        <p className="rounded-xl bg-cream-100 px-4 py-3 text-sm">
          Pay <strong>{peso(order.total)}</strong> at the counter — just tell us order <strong>{orderNo(order.number)}</strong>.
        </p>
      )}
      {(method === 'qr' || method === 'bank') && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            pay({ reference });
          }}
        >
          {method === 'qr' ? <QrPanel order={order} amount={amount} /> : <BankPanel amount={amount} />}
          <div>
            <label className="label" htmlFor="ref">Reference number</label>
            <input id="ref" className="input font-mono" value={reference} onChange={(e) => setReference(e.target.value.replace(/\s/g, ''))} placeholder="e.g. 1029384756" required minLength={6} />
          </div>
          <button className="btn-primary w-full py-3" disabled={busy}>{busy ? <Spinner className="size-4" /> : 'I’ve paid — submit reference'}</button>
        </form>
      )}
      {method === 'card' && <CardForm busy={busy} onPay={(card) => pay({ card })} />}
      <ErrorNote>{error}</ErrorNote>
    </section>
  );
}

export default function OrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useChannel(id ? `order:${id}` : null);
  useEffect(() => {
    if (!id) return;
    api<Order>(`/orders/${id}`).then(setOrder).catch((e) => setError(e.message));
    const onOrder = (o: Order) => o.id === id && setOrder(o);
    socket.on('order', onOrder);
    return () => {
      socket.off('order', onOrder);
    };
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-4xl">Order not found</h1>
        <p className="mt-2 text-espresso-600">{error}</p>
        <Link to="/track" className="btn-primary mt-6">Find my orders</Link>
      </div>
    );
  }
  if (!order) return <div className="grid min-h-[50vh] place-items-center"><Spinner /></div>;

  const headline =
    order.status === 'ready'
      ? order.type === 'dine-in' ? 'Your order is ready — we’ll bring it over!' : 'Your order is ready for pickup!'
      : order.status === 'completed'
        ? 'Thank you! Enjoy.'
        : order.status === 'preparing'
          ? 'We’re making your order'
          : 'Order received';

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="text-center">
        <p className="eyebrow">Order {orderNo(order.number)}</p>
        <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">{headline}</h1>
        <p className="mt-2 text-sm text-espresso-600">
          {order.customerName} · {order.type === 'dine-in' ? `Dine in${order.table ? ` · Table ${order.table}` : ''}` : order.type === 'pickup' ? `Pickup ${order.pickupTime ? fmtTime(order.pickupTime) : ''}` : 'Takeout'} · placed {fmtTime(order.createdAt)}
        </p>
      </div>

      <div className="card p-6">
        <Tracker order={order} />
      </div>

      <PaymentBox order={order} onUpdate={setOrder} />

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
          <h2 className="font-semibold">Receipt</h2>
          <PayPill status={order.paymentStatus} />
        </div>
        <ul className="divide-y divide-cream-200 px-5">
          {order.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium">{l.qty}× {l.name}</p>
                {l.selections.length > 0 && <p className="text-xs text-espresso-600">{describeSelections(l.selections)}</p>}
                {l.note && <p className="text-xs italic text-espresso-600">“{l.note}”</p>}
              </div>
              <span className="tabular-nums">{peso(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-cream-200 px-5 py-4 text-sm">
          <div className="flex justify-between"><dt className="text-espresso-600">Subtotal</dt><dd className="tabular-nums">{peso(order.subtotal)}</dd></div>
          {order.discounts.map((d) => (
            <div key={d.label} className="flex justify-between text-emerald-700"><dt>{d.label}</dt><dd className="tabular-nums">−{peso(d.amount)}</dd></div>
          ))}
          {order.fee > 0 && <div className="flex justify-between"><dt className="text-espresso-600">{order.feeLabel}</dt><dd className="tabular-nums">{peso(order.fee)}</dd></div>}
          <div className="flex justify-between pt-1 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{peso(order.total)}</dd></div>
          {order.pointsEarned > 0 && <p className="pt-1 text-xs text-clay-700">+{order.pointsEarned} Lore points once your order is completed.</p>}
        </dl>
      </section>
      <p className="text-center text-sm text-espresso-600">
        Bookmark this page — it updates live. <Link to="/menu" className="font-semibold text-clay-600 underline-offset-2 hover:underline">Order something else</Link>
      </p>
    </div>
  );
}
