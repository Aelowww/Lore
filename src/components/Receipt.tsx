import { Printer } from 'lucide-react';
import type { Order } from '../shared/types';
import { describeSelections, peso, PAYMENT_LABELS } from '../shared/pricing';
import { STORE } from '../shared/store-info';
import { Modal, orderNo } from './ui';

/** Thermal-printer style receipt. Only #print-receipt is printed (see index.css). */
export function ReceiptModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  if (!order) return null;
  const row = (label: string, value: string, bold = false) => (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
  return (
    <Modal open onClose={onClose} label={`Receipt ${orderNo(order.number)}`} className="sm:max-w-sm">
      <div className="p-6">
        <div id="print-receipt" className="mx-auto max-w-[18rem] bg-white p-4 font-mono text-[12px] leading-relaxed text-black">
          <div className="text-center">
            <p className="text-base font-bold tracking-[0.3em]">LORE</p>
            <p>Coffee Station</p>
            <p>{STORE.address}</p>
          </div>
          <p className="my-2 border-t border-dashed border-black" />
          <p className="text-center text-2xl font-bold">{orderNo(order.number)}</p>
          {row('Date', new Date(order.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'short', timeStyle: 'short' }))}
          {row('Customer', order.customerName)}
          {row('Type', order.type + (order.table ? ` · T${order.table}` : ''))}
          {order.handledBy && row('Cashier', order.handledBy)}
          <p className="my-2 border-t border-dashed border-black" />
          {order.lines.map((l, i) => (
            <div key={i} className="mb-1">
              {row(`${l.qty} x ${l.name}`, peso(l.lineTotal))}
              {l.selections.length > 0 && <p className="pl-3 text-[11px]">{describeSelections(l.selections)}</p>}
              {l.note && <p className="pl-3 text-[11px]">* {l.note}</p>}
            </div>
          ))}
          <p className="my-2 border-t border-dashed border-black" />
          {row('Subtotal', peso(order.subtotal))}
          {order.discounts.map((d) => row(d.label, '-' + peso(d.amount)))}
          {order.fee > 0 && row(order.feeLabel ?? 'Fee', peso(order.fee))}
          {row('TOTAL', peso(order.total), true)}
          <p className="my-2 border-t border-dashed border-black" />
          {row('Payment', PAYMENT_LABELS[order.paymentMethod].split(' (')[0])}
          {row('Status', order.paymentStatus.replace('_', ' ').toUpperCase())}
          {order.cashTendered != null && row('Cash', peso(order.cashTendered))}
          {order.change != null && row('Change', peso(order.change))}
          {order.paymentRef && row('Ref', order.paymentRef)}
          {order.pointsEarned > 0 && row('Points earned', String(order.pointsEarned))}
          <p className="my-2 border-t border-dashed border-black" />
          <p className="text-center">Thank you! See you again ☕</p>
          <p className="text-center">IG/FB @lorecoffeestation</p>
          <p className="mt-1 text-center text-[10px]">This is not an official receipt.</p>
        </div>
        <button className="btn-dark mt-5 w-full" onClick={() => window.print()}>
          <Printer className="size-4" /> Print receipt
        </button>
      </div>
    </Modal>
  );
}
