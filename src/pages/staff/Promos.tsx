import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { peso } from '../../shared/pricing';
import type { Voucher } from '../../shared/types';
import { ErrorNote, Segmented } from '../../components/ui';

const EMPTY: Voucher = { code: '', description: '', kind: 'percent', value: 10, minSpend: 0, active: true };

export default function Promos() {
  const [list, setList] = useState<Voucher[]>([]);
  const [form, setForm] = useState<Voucher>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const load = () => api<Voucher[]>('/staff/vouchers').then(setList).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const save = async (v: Voucher) => {
    setError(null);
    try {
      await api(`/staff/vouchers/${encodeURIComponent(v.code)}`, { method: 'PUT', body: v });
      load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <h1 className="font-display text-4xl font-semibold">Promo codes</h1>
      <p className="text-sm text-espresso-600">Customers enter these at checkout; cashiers can use them on the register.</p>

      <form
        className="card mt-6 grid gap-3 p-5 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await save(form)) setForm(EMPTY);
        }}
      >
        <div>
          <label className="label" htmlFor="v-code">Code</label>
          <input id="v-code" className="input font-mono uppercase" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <label className="label" htmlFor="v-desc">Description</label>
          <input id="v-desc" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <span className="label">Type</span>
          <Segmented value={form.kind} onChange={(kind) => setForm({ ...form, kind })} options={[{ value: 'percent', label: '% off' }, { value: 'fixed', label: '₱ off' }]} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="v-val">Value</label>
            <input id="v-val" className="input" type="number" min={1} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label" htmlFor="v-min">Min. spend</label>
            <input id="v-min" className="input" type="number" min={0} value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: Number(e.target.value) })} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <ErrorNote>{error}</ErrorNote>
          <button className="btn-primary mt-2">Save promo</button>
        </div>
      </form>

      <div className="card mt-6 divide-y divide-cream-100">
        {list.map((v) => (
          <div key={v.code} className="flex items-center gap-4 p-4">
            <span className="rounded-lg bg-cream-100 px-2.5 py-1 font-mono text-sm font-semibold">{v.code}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{v.kind === 'percent' ? `${v.value}% off` : `${peso(v.value)} off`}{v.minSpend > 0 && ` · min ${peso(v.minSpend)}`}</p>
              <p className="truncate text-xs text-espresso-600">{v.description}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-clay-500" checked={v.active} onChange={() => save({ ...v, active: !v.active })} />
              Active
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
