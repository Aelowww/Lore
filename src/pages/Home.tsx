import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Banknote, Clock, CreditCard, Gift, Landmark, MapPin, Phone, Plus, QrCode, Sparkles } from 'lucide-react';
import { api, useMenu, useStoreStatus } from '../lib/api';
import { useCart } from '../store/cart';
import { peso } from '../shared/pricing';
import { DAY_NAMES, STORE, fmtHour } from '../shared/store-info';
import type { MenuItem } from '../shared/types';
import { ItemDialog } from '../components/ItemDialog';
import { Reveal } from '../components/Reveal';
import { ErrorNote, Instagram } from '../components/ui';

/** Shared "customize & add" dialog for every section on the page. */
function useAddDialog() {
  const add = useCart((s) => s.add);
  const setOpen = useCart((s) => s.setOpen);
  const [active, setActive] = useState<MenuItem | null>(null);
  const dialog = (
    <ItemDialog
      item={active}
      onClose={() => setActive(null)}
      onAdd={(line) => {
        add(line);
        setOpen(true);
      }}
    />
  );
  return { open: setActive, dialog };
}

/** One tile of the hero mosaic — every photo here shows Lore's own branding. */
function Tile({ src, alt, label, className }: { src: string; alt: string; label?: string; className?: string }) {
  return (
    <figure className={`group relative overflow-hidden rounded-[1.75rem] shadow-[0_25px_50px_-20px_rgb(0_0_0/0.6)] ring-1 ring-white/10 ${className ?? ''}`}>
      <img src={src} alt={alt} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
      {label && (
        <figcaption className="absolute bottom-3 left-3 rounded-full bg-espresso-950/70 px-3 py-1 text-xs font-medium text-cream-100 backdrop-blur">{label}</figcaption>
      )}
    </figure>
  );
}

function Hero() {
  const status = useStoreStatus();
  return (
    <section className="relative -mt-16 overflow-hidden bg-espresso-950 text-cream-100">
      {/* Lore's own cocoa texture, taken from their logo artwork */}
      <img src="/images/brand-texture.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-r from-espresso-950/90 via-espresso-950/60 to-espresso-950/40" />
      <div className="pointer-events-none absolute -right-32 top-1/3 size-[36rem] rounded-full bg-clay-600/25 blur-3xl" />

      <div className="relative mx-auto grid min-h-[min(90vh,54rem)] max-w-6xl items-center gap-12 px-4 pb-16 pt-28 lg:grid-cols-[1fr_1.05fr] lg:pb-20">
        <div className="animate-fade-up">
          <p className="eyebrow text-clay-300">Lore Coffee Station · Jaro, Iloilo</p>
          <h1 className="mt-5 font-display text-[3.4rem] font-medium leading-[0.95] sm:text-7xl lg:text-[5.25rem]">
            Stories start
            <br />
            over <em className="text-clay-300">coffee.</em>
          </h1>
          <p className="mt-6 max-w-md text-lg text-cream-200/85">
            Signature Spanish lattes, blended frappes and comforting all-day plates — at our station on Diversion Road, or wherever our coffee cart goes.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/menu" className="btn-primary px-7 py-3.5 text-base">
              Order for pickup <ArrowRight className="size-4" />
            </Link>
            <a href="#visit" className="btn border border-cream-200/30 px-7 py-3.5 text-base text-cream-100 hover:bg-white/10">
              <MapPin className="size-4" /> Visit us
            </a>
          </div>
          <dl className="mt-12 grid max-w-md grid-cols-2 gap-6 border-t border-cream-200/15 pt-6 text-sm">
            <div>
              <dt className="flex items-center gap-1.5 text-cream-300/70"><Clock className="size-3.5" /> Today</dt>
              <dd className="mt-1 font-medium">{status?.label ?? '—'}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-cream-300/70"><MapPin className="size-3.5" /> Find us</dt>
              <dd className="mt-1 font-medium">Diversion Rd · Jaro, Iloilo City</dd>
            </div>
          </dl>
        </div>

        <div className="mx-auto grid w-full max-w-[min(36rem,calc((100vh-9rem)*8/7))] grid-cols-2 gap-3 sm:gap-4">
          <Tile src="/images/iced-latte.webp" alt="Iced Spanish latte in a Lore cup" label="Spanish Latte" className="aspect-[8/7] animate-fade-up" />
          <Tile src="/images/logo-badge.webp" alt="Lore Coffee Station logo" className="aspect-[8/7] animate-fade-up [animation-delay:120ms]" />
          <Tile src="/images/court-trio.webp" alt="Americano, matcha and lemonade in Lore cups" className="aspect-[8/7] animate-fade-up [animation-delay:240ms]" />
          <Tile src="/images/coffee-cart.webp" alt="Lore's terracotta coffee cart" label="Our coffee cart" className="aspect-[8/7] animate-fade-up [animation-delay:360ms]" />
        </div>
      </div>
    </section>
  );
}

