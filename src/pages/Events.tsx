import { useState } from 'react';
import { CheckCircle2, Coffee, PartyPopper, UtensilsCrossed, Users } from 'lucide-react';
import { api } from '../lib/api';
import { ErrorNote, Spinner } from '../components/ui';

const EMPTY = {
  name: '',
  contact: '',
  email: '',
  service: 'coffee-cart',
  eventType: 'Corporate event',
  eventDate: '',
  eventTime: '',
  guests: 50,
  venue: '',
  notes: '',
};

export default function Events() {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/inquiries', { body: form });
      setSent(true);
      setForm(EMPTY);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <section className="relative overflow-hidden bg-espresso-900 text-cream-100">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
          <div>
            <p className="eyebrow text-clay-300">Mobile espresso bar · Iloilo City</p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-tight sm:text-6xl">Planning an event? We’ll bring the coffee.</h1>
            <p className="mt-5 text-cream-200/80">
              From corporate gatherings and weddings to birthdays, launches and private celebrations, our coffee cart sets up and serves handcrafted drinks on site.
            </p>
          </div>
          <img src="/images/coffee-cart.webp" alt="Lore's terracotta coffee cart with espresso machine and grinder" className="aspect-[8/7] w-full rounded-[2rem] object-cover shadow-2xl" />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-16 md:grid-cols-3">
        {[
          { icon: Coffee, title: 'Coffee cart', text: 'Espresso bar with barista, cups, and a menu of lattes, matcha and refreshers, priced per cup or per package.' },
          { icon: UtensilsCrossed, title: 'Food packs', text: 'Freshly prepared meal packs for conferences, meetings, supplier crews and gatherings. Custom menus welcome.', id: 'food-packs' },
          { icon: PartyPopper, title: 'Any occasion', text: 'Weddings, birthdays, product launches, school events, and court-side coffee for sports days.' },
        ].map(({ icon: Icon, title, text, id }) => (
          <div key={title} id={id} className="card scroll-mt-24 p-6">
            <span className="grid size-12 place-items-center rounded-2xl bg-clay-500/10 text-clay-600"><Icon className="size-6" /></span>
            <h2 className="mt-4 font-display text-2xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-espresso-600">{text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <img src="/images/food-packs.webp" alt="Lore food packs with pasta and fried chicken" className="aspect-[8/7] w-full rounded-3xl object-cover" />
          <img src="/images/court-trio.webp" alt="Americano, matcha and lemonade court-side" className="aspect-[8/7] w-full rounded-3xl object-cover" />
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="font-display text-3xl font-semibold">Request a quote</h2>
          <p className="mt-1 text-sm text-espresso-600">Tell us about your event and we’ll get back to you with packages and availability.</p>
          {sent ? (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl bg-emerald-50 p-8 text-center text-emerald-800">
              <CheckCircle2 className="size-10" />
              <p className="text-lg font-semibold">Thanks! Your inquiry is in.</p>
              <p className="text-sm">We’ll reach out within a day. For urgent bookings, message us on Facebook.</p>
              <button className="btn-outline mt-2" onClick={() => setSent(false)}>Send another</button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="label">What do you need?</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['coffee-cart', 'Coffee cart'],
                    ['food-packs', 'Food packs'],
                    ['both', 'Both'],
                  ].map(([v, l]) => (
                    <label key={v} className="flex cursor-pointer items-center justify-center rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-sm font-medium has-[:checked]:border-clay-500 has-[:checked]:bg-clay-500 has-[:checked]:text-white">
                      <input type="radio" name="service" value={v} checked={form.service === v} onChange={set('service')} className="sr-only" />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label" htmlFor="ev-name">Your name</label>
                <input id="ev-name" className="input" required value={form.name} onChange={set('name')} autoComplete="name" />
              </div>
              <div>
                <label className="label" htmlFor="ev-contact">Mobile number</label>
                <input id="ev-contact" className="input" required inputMode="tel" value={form.contact} onChange={set('contact')} autoComplete="tel" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="ev-email">Email (optional)</label>
                <input id="ev-email" type="email" className="input" value={form.email} onChange={set('email')} autoComplete="email" />
              </div>
              <div>
                <label className="label" htmlFor="ev-type">Event type</label>
                <select id="ev-type" className="input" value={form.eventType} onChange={set('eventType')}>
                  {['Corporate event', 'Wedding', 'Birthday', 'Product launch', 'School / org event', 'Sports event', 'Private celebration', 'Other'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="ev-guests"><Users className="mr-1 inline size-3" />Guests</label>
                <input id="ev-guests" type="number" min={1} max={5000} className="input" value={form.guests} onChange={set('guests')} />
              </div>
              <div>
                <label className="label" htmlFor="ev-date">Date</label>
                <input id="ev-date" type="date" min={today} className="input" required value={form.eventDate} onChange={set('eventDate')} />
              </div>
              <div>
                <label className="label" htmlFor="ev-time">Start time</label>
                <input id="ev-time" type="time" className="input" value={form.eventTime} onChange={set('eventTime')} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="ev-venue">Venue</label>
                <input id="ev-venue" className="input" placeholder="Venue name and city" value={form.venue} onChange={set('venue')} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="ev-notes">Anything else?</label>
                <textarea id="ev-notes" className="input min-h-24" value={form.notes} onChange={set('notes')} placeholder="Drinks you'd like, budget, setup notes…" />
              </div>
              <div className="space-y-3 sm:col-span-2">
                <ErrorNote>{error}</ErrorNote>
                <button className="btn-primary w-full py-3" disabled={busy}>{busy ? <Spinner className="size-4" /> : 'Send inquiry'}</button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
