import { useEffect, useState } from 'react';
import { BadgeCheck, Ban, Bike, Globe, Printer, RotateCcw, Store, Utensils, X } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../../lib/api';
import { describeSelections, peso, PAYMENT_LABELS } from '../../shared/pricing';
import { businessDate } from '../../shared/store-info';
import type { Order, OrderStatus } from '../../shared/types';
import { ReceiptModal } from '../../components/Receipt';
import { ErrorNote, PayPill, Segmented, StatusPill, fmtTime, orderNo, timeAgo } from '../../components/ui';
import { CollectPaymentModal } from './CollectPayment';
import { useStaffContext } from './StaffLayout';

/** Runs a staff order action and pushes the updated order into the live list. */
export function useOrderAction() {
  const { upsert } = useStaffContext();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const run = async (order: Order, path: string, body: object = {}, method = 'POST') => {
    setBusyId(order.id);
    setError(null);
    try {
      const o = await api<Order>(`/staff/orders/${order.id}/${path}`, { body, method });
      upsert(o);
      return o;
    } catch (e) {
      setError(`${orderNo(order.number)}: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };
  const setStatus = (order: Order, status: OrderStatus) => run(order, 'status', { status }, 'PATCH');
  return { run, setStatus, error, setError, busyId };
}

const TYPE_ICON = { 'dine-in': Utensils, takeout: Store, pickup: Bike };

export function OrderCard({
  order,
  onCollect,
  onReceipt,
  actions,
  busy,
}: {
  order: Order;
  onCollect: () => void;
  onReceipt: () => void;
  actions: ReturnType<typeof useOrderAction>;
  busy: boolean;
}) {
  const TypeIcon = TYPE_ICON[order.type];
  const next: Partial<Record<OrderStatus, [OrderStatus, string]>> = {
    pending: ['preparing', 'Accept & start'],
    preparing: ['ready', 'Mark ready'],
    ready: ['completed', 'Complete'],
  };
  const step = next[order.status];
  return (
    <article className={clsx('card flex flex-col p-4', order.status === 'pending' && 'ring-2 ring-amber-300', busy && 'opacity-60')}>
      <header className="flex items-start gap-3">
        <span className="font-display text-3xl font-semibold leading-none text-clay-600">{orderNo(order.number)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{order.customerName}</p>
          <p className="flex items-center gap-1.5 text-xs text-espresso-600">
            <TypeIcon className="size-3.5" />
            {order.type}
            {order.table && ` · Table ${order.table}`}
            {order.pickupTime && order.type === 'pickup' && ` · ${fmtTime(order.pickupTime)}`}
            {' · '}
            {order.source === 'online' ? <Globe className="size-3.5" aria-label="Online order" /> : 'POS'}
            {' · '}
            {timeAgo(order.createdAt)}
          </p>
        </div>
        <StatusPill status={order.status} />
      </header>
      <ul className="mt-3 space-y-1 border-t border-cream-100 pt-3 text-sm">
        {order.lines.map((l, i) => (
          <li key={i}>
            <span className="font-semibold">{l.qty}×</span> {l.name}
            {l.selections.length > 0 && <span className="block pl-5 text-xs text-espresso-600">{describeSelections(l.selections)}</span>}
            {l.note && <span className="block pl-5 text-xs italic text-clay-700">“{l.note}”</span>}
          </li>
        ))}
      </ul>
      {order.notes && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">Note: {order.notes}</p>}
      <div className="mt-3 flex items-center justify-between border-t border-cream-100 pt-3">
        <div className="flex items-center gap-2">
          <PayPill status={order.paymentStatus} />
          <span className="text-xs text-espresso-600">{PAYMENT_LABELS[order.paymentMethod].split(' (')[0]}</span>
        </div>
        <span className="font-semibold tabular-nums">{peso(order.total)}</span>
      </div>

      {order.paymentStatus === 'pending_verification' && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
          <p>
            Customer sent ref <span className="font-mono font-semibold">{order.paymentRef}</span>. Check your {order.paymentMethod === 'qr' ? 'e-wallet / QR' : 'bank'} app for{' '}
            <strong>{peso(order.total)}</strong>.
          </p>
          <div className="mt-2 flex gap-2">
            <button className="btn-primary flex-1 py-2" onClick={() => actions.run(order, 'mark-paid', { reference: order.paymentRef })}>
              <BadgeCheck className="size-4" /> Confirm received
            </button>
            <button className="btn-outline py-2" onClick={() => actions.run(order, 'reject-payment')}>
              <X className="size-4" /> Not found
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {step && (
          <button className="btn-dark flex-1 py-2" onClick={() => actions.setStatus(order, step[0])} disabled={busy}>
            {step[1]}
          </button>
        )}
        {order.paymentStatus === 'unpaid' && order.status !== 'cancelled' && (
          <button className="btn-primary py-2" onClick={onCollect}>Collect</button>
        )}
        <button className="btn-outline px-3 py-2" onClick={onReceipt} aria-label="Receipt"><Printer className="size-4" /></button>
        {order.paymentStatus === 'paid' && (
          <button className="btn-outline px-3 py-2" onClick={() => confirm(`Refund ${orderNo(order.number)} (${peso(order.total)})?`) && actions.run(order, 'refund')} aria-label="Refund">
            <RotateCcw className="size-4" />
          </button>
        )}
        {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && order.status !== 'completed' && (
          <button className="btn-outline px-3 py-2 hover:text-rose-600" onClick={() => confirm(`Cancel ${orderNo(order.number)}?`) && actions.setStatus(order, 'cancelled')} aria-label="Cancel order">
            <Ban className="size-4" />
          </button>
        )}
      </div>
    </article>
  );
}

export default function Orders() {
  const { orders, upsert } = useStaffContext();
  const actions = useOrderAction();
  const [scope, setScope] = useState<'active' | 'today'>('active');
  const [today, setToday] = useState<Order[]>([]);
  const [collect, setCollect] = useState<Order | null>(null);
  const [receipt, setReceipt] = useState<Order | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (scope === 'today') api<Order[]>(`/staff/orders?scope=today&date=${businessDate()}`).then(setToday).catch(() => {});
  }, [scope, orders]);

  const list = scope === 'active' ? orders : [...today].reverse();

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold">Orders</h1>
        <Segmented
          className="w-full max-w-xs"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'active', label: `Active (${orders.length})` },
            { value: 'today', label: 'All today' },
          ]}
        />
      </div>
      <div className="mt-4"><ErrorNote>{actions.error}</ErrorNote></div>
      {list.length === 0 && <p className="py-20 text-center text-espresso-600">No orders {scope === 'active' ? 'in the queue' : 'yet today'}.</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {list.map((o) => (
          <OrderCard key={o.id} order={o} actions={actions} busy={actions.busyId === o.id} onCollect={() => setCollect(o)} onReceipt={() => setReceipt(o)} />
        ))}
      </div>
      <CollectPaymentModal
        order={collect}
        onClose={() => setCollect(null)}
        onDone={(o) => {
          upsert(o);
          setReceipt(o);
        }}
      />
      <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
