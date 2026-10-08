import { useEffect, useMemo, useState } from 'react';
import { Gift, Minus, Plus, Search, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { api, useMenu } from '../../lib/api';
import { cartSubtotal, makeLine, toInput, usePosCart } from '../../store/cart';
import { describeSelections, peso } from '../../shared/pricing';
import type { DiscountType, MenuItem, Order, OrderRequest, OrderType, PaymentMethod, Totals } from '../../shared/types';
import { ItemDialog } from '../../components/ItemDialog';
import { ReceiptModal } from '../../components/Receipt';
import { ErrorNote, Photo, Segmented, Spinner } from '../../components/ui';
import { CashInput, METHOD_OPTIONS } from './CollectPayment';

export default function POS() {
  const { menu } = useMenu();
  const { lines, add, setQty, remove, clear } = usePosCart();
  const [category, setCategory] = useState('All');
  const [q, setQ] = useState('');
  const [active, setActive] = useState<MenuItem | null>(null);

  const [type, setType] = useState<OrderType>('dine-in');
  const [customerName, setCustomerName] = useState('');
  const [table, setTable] = useState('');
  const [phone, setPhone] = useState('');
  const [points, setPoints] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountIdNo, setDiscountIdNo] = useState('');
  const [voucher, setVoucher] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cash, setCash] = useState('');
  const [reference, setReference] = useState('');
  const [payLater, setPayLater] = useState(false);

  const [quote, setQuote] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

  const categories = useMemo(() => ['All', ...new Set(menu?.map((m) => m.category))], [menu]);
  const items = (menu ?? []).filter(
    (m) => (category === 'All' || m.category === category) && (!q || m.name.toLowerCase().includes(q.toLowerCase())),
  );

  const cleanPhone = phone.replace(/[\s-]/g, '');
  useEffect(() => {
    setPoints(0);
    setUsePoints(false);
    if (!/^09\d{9}$/.test(cleanPhone)) return;
    api<{ points: number; name: string }>(`/staff/customers/${cleanPhone}`).then((c) => {
      setPoints(c.points);
      if (c.name) setCustomerName((n) => n || c.name);
    }).catch(() => {});
  }, [cleanPhone]);

  const request = (): OrderRequest => ({
    customerName,
    phone: cleanPhone || undefined,
    type,
    table: type === 'dine-in' ? table : undefined,
    pickupTime: type === 'pickup' ? new Date().toISOString() : undefined,
    lines: toInput(lines),
    voucherCode: voucher.trim() || undefined,
    redeemPoints: usePoints ? points : 0,
    paymentMethod: method,
    discountType,
    discountIdNo,
    cashTendered: Number(cash),
    paymentRef: reference,
    payLater,
  });

  useEffect(() => {
    if (!lines.length) {
      setQuote(null);
      setError(null);
      return;
    }
    const t = setTimeout(() => {
      api<Totals>('/staff/orders/quote', { body: request() })
        .then((q) => {
          setQuote(q);
          setError(null);
        })
        .catch((e) => {
          setQuote(null);
          setError(e.message);
        });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, discountType, discountIdNo, voucher, usePoints, points, method, cleanPhone]);

  const reset = () => {
    clear();
    setCustomerName('');
    setTable('');
    setPhone('');
    setDiscountType('none');
    setDiscountIdNo('');
    setVoucher('');
    setCash('');
    setReference('');
    setPayLater(false);
    setMethod('cash');
  };

  const charge = async () => {
    setBusy(true);
    setError(null);
    try {
      const order = await api<Order>('/staff/orders', { body: request() });
      setReceipt(order);
      reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const total = quote?.total ?? cartSubtotal(lines);
  const canCharge = lines.length > 0 && quote && (payLater || method !== 'cash' || Number(cash) >= total);

  const quickAdd = (item: MenuItem) => {
    if (!item.available) return;
    if (item.optionGroups.length) setActive(item);
    else add(makeLine(item, {}, 1));
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Menu */}
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-3 border-b border-cream-200 bg-cream-50 p-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-espresso-600" />
            <input className="input rounded-full pl-9" placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items" />
          </label>
          <div className="-mx-4 flex gap-1 overflow-x-auto px-4">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={clsx('shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium', category === c ? 'bg-espresso-900 text-cream-50' : 'bg-white text-espresso-700 hover:bg-cream-200')}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 xl:grid-cols-4">
          {!menu && <Spinner />}
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => quickAdd(item)}
              disabled={!item.available}
              className="card group relative overflow-hidden text-left transition hover:border-clay-400 active:scale-[0.98] disabled:opacity-50"
            >
              <Photo src={item.image} alt="" className="aspect-[4/3] w-full" />
              {!item.available && <span className="absolute left-2 top-2 chip bg-espresso-900 text-white">Sold out</span>}
              <div className="p-3">
                <p className="text-sm font-semibold leading-tight">{item.name}</p>
                <p className="mt-0.5 text-sm text-clay-700">{peso(item.price)}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Ticket */}
      <aside className="flex max-h-[70vh] w-full shrink-0 flex-col border-l border-cream-200 bg-white lg:max-h-none lg:w-[26rem]">
        <div className="space-y-3 border-b border-cream-200 p-4">
          <Segmented value={type} onChange={setType} options={[{ value: 'dine-in', label: 'Dine in' }, { value: 'takeout', label: 'Takeout' }, { value: 'pickup', label: 'Pickup' }]} />
          <div className="grid grid-cols-[1fr_5rem] gap-2">
            <input className="input" placeholder="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} aria-label="Customer name" />
            <input className="input" placeholder="Table" value={table} onChange={(e) => setTable(e.target.value)} disabled={type !== 'dine-in'} aria-label="Table" />
          </div>
          <input className="input" inputMode="tel" placeholder="Mobile no. for Lore points" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Customer mobile number" />
          {points > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-clay-500" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} />
              <Gift className="size-4 text-clay-600" /> Redeem {points} points ({peso(points)})
            </label>
          )}
        </div>

        <ul className="min-h-24 flex-1 divide-y divide-cream-100 overflow-y-auto px-4">
          {lines.length === 0 && <li className="py-10 text-center text-sm text-espresso-600">Tap items to start an order.</li>}
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{l.name}</p>
                {l.selections.length > 0 && <p className="truncate text-xs text-espresso-600">{describeSelections(l.selections)}</p>}
                {l.note && <p className="truncate text-xs italic text-espresso-600">{l.note}</p>}
              </div>
              <div className="flex items-center">
                <button className="grid size-7 place-items-center rounded-full bg-cream-100" onClick={() => setQty(l.key, l.qty - 1)} aria-label="Decrease"><Minus className="size-3" /></button>
                <span className="w-7 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                <button className="grid size-7 place-items-center rounded-full bg-cream-100" onClick={() => setQty(l.key, l.qty + 1)} aria-label="Increase"><Plus className="size-3" /></button>
              </div>
              <span className="w-16 text-right text-sm tabular-nums">{peso(l.lineTotal)}</span>
              <button onClick={() => remove(l.key)} className="p-1 text-espresso-600 hover:text-rose-600" aria-label={`Remove ${l.name}`}><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>

        <div className="space-y-3 border-t border-cream-200 bg-cream-50 p-4">
          <div className="grid grid-cols-2 gap-2">
            <select className="input py-2" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} aria-label="Discount">
              <option value="none">No discount</option>
              <option value="senior">Senior Citizen 20%</option>
              <option value="pwd">PWD 20%</option>
            </select>
            {discountType !== 'none' ? (
              <input className="input py-2" placeholder="SC / PWD ID no." value={discountIdNo} onChange={(e) => setDiscountIdNo(e.target.value)} aria-label="ID number" />
            ) : (
              <input className="input py-2" placeholder="Promo code" value={voucher} onChange={(e) => setVoucher(e.target.value.toUpperCase())} aria-label="Promo code" />
            )}
          </div>

          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-espresso-600">Subtotal</dt><dd className="tabular-nums">{peso(quote?.subtotal ?? cartSubtotal(lines))}</dd></div>
            {quote?.discounts.map((d) => (
              <div key={d.label} className="flex justify-between text-emerald-700"><dt>{d.label}</dt><dd className="tabular-nums">−{peso(d.amount)}</dd></div>
            ))}
            {!!quote?.fee && <div className="flex justify-between"><dt className="text-espresso-600">{quote.feeLabel}</dt><dd className="tabular-nums">{peso(quote.fee)}</dd></div>}
            <div className="flex justify-between text-xl font-bold"><dt>Total</dt><dd className="tabular-nums">{peso(total)}</dd></div>
          </dl>

          <Segmented value={method} onChange={setMethod} options={METHOD_OPTIONS} />
          {!payLater && (method === 'cash' ? (
            <CashInput total={total} value={cash} onChange={setCash} />
          ) : (
            <input className="input font-mono" placeholder={method === 'card' ? 'Terminal approval code (optional)' : 'Reference no. (optional)'} value={reference} onChange={(e) => setReference(e.target.value)} aria-label="Payment reference" />
          ))}
          <label className="flex items-center gap-2 text-sm text-espresso-700">
            <input type="checkbox" className="size-4 accent-clay-500" checked={payLater} onChange={(e) => setPayLater(e.target.checked)} />
            Open tab — collect payment later
          </label>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex gap-2">
            <button className="btn-outline" onClick={reset} disabled={!lines.length}>Clear</button>
            <button className="btn-primary flex-1 py-3 text-base" onClick={charge} disabled={busy || !canCharge}>
              {busy ? <Spinner className="size-4" /> : payLater ? 'Send to kitchen' : `Charge ${peso(total)}`}
            </button>
          </div>
        </div>
      </aside>

      <ItemDialog item={active} onClose={() => setActive(null)} onAdd={add} compact />
      <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
