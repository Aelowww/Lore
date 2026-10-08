import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { recentOrderIds } from '../lib/recent-orders';
import { peso } from '../shared/pricing';
import type { Order } from '../shared/types';
import { PayPill, Spinner, StatusPill, fmtTime, orderNo } from '../components/ui';

export default function Track() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => {
    // Follow every listed order so statuses update without a refresh.
    const ids = recentOrderIds();
    const join = () => ids.forEach((id) => socket.emit('subscribe', { channel: `order:${id}` }));
    const onOrder = (o: Order) => setOrders((xs) => xs?.map((x) => (x.id === o.id ? o : x)) ?? xs);
    join();
    socket.on('connect', join);
    socket.on('order', onOrder);
    return () => {
      socket.off('connect', join);
      socket.off('order', onOrder);
    };
  }, []);

  useEffect(() => {
    Promise.all(recentOrderIds().map((id) => api<Order>(`/orders/${id}`).catch(() => null))).then((xs) =>
      setOrders(xs.filter((x): x is Order => Boolean(x))),
    );
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-5xl font-medium">Your orders</h1>
      <p className="mt-2 text-espresso-600">Orders placed from this device. Each one updates live.</p>
      <div className="mt-8 space-y-3">
        {!orders && <Spinner />}
        {orders?.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-espresso-600">No orders yet on this device.</p>
            <Link to="/menu" className="btn-primary mt-4">Start an order</Link>
          </div>
        )}
        {orders?.map((o) => (
          <Link key={o.id} to={`/order/${o.id}`} className="card flex items-center gap-4 p-4 transition hover:border-clay-300">
            <span className="font-display text-3xl font-semibold text-clay-600">{orderNo(o.number)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={o.status} />
                <PayPill status={o.paymentStatus} />
              </div>
              <p className="mt-1 truncate text-sm text-espresso-600">
                {new Date(o.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} · {fmtTime(o.createdAt)} · {o.lines.map((l) => l.name).join(', ')}
              </p>
            </div>
            <span className="font-semibold tabular-nums">{peso(o.total)}</span>
            <ChevronRight className="size-4 text-espresso-600" />
          </Link>
        ))}
      </div>
    </div>
  );
}
