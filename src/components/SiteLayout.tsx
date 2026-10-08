import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu as MenuIcon, MapPin, Minus, Phone, Plus, ShoppingBag, Trash2, X, Clock } from 'lucide-react';
import clsx from 'clsx';
import { cartCount, cartSubtotal, useCart } from '../store/cart';
import { describeSelections, peso } from '../shared/pricing';
import { DAY_NAMES, STORE, fmtHour } from '../shared/store-info';
import { useStoreStatus } from '../lib/api';
import { Facebook, Instagram, Photo } from './ui';

export function Wordmark({ light, className }: { light?: boolean; className?: string }) {
  return (
    <span className={clsx('flex flex-col items-center leading-none', className)}>
      <span className={clsx('font-display text-[1.7rem] font-medium tracking-[0.12em]', light ? 'text-clay-300' : 'text-clay-600')}>LORE</span>
      <span className={clsx('-mt-0.5 font-display text-[0.7rem] italic tracking-wide', light ? 'text-clay-300/80' : 'text-clay-600/80')}>Coffee Station</span>
    </span>
  );
}

const NAV = [
  { to: '/menu', label: 'Menu' },
  { to: '/events', label: 'Events & Catering' },
  { to: '/#visit', label: 'Visit' },
  { to: '/track', label: 'Track order' },
];

function AnnouncementBar() {
  const status = useStoreStatus();
  return (
    <div className="bg-espresso-950 text-cream-200">
      <div className="mx-auto flex h-9 max-w-6xl items-center justify-center gap-3 px-4 text-xs sm:justify-between">
        <p className="flex items-center gap-2">
          {status && <span className={clsx('size-1.5 rounded-full', status.open ? 'bg-emerald-400' : 'bg-cream-300/50')} />}
          <span>{status?.label ?? 'Mon – Sat 10 AM – 10 PM · Sun 12 – 10 PM'}</span>
        </p>
        <p className="hidden items-center gap-4 sm:flex">
          <Link to="/menu" className="hover:text-clay-300">Order ahead &amp; skip the line</Link>
          <span className="text-cream-300/40">|</span>
          <span>Also on GrabFood</span>
        </p>
      </div>
    </div>
  );
}

