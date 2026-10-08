import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { api, useMenu, useStoreStatus } from '../../lib/api';
import { peso } from '../../shared/pricing';
import type { MenuItem } from '../../shared/types';
import { ErrorNote, Modal, Photo, Spinner } from '../../components/ui';
import { useStaffContext } from './StaffLayout';

const IMAGES = [
  'iced-latte', 'drinks-lineup', 'court-trio', 'mocha-frappe', 'strawberry-frappe', 'wagyu-rice', 'sisig', 'schublig', 'chicken-teriyaki',
  'truffle-pasta', 'squid-ink-pasta', 'croissant-burger', 'chicken-sandwich', 'croissant-bacon', 'tortilla-pizza', 'nachos', 'fries-wings',
  'food-packs', 'spread', 'interior', 'coffee-cart',
];

function Editor({ item, categories, onClose, onSaved }: { item: Partial<MenuItem> | null; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<MenuItem>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setForm(item ?? {});
    setError(null);
  }, [item]);
  if (!item) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(item.id ? `/staff/menu/${item.id}` : '/staff/menu', { method: item.id ? 'PUT' : 'POST', body: form });
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} label={item.id ? 'Edit item' : 'New item'}>
      <form onSubmit={save} className="space-y-4 p-6">
        <h2 className="font-display text-3xl font-semibold">{item.id ? 'Edit item' : 'New item'}</h2>
        <div>
          <label className="label" htmlFor="m-name">Name</label>
          <input id="m-name" className="input" required value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="m-price">Price (₱)</label>
            <input id="m-price" className="input" type="number" min={0} step="0.01" required value={form.price ?? ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label" htmlFor="m-cat">Category</label>
            <select id="m-cat" className="input" value={form.category ?? categories[0]} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="m-desc">Description</label>
          <textarea id="m-desc" className="input min-h-20" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="m-tags">Tags (comma separated)</label>
          <input id="m-tags" className="input" placeholder="Bestseller, New" value={(form.tags ?? []).join(', ')} onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
        </div>
        <div>
          <span className="label">Photo</span>
          <div className="grid grid-cols-6 gap-2">
            <button type="button" onClick={() => setForm({ ...form, image: null })} className={clsx('aspect-square rounded-lg border-2 text-xs', !form.image ? 'border-clay-500' : 'border-transparent bg-cream-100')}>
              None
            </button>
            {IMAGES.map((img) => {
              const src = `/images/${img}.webp`;
              return (
                <button type="button" key={img} onClick={() => setForm({ ...form, image: src })} className={clsx('overflow-hidden rounded-lg border-2', form.image === src ? 'border-clay-500' : 'border-transparent')} aria-label={img}>
                  <img src={src} alt="" className="aspect-square w-full object-cover" />
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-clay-500" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
          Feature on the home page
        </label>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary w-full py-3" disabled={busy}>{busy ? <Spinner className="size-4" /> : 'Save'}</button>
      </form>
    </Modal>
  );
}

export default function MenuManager() {
  const { session } = useStaffContext();
  const { menu, setMenu } = useMenu();
  const status = useStoreStatus();
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const manager = session.role === 'manager';
  const categories = status?.categories ?? [];

  const reload = () => api<MenuItem[]>('/menu').then(setMenu);

  const toggle = async (item: MenuItem) => {
    setError(null);
    setMenu((m) => m?.map((x) => (x.id === item.id ? { ...x, available: !x.available } : x)) ?? null);
    try {
      await api(`/staff/menu/${item.id}/availability`, { method: 'PATCH', body: { available: !item.available } });
    } catch (e) {
      setError((e as Error).message);
      reload();
    }
  };

  const remove = async (item: MenuItem) => {
    if (!confirm(`Delete ${item.name} from the menu?`)) return;
    try {
      await api(`/staff/menu/${item.id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">Menu</h1>
          <p className="text-sm text-espresso-600">Mark items sold out instantly — customers see it live.{!manager && ' Ask a manager to edit prices.'}</p>
        </div>
        {manager && (
          <button className="btn-primary" onClick={() => setEditing({ category: categories[0], price: 0, tags: [], image: null })}>
            <Plus className="size-4" /> Add item
          </button>
        )}
      </div>
      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
      {!menu && <Spinner />}
      {categories.map((cat) => {
        const items = menu?.filter((m) => m.category === cat) ?? [];
        if (!items.length) return null;
        return (
          <section key={cat} className="mt-6">
            <h2 className="eyebrow">{cat}</h2>
            <div className="card mt-2 divide-y divide-cream-100">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <Photo src={item.image} alt="" className="size-12 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className={clsx('truncate font-semibold', !item.available && 'text-espresso-600 line-through')}>{item.name}</p>
                    <p className="text-sm text-espresso-600">{peso(item.price)}{item.featured && ' · Featured'}</p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <span className={item.available ? 'text-emerald-700' : 'text-rose-600'}>{item.available ? 'Available' : 'Sold out'}</span>
                    <input type="checkbox" role="switch" checked={item.available} onChange={() => toggle(item)} className="peer sr-only" />
                    <span className="relative h-6 w-11 rounded-full bg-cream-300 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-clay-500 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
                  </label>
                  {manager && (
                    <>
                      <button className="btn-ghost p-2" onClick={() => setEditing(item)} aria-label={`Edit ${item.name}`}><Pencil className="size-4" /></button>
                      <button className="btn-ghost p-2 hover:text-rose-600" onClick={() => remove(item)} aria-label={`Delete ${item.name}`}><Trash2 className="size-4" /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <Editor item={editing} categories={categories} onClose={() => setEditing(null)} onSaved={reload} />
    </div>
  );
}
