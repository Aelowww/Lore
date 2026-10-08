import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { describeSelections } from '../../shared/pricing';
import type { Order, OrderStatus } from '../../shared/types';
import { ErrorNote, PayPill, orderNo, timeAgo } from '../../components/ui';
import { useStaffContext } from './StaffLayout';
import { useOrderAction } from './Orders';

const COLUMNS: { status: OrderStatus; title: string; next: OrderStatus; action: string; tone: string }[] = [
  { status: 'pending', title: 'New', next: 'preparing', action: 'Start', tone: 'bg-amber-400' },
  { status: 'preparing', title: 'Preparing', next: 'ready', action: 'Ready', tone: 'bg-sky-400' },
  { status: 'ready', title: 'Ready', next: 'completed', action: 'Handed over', tone: 'bg-emerald-400' },
];

/** Kitchen / bar display: big tickets, one tap to move each order along. */
export default function Kitchen() {
  const { orders } = useStaffContext();
  const actions = useOrderAction();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const minutes = (o: Order) => (Date.now() - new Date(o.createdAt).getTime()) / 60000;

  return (
    <div className="flex h-full flex-col p-4">
      <ErrorNote>{actions.error}</ErrorNote>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="flex min-h-0 flex-col rounded-2xl bg-cream-200/60">
              <h2 className="flex items-center gap-2 px-4 py-3 font-semibold">
                <span className={clsx('size-2.5 rounded-full', col.tone)} />
                {col.title}
                <span className="ml-auto rounded-full bg-white px-2 text-sm tabular-nums">{list.length}</span>
              </h2>
              <div className="flex-1 space-y-3 overflow-y-auto px-3 pb-3">
                {list.map((o) => {
                  const late = col.status !== 'ready' && minutes(o) > 15;
                  const blocked = col.next === 'completed' && o.paymentStatus !== 'paid';
                  return (
                    <article key={o.id} className={clsx('rounded-xl bg-white p-4 shadow-sm', late && 'ring-2 ring-rose-400')}>
                      <header className="flex items-baseline justify-between">
                        <span className="font-display text-3xl font-bold">{orderNo(o.number)}</span>
                        <span className={clsx('text-xs font-semibold', late ? 'text-rose-600' : 'text-espresso-600')}>{timeAgo(o.createdAt)}</span>
                      </header>
                      <p className="text-sm text-espresso-600">
                        {o.customerName} · {o.type}
                        {o.table && ` · T${o.table}`}
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {o.lines.map((l, i) => (
                          <li key={i} className="text-base">
                            <span className="font-bold">{l.qty}×</span> {l.name}
                            {l.selections.length > 0 && <span className="block pl-6 text-sm text-espresso-600">{describeSelections(l.selections)}</span>}
                            {l.note && <span className="block pl-6 text-sm font-semibold text-clay-700">⚑ {l.note}</span>}
                          </li>
                        ))}
                      </ul>
                      {o.notes && <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-sm text-amber-900">{o.notes}</p>}
                      <div className="mt-3 flex items-center gap-2">
                        <PayPill status={o.paymentStatus} />
                        <button
                          className="btn-dark ml-auto py-2"
                          disabled={actions.busyId === o.id || blocked}
                          title={blocked ? 'Collect payment first (Orders tab)' : undefined}
                          onClick={() => actions.setStatus(o, col.next)}
                        >
                          {blocked ? 'Awaiting payment' : col.action}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