const TICKER = ['Spanish Latte', 'Mocha Frappe', 'Wagyu Rice Bowl', 'Truffle Pasta', 'Strawberry Frappe', 'Croissant Cheeseburger', 'Matcha Latte', 'Tortilla Pizza', 'Sisig Rice'];

function Ticker() {
  const row = TICKER.map((t) => (
    <span key={t} className="flex shrink-0 items-center gap-8 pr-8">
      <span className="font-display text-2xl italic sm:text-3xl">{t}</span>
      <Sparkles className="size-4 text-clay-200" />
    </span>
  ));
  return (
    <div className="overflow-hidden bg-clay-500 py-4 text-white" aria-hidden="true">
      <div className="flex w-max animate-marquee">
        {row}
        {row}
      </div>
    </div>
  );
}

function Welcome() {
  return (
    <section className="grain bg-cream-50 px-4 py-24 text-center sm:py-32">
      <Reveal className="mx-auto max-w-3xl">
        <p className="eyebrow">Welcome to Lore</p>
        <p className="mt-6 font-display text-3xl leading-snug text-espresso-900 sm:text-5xl sm:leading-tight">
          A place where good coffee, comforting food, and <em className="text-clay-600">unhurried moments</em> come together.
        </p>
        <p className="mx-auto mt-6 max-w-xl text-espresso-600">
          We started as a mobile espresso bar serving events around Iloilo, and every plate on our table today exists because of your love and feedback.
        </p>
      </Reveal>
    </section>
  );
}

const SIGNATURE_IDS = ['spanish-latte', 'mocha-frappe', 'wagyu-rice'];
const SIGNATURE_COPY: Record<string, { kicker: string; line: string }> = {
  'spanish-latte': { kicker: 'The signature', line: 'Espresso over fresh milk with a sweet, creamy finish — the cup we’re known for, and the perfect partner to a plate of truffle pasta.' },
  'mocha-frappe': { kicker: 'Lore’s go-to', line: 'Cold, sweet, blended mocha under a cloud of whipped cream and chocolate drizzle. It never misses.' },
  'wagyu-rice': { kicker: 'From the kitchen', line: 'Tender, melt-in-your-mouth wagyu cubes over warm rice with roasted garlic and a golden, runny egg.' },
};

