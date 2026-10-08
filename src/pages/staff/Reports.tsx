import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { peso, PAYMENT_LABELS } from '../../shared/pricing';
import { businessDate, fmtHour } from '../../shared/store-info';
import type { Report } from '../../shared/types';
import { ErrorNote, Spinner } from '../../components/ui';

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-espresso-600">{label}</p>
      <p className="mt-2 font-display text-4xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-espresso-600">{sub}</p>}
    </div>
  );
}

/** Sales by hour: single series, one hue, hover tooltip on each bar. */
function HourlyChart({ data }: { data: Report['byHour'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="card p-5">
      <h2 className="font-semibold">Sales by hour</h2>
      <div className="relative mt-6 flex h-48 items-end gap-[2px] border-b border-cream-300" role="img" aria-label="Bar chart of paid sales per hour">
        {data.map((d) => (
          <div
            key={d.hour}
            className="group relative flex h-full flex-1 items-end"
            onMouseEnter={() => setHover(d.hour)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              className={`w-full rounded-t-[4px] transition-colors ${hover === d.hour ? 'bg-clay-600' : 'bg-clay-400'}`}
              style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total ? 2 : 0 }}
            />
            {hover === d.hour && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-espresso-900 px-2.5 py-1.5 text-xs text-cream-50 shadow-lg">
                <p className="font-semibold">{fmtHour(d.hour)}</p>
                <p>{peso(d.total)} · {d.count} order{d.count === 1 ? '' : 's'}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px] text-[10px] text-espresso-600">
        {data.map((d) => (
          <span key={d.hour} className="flex-1 text-center">{d.hour % 2 === 0 ? fmtHour(d.hour).replace(' ', '') : ''}</span>
        ))}
      </div>
    </div>
  );
}

function TopItems({ items }: { items: Report['topItems'] }) {
  const max = Math.max(1, ...items.map((i) => i.qty));
  return (
    <div className="card p-5">
      <h2 className="font-semibold">Top items</h2>
      {items.length === 0 && <p className="mt-4 text-sm text-espresso-600">No sales yet.</p>}
      <ul className="mt-4 space-y-3">
        {items.map((i) => (
          <li key={i.name} title={`${i.name}: ${i.qty} sold, ${peso(i.total)}`}>
            <div className="flex justify-between text-sm">
              <span>{i.name}</span>
              <span className="tabular-nums text-espresso-600">{i.qty} · {peso(i.total)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-cream-100">
              <div className="h-2 rounded-full bg-clay-400" style={{ width: `${(i.qty / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Reports() {
  const [date, setDate] = useState(businessDate());
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReport(null);
    api<Report>(`/staff/reports?date=${date}`).then(setReport).catch((e) => setError(e.message));
  }, [date]);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold">Sales report</h1>
        <div className="flex gap-2">
          <input type="date" className="input w-auto" value={date} max={businessDate()} onChange={(e) => setDate(e.target.value)} aria-label="Report date" />
          <button className="btn-outline" onClick={() => window.print()}>Print</button>
        </div>
      </div>
      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
      {!report ? (
        <Spinner />
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Net sales" value={peso(report.net)} sub={`Gross ${peso(report.gross)} − discounts ${peso(report.discounts)} + fees ${peso(report.fees)}`} />
            <Tile label="Paid orders" value={String(report.orderCount)} sub={`${report.cancelled} cancelled · ${report.refunded} refunded`} />
            <Tile label="Average ticket" value={peso(report.averageTicket)} />
            <Tile label="Order types" value={report.byType.map((t) => t.count).join(' / ')} sub="Dine in / Takeout / Pickup" />
          </div>
          <HourlyChart data={report.byHour} />
          <div className="grid gap-4 lg:grid-cols-2">
            <TopItems items={report.topItems} />
            <div className="card p-5">
              <h2 className="font-semibold">Payments</h2>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-espresso-600">
                    <th className="pb-2 font-semibold">Method</th>
                    <th className="pb-2 text-right font-semibold">Orders</th>
                    <th className="pb-2 text-right font-semibold">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byPayment.map((p) => (
                    <tr key={p.method} className="border-t border-cream-100">
                      <td className="py-2">{PAYMENT_LABELS[p.method]}</td>
                      <td className="py-2 text-right tabular-nums">{p.count}</td>
                      <td className="py-2 text-right tabular-nums">{peso(p.total)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-cream-300 font-semibold">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right tabular-nums">{report.orderCount}</td>
                    <td className="py-2 text-right tabular-nums">{peso(report.net)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-3 text-xs text-espresso-600">Cash in drawer should equal the Cash row. Processing fees collected: {peso(report.fees)}.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
