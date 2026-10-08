import { useEffect, useState } from 'react';
import { Banknote, CreditCard, Landmark, QrCode } from 'lucide-react';
import { api } from '../../lib/api';
import { peso, PAYMENT_FEES, round2 } from '../../shared/pricing';
import type { Order, PaymentMethod } from '../../shared/types';
import { ErrorNote, Modal, Segmented, Spinner, orderNo } from '../../components/ui';

export const METHOD_OPTIONS: { value: PaymentMethod; label: React.ReactNode }[] = [
  { value: 'cash', label: <span className="flex items-center justify-center gap-1.5"><Banknote className="size-4" />Cash</span> },
  { value: 'qr', label: <span className="flex items-center justify-center gap-1.5"><QrCode className="size-4" />QR</span> },
  { value: 'card', label: <span className="flex items-center justify-center gap-1.5"><CreditCard className="size-4" />Card</span> },
  { value: 'bank', label: <span className="flex items-center justify-center gap-1.5"><Landmark className="size-4" />Bank</span> },
];

/** Quick cash buttons: exact amount plus the next common bills above it. */
export function cashSuggestions(total: number) {
  const out = new Set<number>([Math.ceil(total)]);
  for (const bill of [100, 200, 500, 1000]) {
    const v = Math.ceil(total / bill) * bill;
    if (v >= total) out.add(v);
  }
  return [...out].sort((a, b) => a - b).slice(0, 4);
}

export function CashInput({ total, value, onChange }: { total: number; value: string; onChange: (v: string) => void }) {
  const tendered = Number(value);
  return (
    <div className="space-y-2">
      <label className="label" htmlFor="tendered">Cash received</label>
      <input id="tendered" className="input text-lg font-semibold tabular-nums" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" />
      <div className="flex flex-wrap gap-2">
        {cashSuggestions(total).map((v) => (
          <button type="button" key={v} className="btn-outline px-3 py-1.5" onClick={() => onChange(String(v))}>
            {peso(v)}
          </button>
        ))}
      </div>
      {value !== '' && (
        <p className={`text-sm font-semibold ${tendered >= total ? 'text-emerald-700' : 'text-rose-600'}`}>
          {tendered >= total ? `Change: ${peso(round2(tendered - total))}` : `Short by ${peso(round2(total - tendered))}`}
        </p>
      )}
    </div>
  );
}

/** Collect payment at the counter for an order that is still unpaid. */
export function CollectPaymentModal({ order, onClose, onDone }: { order: Order | null; onClose: () => void; onDone: (o: Order) => void }) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cash, setCash] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setMethod(order.paymentMethod);
      setCash('');
      setReference('');
      setError(null);
    }
  }, [order]);
  if (!order) return null;

  const base = round2(order.subtotal - order.discountTotal);
  const total = round2(base + base * PAYMENT_FEES[method]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      onDone(await api<Order>(`/staff/orders/${order.id}/mark-paid`, { body: { method, cashTendered: Number(cash), reference } }));
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} label="Collect payment" className="sm:max-w-md">
      <div className="space-y-5 p-6">
        <div>
          <p className="eyebrow">Order {orderNo(order.number)} · {order.customerName}</p>
          <h2 className="mt-1 font-display text-3xl font-semibold">Collect {peso(total)}</h2>
        </div>
        <Segmented value={method} onChange={setMethod} options={METHOD_OPTIONS} />
        {PAYMENT_FEES[method] > 0 && <p className="text-xs text-espresso-600">Includes {PAYMENT_FEES[method] * 100}% processing fee.</p>}
        {method === 'cash' ? (
          <CashInput total={total} value={cash} onChange={setCash} />
        ) : (
          <div>
            <label className="label" htmlFor="pay-ref">{method === 'card' ? 'Terminal approval code' : 'Reference number'} (optional)</label>
            <input id="pay-ref" className="input font-mono" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        )}
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary w-full py-3" onClick={submit} disabled={busy || (method === 'cash' && !(Number(cash) >= total))}>
          {busy ? <Spinner className="size-4" /> : 'Mark as paid'}
        </button>
      </div>
    </Modal>
  );
}
