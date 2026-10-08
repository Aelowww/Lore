import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, ShoppingBag } from 'lucide-react';
import clsx from 'clsx';
import { useMenu, useStoreStatus } from '../lib/api';
import { cartCount, cartSubtotal, useCart } from '../store/cart';
import { peso } from '../shared/pricing';
import type { MenuItem } from '../shared/types';
import { ItemDialog } from '../components/ItemDialog';
import { ErrorNote, Photo } from '../components/ui';

function MenuCard({ item, onOpen }: { item: MenuItem; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className={clsx('group card flex gap-4 p-3 text-left transition hover:border-clay-300 hover:shadow-md', !item.available && 'opacity-60')}
      aria-label={`${item.name}, ${peso(item.price)}${item.available ? '' : ', sold out'}`}
    >
      <div className="relative shrink-0 overflow-hidden rounded-xl">
        <Photo src={item.image} alt="" className="size-28 transition duration-500 group-hover:scale-105 sm:size-32" />
        {!item.available && <span className="absolute inset-0 grid place-items-center bg-espresso-900/60 text-xs font-bold uppercase tracking-wider text-white">Sold out</span>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-1">
        <div className="flex flex-wrap gap-1">
          {item.tags.map((t) => (
            <span key={t} className="chip bg-clay-500/10 text-clay-700">{t}</span>
          ))}
        </div>
        <h3 className="mt-1 font-display text-xl font-semibold leading-tight">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-espresso-600">{item.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold text-espresso-900">{peso(item.price)}</span>
          {item.available && (
            <span className="grid size-8 place-items-center rounded-full bg-espresso-900 text-cream-50 transition group-hover:bg-clay-500">
              <Plus className="size-4" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function Menu() {
  const { menu, error } = useMenu();
  const status = useStoreStatus();
  const { lines, add, setOpen } = useCart();
  const [q, setQ] = useState('');
  const [active, setActive] = useState<MenuItem | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const sections = useRef<Record<string, HTMLElement | null>>({});

  const categories = status?.categories ?? [...new Set(menu?.map((m) => m.category))];
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (menu ?? []).filter((m) => !term || (m.name + ' ' + m.description + ' ' + m.category).toLowerCase().includes(term));
  }, [menu, q]);
  const grouped = categories.map((c) => ({ category: c, items: filtered.filter((m) => m.category === c) })).filter((g) => g.items.length);

  // Highlight the category tab for the section in view.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setCurrent(visible.target.getAttribute('data-cat'));
      },
      { rootMargin: '-140px 0px -60% 0px' },
    );
    Object.values(sections.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [grouped.length, menu]);

  const count = cartCount(lines);

  return (
    <div className="pb-28">
      <section className="relative overflow-hidden bg-espresso-900 px-4 py-16 text-center text-cream-100 sm:py-20">
        <img src="/images/spread.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-b from-espresso-950/60 to-espresso-900/90" />
        <div className="relative">
        <p className="eyebrow text-clay-300">Order online · pickup or dine in</p>
        <h1 className="mt-2 font-display text-6xl font-medium sm:text-7xl">Our Menu</h1>
        <p className="mx-auto mt-3 max-w-md text-cream-200/75">Customize your drink, add a plate, and we’ll have it ready for dine-in, takeout or pickup.</p>
        {status && !status.open && (
          <p className="mx-auto mt-5 w-fit rounded-full bg-clay-500/20 px-4 py-2 text-sm text-clay-200 ring-1 ring-clay-400/40">
            {status.label} — you can still schedule a pickup.
          </p>
        )}
        </div>
      </section>

      <div className="sticky top-16 z-30 border-b border-cream-200 bg-cream-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
          <label className="relative md:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-espresso-600" />
            <input className="input rounded-full pl-9" placeholder="Search the menu" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the menu" />
          </label>
          <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 md:pb-0" aria-label="Categories">
            {grouped.map(({ category }) => (
              <button
                key={category}
                onClick={() => sections.current[category]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className={clsx(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                  current === category ? 'bg-espresso-900 text-cream-50' : 'text-espresso-700 hover:bg-cream-200',
                )}
              >
                {category}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <ErrorNote>{error}</ErrorNote>
        {!menu && !error && (
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="card h-36 animate-pulse bg-cream-100" />)}
          </div>
        )}
        {menu && grouped.length === 0 && <p className="py-20 text-center text-espresso-600">Nothing matches “{q}”.</p>}
        {grouped.map(({ category, items }) => (
          <section
            key={category}
            data-cat={category}
            ref={(el) => {
              sections.current[category] = el;
            }}
            className="scroll-mt-40 pt-10"
          >
            <h2 className="font-display text-3xl font-semibold">{category}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <MenuCard key={item.id} item={item} onOpen={() => setActive(item)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <button onClick={() => setOpen(true)} className="btn-primary w-full max-w-md animate-pop justify-between py-3.5 pl-5 pr-5 text-base shadow-xl">
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-5" /> View cart · {count}
            </span>
            <span>{peso(cartSubtotal(lines))}</span>
          </button>
        </div>
      )}

      <ItemDialog item={active} onClose={() => setActive(null)} onAdd={add} />
    </div>
  );
}
