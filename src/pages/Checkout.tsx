import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banknote, CreditCard, Gift, Landmark, QrCode, Tag, X } from 'lucide-react';
import clsx from 'clsx';
import { api, useStoreStatus } from '../lib/api';
import { rememberOrder } from '../lib/recent-orders';
import { cartSubtotal, toInput, useCart } from '../store/cart';
import { describeSelections, peso, PAYMENT_FEES } from '../shared/pricing';
import { storeStatus } from '../shared/store-info';
import type { Order, OrderRequest, OrderType, PaymentMethod, Totals } from '../shared/types';
import { ErrorNote, Segmented, Spinner } from '../components/ui';

const METHODS: { id: PaymentMethod; label: string; note: string; icon: typeof Banknote }[] = [
  { id: 'qr', label: 'QR Ph · GCash · Maya', note: '1% fee · pay now', icon: QrCode },
  { id: 'card', label: 'Credit / Debit card', note: '3% fee · pay now', icon: CreditCard },
  { id: 'bank', label: 'Bank transfer', note: 'No fee · pay now', icon: Landmark },
  { id: 'cash', label: 'Cash at the counter', note: 'No fee · pay when you arrive', icon: Banknote },
];

/** 15-minute pickup slots over the next day and a half, only while the shop is open. */
function pickupSlots(now = new Date()) {
  const start = new Date(now.getTime() + 20 * 60000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const slots: { value: string; label: string }[] = [];
  for (let t = start.getTime(); t < now.getTime() + 36 * 3600000 && slots.length < 48; t += 15 * 60000) {
    const d = new Date(t);
    if (!storeStatus(d).open) continue;
    const day = d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short' });
    const today = now.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short' });
    const time = d.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
    slots.push({ value: d.toISOString(), label: `${day === today ? 'Today' : 'Tomorrow'} · ${time}` });
  }
  return slots;
}

export default function Checkout() {
  const { lines, clear } = useCart();
  const status = useStoreStatus();
  const navigate = useNavigate();
  const open = status?.open ?? true;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<OrderType>('takeout');
  const [table, setTable] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('qr');
  const [voucherInput, setVoucherInput] = useState('');
  const [voucher, setVoucher] = useState('');
  const [points, setPoints] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [quote, setQuote] = useState<Totals | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const slots = useMemo(() => pickupSlots(), []);
  useEffect(() => {
    if (!open) setType('pickup');
  }, [open]);
  useEffect(() => {
    if (type === 'pickup' && !pickupTime && slots[0]) setPickupTime(slots[0].value);
  }, [type, pickupTime, slots]);

  // Look up Lore points once the number looks complete.
  const cleanPhone = phone.replace(/[\s-]/g, '');
  useEffect(() => {
    setPoints(0);
    setUsePoints(false);
    if (!/^(09\d{9}|\+639\d{9})$/.test(cleanPhone)) return;
    api<{ points: number }>(`/loyalty/${encodeURIComponent(cleanPhone)}`).then((r) => setPoints(r.points)).catch(() => {});
  }, [cleanPhone]);

  const request = (): OrderRequest => ({
    customerName: name,
    phone: cleanPhone || undefined,
    type,
    table: type === 'dine-in' ? table : undefined,
    pickupTime: type === 'pickup' ? pickupTime : undefined,
    notes,
    lines: toInput(lines),
    voucherCode: voucher || undefined,
    redeemPoints: usePoints ? Math.min(points, Math.floor(cartSubtotal(lines))) : 0,
    paymentMethod: method,
  });

  // Server-side quote so the total shown is exactly what will be charged.
  useEffect(() => {
    if (!lines.length) return;
    const t = setTimeout(() => {
      api<Totals>('/orders/quote', { body: request() })
        .then((q) => {
          setQuote(q);
          setQuoteError(null);
        })
        .catch((e) => {
          setQuote(null);
          setQuoteError(e.message);
          if (voucher && /promo|code|minimum/i.test(e.message)) setVoucher('');
        });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, voucher, usePoints, method, points, cleanPhone]);

  const place = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPlacing(true);
    try {
      const order = await api<Order>('/orders', { body: request() });
      rememberOrder(order.id);
      clear();
      navigate(`/order/${order.id}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPlacing(false);
    }
  };

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-medium">Your cart is empty</h1>
        <p className="mt-2 text-espresso-600">Pick something from the menu first.</p>
        <Link to="/menu" className="btn-primary mt-6">See the menu</Link>
      </div>
    );
  }

  return (
    <form onSubmit={place} className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        <h1 className="font-display text-5xl font-medium">Checkout</h1>

        <section className="card space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">1 · Your details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Name for the order</label>
              <input id="name" className="input" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Mobile number <span className="font-normal normal-case tracking-normal">(for Lore points)</span></label>
              <input id="phone" className="input" inputMode="tel" placeholder="09XX XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">2 · How are you getting it?</h2>
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: 'dine-in', label: 'Dine in', disabled: !open },
              { value: 'takeout', label: 'Takeout now', disabled: !open },
              { value: 'pickup', label: 'Schedule pickup' },
            ]}
          />
          {!open && <p className="text-sm text-espresso-600">We’re closed right now, so orders are for scheduled pickup.</p>}
          {type === 'dine-in' && (
            <div className="max-w-xs">
              <label className="label" htmlFor="table">Table number (if seated)</label>
              <input id="table" className="input" maxLength={10} value={table} onChange={(e) => setTable(e.target.value)} />
            </div>
          )}
          {type === 'pickup' && (
            <div className="max-w-xs">
              <label className="label" htmlFor="pickup">Pickup time</label>
              <select id="pickup" className="input" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} required>
                {slots.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="notes">Notes for the barista</label>
            <textarea id="notes" className="input min-h-20" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, utensils, anything we should know" />
          </div>
        </section>

        <section className="card space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">3 · Payment</h2>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
            {METHODS.map(({ id, label, note, icon: Icon }) => (
              <button
                type="button"
                key={id}
                role="radio"
                aria-checked={method === id}
                onClick={() => setMethod(id)}
                className={clsx(
                  'flex items-center gap-3 rounded-2xl border p-4 text-left transition',
                  method === id ? 'border-clay-500 bg-clay-500/5 ring-2 ring-clay-500/25' : 'border-cream-300 bg-white hover:border-clay-300',
                )}
              >
                <Icon className={clsx('size-6 shrink-0', method === id ? 'text-clay-600' : 'text-espresso-600')} />
                <span>
                  <span className="block font-semibold">{label}</span>
                  <span className="text-sm text-espresso-600">{note}</span>
                </span>
              </button>
            ))}
          </div>
          {method !== 'cash' && <p className="text-sm text-espresso-600">You’ll pay on the next screen. Your order goes to the barista once payment is confirmed.</p>}
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card overflow-hidden">
          <div className="border-b border-cream-200 p-5">
            <h2 className="font-display text-2xl font-semibold">Order summary</h2>
          </div>
          <ul className="max-h-72 divide-y divide-cream-200 overflow-y-auto px-5">
            {lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {l.qty}× {l.name}
                  </p>
                  {l.selections.length > 0 && <p className="text-xs text-espresso-600">{describeSelections(l.selections)}</p>}
                </div>
                <span className="tabular-nums">{peso(l.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-3 border-t border-cream-200 p-5">
            {voucher ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <span className="flex items-center gap-2"><Tag className="size-4" /> {voucher} applied</span>
                <button type="button" onClick={() => setVoucher('')} aria-label="Remove promo code"><X className="size-4" /></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input className="input py-2" placeholder="Promo code" value={voucherInput} onChange={(e) => setVoucherInput(e.target.value.toUpperCase())} aria-label="Promo code" />
                <button type="button" className="btn-outline shrink-0 py-2" onClick={() => setVoucher(voucherInput.trim())} disabled={!voucherInput.trim()}>
                  Apply
                </button>
              </div>
            )}
            {points > 0 && (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-cream-100 px-3 py-2.5 text-sm">
                <input type="checkbox" className="size-4 accent-clay-500" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} />
                <Gift className="size-4 text-clay-600" />
                Use {points} Lore points ({peso(points)} off)
              </label>
            )}
          </div>

          <dl className="space-y-1.5 border-t border-cream-200 p-5 text-sm">
            <div className="flex justify-between"><dt className="text-espresso-600">Subtotal</dt><dd className="tabular-nums">{peso(quote?.subtotal ?? cartSubtotal(lines))}</dd></div>
            {quote?.discounts.map((d) => (
              <div key={d.label} className="flex justify-between text-emerald-700"><dt>{d.label}</dt><dd className="tabular-nums">−{peso(d.amount)}</dd></div>
            ))}
            {quote && quote.fee > 0 && (
              <div className="flex justify-between"><dt className="text-espresso-600">{quote.feeLabel}</dt><dd className="tabular-nums">{peso(quote.fee)}</dd></div>
            )}
            <div className="flex justify-between pt-2 text-lg font-semibold"><dt>Total</dt><dd className="tabular-nums">{quote ? peso(quote.total) : <Spinner className="size-4" />}</dd></div>
            {quote && quote.pointsEarned > 0 && <p className="text-xs text-clay-700">You’ll earn {quote.pointsEarned} Lore points with this order.</p>}
            {!quote && PAYMENT_FEES[method] > 0 && <p className="text-xs text-espresso-600">A {PAYMENT_FEES[method] * 100}% processing fee applies.</p>}
          </dl>
          <div className="space-y-3 p-5 pt-0">
            <ErrorNote>{error ?? quoteError}</ErrorNote>
            <button className="btn-primary w-full py-3.5 text-base" disabled={placing || !quote}>
              {placing ? <Spinner className="size-4" /> : method === 'cash' ? 'Place order' : 'Continue to payment'}
            </button>
          </div>
        </div>
      </aside>
    </form>
  );
}