function Header() {
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const [mobileNav, setMobileNav] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname, hash } = useLocation();
  const count = cartCount(lines);
  useEffect(() => setMobileNav(false), [pathname, hash]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // On the home page the header floats over the hero photo until you scroll.
  const overlay = pathname === '/' && !scrolled && !mobileNav;

  return (
    <header
      className={clsx(
        'sticky top-0 z-40 transition-colors duration-300',
        overlay ? 'bg-transparent text-cream-50' : 'border-b border-cream-200/80 bg-cream-50/90 text-espresso-800 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <button className="-ml-2 rounded-full p-2 md:hidden" onClick={() => setMobileNav((v) => !v)} aria-label="Menu" aria-expanded={mobileNav}>
          {mobileNav ? <X className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
        <Link to="/" aria-label="Lore Coffee Station home">
          <Wordmark light={overlay} />
        </Link>
        <nav className="ml-6 hidden gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                clsx(
                  'rounded-full px-3.5 py-2 text-sm font-medium transition',
                  overlay ? 'hover:bg-white/10' : 'hover:text-clay-600',
                  isActive && !n.to.includes('#') && !overlay && 'bg-cream-200 text-espresso-900',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/menu" className={clsx('btn hidden sm:inline-flex', overlay ? 'bg-cream-50 text-espresso-900 hover:bg-white' : 'btn-primary')}>
            Order now
          </Link>
          <button
            className={clsx('btn relative px-3.5', overlay ? 'border border-white/30 hover:bg-white/10' : 'bg-espresso-900 text-cream-50 hover:bg-espresso-800')}
            onClick={() => setOpen(true)}
            aria-label={`Cart, ${count} items`}
          >
            <ShoppingBag className="size-4" />
            {count > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-clay-500 px-1 text-[11px] font-bold text-white">{count}</span>}
          </button>
        </div>
      </div>
      {mobileNav && (
        <nav className="border-t border-cream-200 bg-cream-50 px-4 py-3 text-espresso-800 md:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="block rounded-xl px-3 py-3 font-medium hover:bg-cream-100">
              {n.label}
            </Link>
          ))}
          <Link to="/menu" className="btn-primary mt-2 w-full">Order now</Link>
        </nav>
      )}
    </header>
  );
}

function CartDrawer() {
  const { lines, open, setOpen, setQty, remove } = useCart();
  const navigate = useNavigate();
  const subtotal = cartSubtotal(lines);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  return (
    <div className={clsx('fixed inset-0 z-50 transition', open ? 'visible' : 'invisible')} aria-hidden={!open}>
      <button aria-label="Close cart" tabIndex={open ? 0 : -1} className={clsx('absolute inset-0 bg-espresso-950/50 transition-opacity', open ? 'opacity-100' : 'opacity-0')} onClick={() => setOpen(false)} />
      <aside
        className={clsx('absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream-50 shadow-2xl transition-transform duration-300', open ? 'translate-x-0' : 'translate-x-full')}
        aria-label="Your cart"
      >
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
          <h2 className="font-display text-2xl font-semibold">Your order</h2>
          <button className="btn-ghost p-2" onClick={() => setOpen(false)} aria-label="Close cart" tabIndex={open ? 0 : -1}>
            <X className="size-5" />
          </button>
        </div>
        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="size-10 text-clay-400" strokeWidth={1.25} />
            <p className="text-espresso-600">Your cart is empty. Something warm, perhaps?</p>
            <button className="btn-primary" tabIndex={open ? 0 : -1} onClick={() => { setOpen(false); navigate('/menu'); }}>
              Browse the menu
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-cream-200 overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-3 py-4">
                  <Photo src={l.image} alt={l.name} className="size-16 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <p className="font-semibold">{l.name}</p>
                      <p className="font-semibold tabular-nums">{peso(l.lineTotal)}</p>
                    </div>
                    {l.selections.length > 0 && <p className="text-xs text-espresso-600">{describeSelections(l.selections)}</p>}
                    {l.note && <p className="text-xs italic text-espresso-600">“{l.note}”</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <button className="grid size-7 place-items-center rounded-full border border-cream-300 bg-white" onClick={() => setQty(l.key, l.qty - 1)} aria-label="Decrease" tabIndex={open ? 0 : -1}>
                        <Minus className="size-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                      <button className="grid size-7 place-items-center rounded-full border border-cream-300 bg-white" onClick={() => setQty(l.key, l.qty + 1)} aria-label="Increase" tabIndex={open ? 0 : -1}>
                        <Plus className="size-3" />
                      </button>
                      <button className="ml-auto p-1 text-espresso-600 hover:text-rose-600" onClick={() => remove(l.key)} aria-label={`Remove ${l.name}`} tabIndex={open ? 0 : -1}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t border-cream-200 bg-white px-5 py-5">
              <div className="flex justify-between text-sm">
                <span className="text-espresso-600">Subtotal</span>
                <span className="font-semibold tabular-nums">{peso(subtotal)}</span>
              </div>
              <p className="text-xs text-espresso-600">Promo codes, Lore points and payment are on the next step.</p>
              <button className="btn-primary w-full py-3.5 text-base" tabIndex={open ? 0 : -1} onClick={() => { setOpen(false); navigate('/checkout'); }}>
                Checkout · {peso(subtotal)}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-espresso-900 text-cream-200">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Wordmark light className="items-start" />
          <p className="mt-4 text-sm text-cream-300/80">Good coffee, comforting food, and unhurried moments. {STORE.tagline}.</p>
          <div className="mt-5 flex gap-2">
            <a href={STORE.instagram} target="_blank" rel="noreferrer" className="grid size-10 place-items-center rounded-full bg-espresso-800 hover:bg-clay-600" aria-label="Instagram">
              <Instagram className="size-4" />
            </a>
            <a href={STORE.facebook} target="_blank" rel="noreferrer" className="grid size-10 place-items-center rounded-full bg-espresso-800 hover:bg-clay-600" aria-label="Facebook">
              <Facebook className="size-4" />
            </a>
          </div>
        </div>
        <div>
          <h3 className="eyebrow text-clay-300">Visit</h3>
          <p className="mt-3 flex gap-2 text-sm"><MapPin className="mt-0.5 size-4 shrink-0 text-clay-400" />{STORE.address}</p>
          <a href={`tel:${STORE.phone.replace(/s/g, '')}`} className="mt-2 flex gap-2 text-sm hover:text-clay-300"><Phone className="mt-0.5 size-4 shrink-0 text-clay-400" />{STORE.phone}</a>
        </div>
        <div>
          <h3 className="eyebrow text-clay-300">Hours</h3>
          <ul className="mt-3 space-y-1 text-sm">
            <li className="flex gap-2"><Clock className="mt-0.5 size-4 text-clay-400" />Mon – Sat · {fmtHour(10)} – {fmtHour(22)}</li>
            <li className="pl-6">{DAY_NAMES[0]} · {fmtHour(12)} – {fmtHour(22)}</li>
          </ul>
        </div>
        <div>
          <h3 className="eyebrow text-clay-300">More</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/events" className="hover:text-clay-300">Mobile coffee cart</Link></li>
            <li><Link to="/events#food-packs" className="hover:text-clay-300">Food packs</Link></li>
            <li><Link to="/board" className="hover:text-clay-300">Now serving board</Link></li>
            <li><Link to="/staff" className="hover:text-clay-300">Staff login</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-espresso-800 py-5 text-center text-xs text-cream-300/60">© {new Date().getFullYear()} Lore Coffee Station · Jaro, Iloilo City</p>
    </footer>
  );
}

export function SiteLayout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
