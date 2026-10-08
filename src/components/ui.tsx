import { useEffect, type ReactNode } from 'react';
import { X, Coffee } from 'lucide-react';
import clsx from 'clsx';
import type { OrderStatus, PaymentStatus } from '../shared/types';

export function Modal({
  open,
  onClose,
  children,
  className,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  label: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={label}>
      <button aria-label="Close" className="absolute inset-0 bg-espresso-950/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={clsx(
          'relative max-h-[92vh] w-full animate-pop overflow-y-auto rounded-t-3xl bg-cream-50 shadow-2xl sm:max-w-lg sm:rounded-3xl',
          className,
        )}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-espresso-800 shadow hover:bg-white">
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

/** Menu photo with a branded fallback for items that don't have a picture yet. */
export function Photo({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={clsx('grid place-items-center bg-gradient-to-br from-clay-500 to-clay-700 text-clay-200', className)} aria-label={alt}>
        <div className="flex flex-col items-center gap-1">
          <Coffee className="size-8" strokeWidth={1.25} />
          <span className="font-display text-lg tracking-[0.2em]">LORE</span>
        </div>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={clsx('object-cover', className)} />;
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  preparing: 'bg-sky-100 text-sky-800',
  ready: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-cream-200 text-espresso-700',
  cancelled: 'bg-rose-100 text-rose-700',
};
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'New',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
export const StatusPill = ({ status }: { status: OrderStatus }) => (
  <span className={clsx('chip', STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>
);

const PAY_STYLE: Record<PaymentStatus, [string, string]> = {
  unpaid: ['bg-rose-50 text-rose-700 ring-1 ring-rose-200', 'Unpaid'],
  pending_verification: ['bg-amber-50 text-amber-800 ring-1 ring-amber-300', 'Payment pending'],
  paid: ['bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', 'Paid'],
  refunded: ['bg-cream-100 text-espresso-600 ring-1 ring-cream-300', 'Refunded'],
};
export const PayPill = ({ status }: { status: PaymentStatus }) => (
  <span className={clsx('chip', PAY_STYLE[status][0])}>{PAY_STYLE[status][1]}</span>
);

export const Spinner = ({ className }: { className?: string }) => (
  <span className={clsx('inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent', className)} role="status" aria-label="Loading" />
);

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200" role="alert">{children}</p>;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; disabled?: boolean }[];
  className?: string;
}) {
  return (
    <div className={clsx('flex rounded-full bg-cream-200/70 p-1', className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex-1 rounded-full px-3 py-2 text-sm font-semibold transition disabled:opacity-40',
            value === o.value ? 'bg-white text-espresso-900 shadow-sm' : 'text-espresso-600 hover:text-espresso-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const timeAgo = (iso: string, now = Date.now()) => {
  const m = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
};

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });

export const orderNo = (n: number) => '#' + String(n).padStart(3, '0');

// Brand marks (lucide no longer ships brand icons).
export const Instagram = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
  </svg>
);
export const Facebook = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