function Signatures({ menu, onAdd }: { menu: MenuItem[] | null; onAdd: (m: MenuItem) => void }) {
  const items = SIGNATURE_IDS.map((id) => menu?.find((m) => m.id === id)).filter((m): m is MenuItem => Boolean(m));
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24">
      <div className="space-y-20 sm:space-y-28">
        {items.map((item, i) => (
          <Reveal key={item.id} className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
            <div className={i % 2 ? 'md:order-2' : ''}>
              <div className="relative">
                <img src={item.image ?? ''} alt={item.name} loading="lazy" className="aspect-[8/7] w-full rounded-[2rem] object-cover shadow-[0_30px_60px_-30px_rgb(34_18_12/0.5)]" />
                <span className="absolute -bottom-5 left-6 rounded-full bg-espresso-900 px-5 py-2.5 font-display text-2xl text-cream-50 shadow-lg">{peso(item.price)}</span>
              </div>
            </div>
            <div className={i % 2 ? 'md:order-1' : ''}>
              <p className="eyebrow">{SIGNATURE_COPY[item.id].kicker}</p>
              <h2 className="mt-3 font-display text-5xl font-medium leading-none sm:text-6xl">{item.name}</h2>
              <p className="mt-5 max-w-md text-lg text-espresso-700">{SIGNATURE_COPY[item.id].line}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button className="btn-dark px-6 py-3" onClick={() => onAdd(item)} disabled={!item.available}>
                  {item.available ? <><Plus className="size-4" /> Add to order</> : 'Sold out today'}
                </button>
                <Link to="/menu" className="btn-ghost">See the full menu</Link>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const BOARD = [
  { title: 'Espresso Bar', note: 'Hot or iced · 12 / 16 oz', categories: ['Coffee'] },
  { title: 'Cold & Blended', note: 'Frappes, matcha & refreshers', categories: ['Frappes', 'Non-Coffee', 'Refreshers'] },
  { title: 'All-day Plates', note: 'Rice meals, pasta & sandwiches', categories: ['Rice Meals', 'Pasta', 'Sandwiches'] },
];

function MenuBoard({ menu, onAdd }: { menu: MenuItem[] | null; onAdd: (m: MenuItem) => void }) {
  return (
    <section className="grain bg-espresso-900 py-24 text-cream-100">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-clay-300">On the board today</p>
            <h2 className="mt-3 font-display text-5xl font-medium sm:text-6xl">The Menu</h2>
          </div>
          <Link to="/menu" className="btn border border-cream-200/30 text-cream-100 hover:bg-white/10">
            Order online <ArrowRight className="size-4" />
          </Link>
        </Reveal>
        <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
          {BOARD.map((col, i) => {
            const items = (menu ?? []).filter((m) => col.categories.includes(m.category)).slice(0, 8);
            return (
              <Reveal key={col.title} delay={i * 120}>
                <h3 className="font-display text-3xl text-clay-300">{col.title}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-cream-300/60">{col.note}</p>
                <ul className="mt-6 space-y-3.5">
                  {!menu && Array.from({ length: 6 }, (_, k) => <li key={k} className="h-5 animate-pulse rounded bg-espresso-800" />)}
                  {items.map((m) => (
                    <li key={m.id}>
                      <button onClick={() => onAdd(m)} disabled={!m.available} className="group flex w-full items-baseline text-left disabled:opacity-40">
                        <span className="font-medium transition group-hover:text-clay-300">
                          {m.name}
                          {m.tags.includes('Bestseller') && <span className="ml-1.5 text-xs text-clay-300" aria-label="Bestseller">★</span>}
                        </span>
                        <span className="leader" />
                        <span className="tabular-nums text-cream-200">{m.available ? peso(m.price) : 'Sold out'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-14 text-center text-sm text-cream-300/60">★ Bestseller · Tap any item to customize and add it to your order.</p>
      </div>
    </section>
  );
}

const WAYS = [
  { title: 'Dine in', text: 'Grab a table, recharge and stay a while.', image: 'spread', to: '/#visit' },
  { title: 'Order ahead', text: 'Pay online and pick up — no waiting in line.', image: 'iced-latte', to: '/menu' },
  { title: 'GrabFood', text: 'Search “Lore Coffee Station” and we’ll come to you.', image: 'croissant-bacon', to: '/menu' },
  { title: 'Events', text: 'Our coffee cart and food packs, at your venue.', image: 'coffee-cart', to: '/events' },
];

function Ways() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <Reveal>
        <p className="eyebrow">However you like it</p>
        <h2 className="mt-3 font-display text-5xl font-medium sm:text-6xl">Ways to Lore</h2>
      </Reveal>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WAYS.map((w, i) => (
          <Reveal key={w.title} delay={i * 90}>
            <Link to={w.to} className="group block">
              <div className="overflow-hidden rounded-3xl">
                <img src={`/images/${w.image}.webp`} alt="" loading="lazy" className="aspect-[8/7] w-full object-cover transition duration-700 group-hover:scale-105" />
              </div>
              <h3 className="mt-4 flex items-center justify-between font-display text-3xl group-hover:text-clay-600">
                {w.title}
                <ArrowUpRight className="size-5 opacity-0 transition group-hover:opacity-100" />
              </h3>
              <p className="mt-1 text-sm text-espresso-600">{w.text}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function EventsBand() {
  return (
    <section className="grain overflow-hidden bg-cream-100">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 md:grid-cols-2">
        <Reveal className="relative pb-8">
          <img src="/images/coffee-cart.webp" alt="Lore's terracotta mobile espresso cart" loading="lazy" className="aspect-[8/7] w-[85%] rounded-[2rem] object-cover" />
          <img src="/images/court-trio.webp" alt="Americano, matcha and lemonade in Lore cups" loading="lazy" className="absolute bottom-0 right-0 aspect-[8/7] w-[45%] rounded-[1.5rem] border-8 border-cream-100 object-cover shadow-xl" />
        </Reveal>
        <Reveal delay={120}>
          <p className="eyebrow">Mobile espresso bar</p>
          <h2 className="mt-3 font-display text-5xl font-medium leading-[1.05] sm:text-6xl">Planning an event? We’ll bring the coffee.</h2>
          <p className="mt-5 max-w-md text-lg text-espresso-700">
            Corporate gatherings, weddings, birthdays, launches and private celebrations — our cart sets up and serves on site. Need meals too? Ask about Lore food packs.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/events" className="btn-primary px-6 py-3">Request a quote <ArrowRight className="size-4" /></Link>
            <Link to="/events#food-packs" className="btn-outline px-6 py-3">Food packs</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PointsAndPayments() {
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<{ points: number; visits: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setResult(await api(`/loyalty/${encodeURIComponent(phone)}`));
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    }
  };
  const methods = [
    { icon: Banknote, name: 'Cash', note: 'At the counter' },
    { icon: QrCode, name: 'QR Ph · GCash · Maya', note: '1% fee' },
    { icon: CreditCard, name: 'Credit / Debit card', note: '3% fee' },
    { icon: Landmark, name: 'Bank transfer', note: 'No fee' },
  ];
  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-24 lg:grid-cols-[1.1fr_1fr]">
      <Reveal>
        {/* Styled like a physical loyalty card */}
        <div className="relative h-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-clay-500 via-clay-600 to-clay-700 p-8 text-white shadow-[0_30px_60px_-30px_rgb(134_64_45/0.8)] sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border border-white/15" />
          <div className="pointer-events-none absolute -right-4 -top-4 size-40 rounded-full border border-white/15" />
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display text-3xl tracking-[0.15em]">LORE</p>
              <p className="-mt-1 font-display text-sm italic text-clay-200">Points</p>
            </div>
            <Gift className="size-7 text-clay-200" />
          </div>
          <p className="mt-10 font-display text-4xl leading-tight sm:text-5xl">Every cup counts.</p>
          <p className="mt-3 max-w-sm text-clay-100">
            Add your mobile number when you order. Earn <strong>1 point per ₱50</strong> — each point is <strong>₱1 off</strong> your next visit.
          </p>
          <form onSubmit={check} className="mt-8 flex max-w-sm gap-2">
            <input
              className="w-full rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-clay-200 focus:border-white focus:outline-none"
              inputMode="tel"
              placeholder="09XX XXX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-label="Mobile number"
            />
            <button className="btn shrink-0 bg-white text-clay-700 hover:bg-cream-100">Check</button>
          </form>
          {result && (
            <p className="mt-4 text-sm">
              You have <strong className="text-lg">{result.points} points</strong> ({peso(result.points)} off) from {result.visits} visit{result.visits === 1 ? '' : 's'}.
            </p>
          )}
          {error && <p className="mt-4 text-sm text-clay-100">{error}</p>}
        </div>
      </Reveal>
      <Reveal delay={120} className="card flex flex-col p-8 sm:p-10">
        <p className="eyebrow">Coffee first, payment made easy</p>
        <h2 className="mt-3 font-display text-4xl font-medium">We accept all online payments</h2>
        <ul className="mt-8 flex-1 space-y-4">
          {methods.map(({ icon: Icon, name, note }) => (
            <li key={name} className="flex items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cream-100 text-clay-600"><Icon className="size-5" /></span>
              <span className="flex-1 font-medium">{name}</span>
              <span className="text-sm text-espresso-600">{note}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

const GALLERY = ['strawberry-frappe', 'sisig', 'truffle-pasta', 'court-trio', 'tortilla-pizza', 'croissant-bacon', 'nachos', 'squid-ink-pasta'];

function Gallery() {
  return (
    <section className="bg-espresso-950 py-24 text-cream-100">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-clay-300">@lorecoffeestation</p>
            <h2 className="mt-3 font-display text-5xl font-medium">Fresh from the feed</h2>
          </div>
          <a href={STORE.instagram} target="_blank" rel="noreferrer" className="btn border border-cream-200/30 text-cream-100 hover:bg-white/10">
            <Instagram className="size-4" /> Follow on Instagram
          </a>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GALLERY.map((g) => (
            <a key={g} href={STORE.instagram} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl">
              <img src={`/images/${g}.webp`} alt={g.replace(/-/g, ' ')} loading="lazy" className="aspect-[8/7] w-full object-cover transition duration-500 group-hover:scale-105 group-hover:opacity-90" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Visit() {
  const status = useStoreStatus();
  return (
    <section id="visit" className="grain scroll-mt-20 bg-cream-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 md:grid-cols-[1fr_1.2fr]">
        <Reveal>
          <p className="eyebrow">Visit us</p>
          <h2 className="mt-3 font-display text-5xl font-medium leading-[1.05]">Your cozy spot to recharge</h2>
          <img
            src="/images/location.webp"
            alt="Window seats at Lore Coffee Station overlooking Diversion Road"
            loading="lazy"
            className="mt-6 aspect-[16/9] w-full rounded-3xl object-cover object-[50%_70%]"
          />
          {status && (
            <p className={`chip mt-6 ${status.open ? 'bg-emerald-50 text-emerald-700' : 'bg-cream-200 text-espresso-700'}`}>
              <span className={`size-1.5 rounded-full ${status.open ? 'bg-emerald-500' : 'bg-espresso-600'}`} /> {status.label}
            </p>
          )}
          <p className="mt-5 flex gap-2 text-espresso-700">
            <MapPin className="mt-1 size-5 shrink-0 text-clay-500" /> {STORE.address}
          </p>
          <a href={`tel:${STORE.phone.replace(/s/g, '')}`} className="mt-2 flex gap-2 text-espresso-700 hover:text-clay-600">
            <Phone className="mt-0.5 size-5 shrink-0 text-clay-500" /> {STORE.phone}
          </a>
          <table className="mt-6 w-full max-w-sm text-sm">
            <tbody>
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <tr key={d} className="border-b border-cream-200">
                  <td className="py-2.5 font-medium">{DAY_NAMES[d]}</td>
                  <td className="py-2.5 text-right tabular-nums text-espresso-700">
                    {fmtHour(STORE.hours[d].open)} – {fmtHour(STORE.hours[d].close)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <a className="btn-primary mt-8" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE.mapsQuery)}`}>
            Get directions <ArrowRight className="size-4" />
          </a>
        </Reveal>
        <Reveal delay={120}>
          <iframe
            title="Map to Lore Coffee Station"
            className="h-96 w-full rounded-[2rem] border-0 shadow-sm md:h-full md:min-h-[30rem]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${encodeURIComponent(STORE.mapsQuery)}&output=embed`}
          />
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  const { menu, error } = useMenu();
  const { open, dialog } = useAddDialog();
  return (
    <>
      <Hero />
      <Ticker />
      <Welcome />
      {error && <div className="mx-auto max-w-6xl px-4"><ErrorNote>{error}</ErrorNote></div>}
      <Signatures menu={menu} onAdd={open} />
      <MenuBoard menu={menu} onAdd={open} />
      <Ways />
      <EventsBand />
      <PointsAndPayments />
      <Gallery />
      <Visit />
      {dialog}
    </>
  );
}
