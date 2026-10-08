import { useEffect, useState } from 'react';
import { Calendar, Mail, MapPin, Phone, Users } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../../lib/api';
import { socket } from '../../lib/socket';
import type { Inquiry, InquiryStatus } from '../../shared/types';
import { ErrorNote, Spinner } from '../../components/ui';

const STATUS: Record<InquiryStatus, string> = {
  new: 'bg-amber-100 text-amber-800',
  contacted: 'bg-sky-100 text-sky-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-cream-200 text-espresso-700',
};
const SERVICE = { 'coffee-cart': 'Coffee cart', 'food-packs': 'Food packs', both: 'Coffee cart + food packs' };

export default function Inquiries() {
  const [list, setList] = useState<Inquiry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => api<Inquiry[]>('/staff/inquiries').then(setList).catch((e) => setError(e.message));
    load();
    socket.on('inquiry', load);
    return () => {
      socket.off('inquiry', load);
    };
  }, []);

  const setStatus = async (i: Inquiry, status: InquiryStatus) => {
    try {
      const updated = await api<Inquiry>(`/staff/inquiries/${i.id}`, { method: 'PATCH', body: { status } });
      setList((xs) => xs?.map((x) => (x.id === i.id ? updated : x)) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-display text-4xl font-semibold">Event inquiries</h1>
      <p className="text-sm text-espresso-600">Coffee cart and food pack requests from the website.</p>
      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
      {!list && <Spinner />}
      {list?.length === 0 && <p className="py-20 text-center text-espresso-600">No inquiries yet.</p>}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {list?.map((i) => (
          <article key={i.id} className="card p-5">
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{i.name}</p>
                <p className="text-sm text-espresso-600">{SERVICE[i.service]} · {i.eventType}</p>
              </div>
              <select
                value={i.status}
                onChange={(e) => setStatus(i, e.target.value as InquiryStatus)}
                className={clsx('rounded-full border-0 px-3 py-1 text-xs font-semibold', STATUS[i.status])}
                aria-label="Inquiry status"
              >
                {Object.keys(STATUS).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </header>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex gap-2"><Calendar className="size-4 text-clay-500" />{i.eventDate}{i.eventTime && ` · ${i.eventTime}`}</div>
              <div className="flex gap-2"><Users className="size-4 text-clay-500" />{i.guests} guests</div>
              {i.venue && <div className="flex gap-2 sm:col-span-2"><MapPin className="size-4 text-clay-500" />{i.venue}</div>}
              <a href={`tel:${i.contact}`} className="flex gap-2 text-clay-700 hover:underline"><Phone className="size-4" />{i.contact}</a>
              {i.email && <a href={`mailto:${i.email}`} className="flex gap-2 truncate text-clay-700 hover:underline"><Mail className="size-4 shrink-0" />{i.email}</a>}
            </dl>
            {i.notes && <p className="mt-3 rounded-xl bg-cream-100 p-3 text-sm">{i.notes}</p>}
            <p className="mt-3 text-xs text-espresso-600">Received {new Date(i.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
