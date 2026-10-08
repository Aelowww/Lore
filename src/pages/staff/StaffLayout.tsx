import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { BarChart3, CalendarHeart, ChefHat, ClipboardList, Delete, LogOut, Monitor, ReceiptText, Tag, UtensilsCrossed, Volume2, VolumeX } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../../lib/api';
import { chime, socket, useChannel } from '../../lib/socket';
import { useStaff } from '../../store/staff';
import type { Order, StaffSession } from '../../shared/types';
import { Wordmark } from '../../components/SiteLayout';
import { ErrorNote, Spinner } from '../../components/ui';

function PinLogin() {
  const login = useStaff((s) => s.login);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (value: string) => {
      setBusy(true);
      setError(null);
      try {
        login(await api<StaffSession>('/staff/login', { body: { pin: value } }));
      } catch (e) {
        setError((e as Error).message);
        pinRef.current = '';
        setPin('');
      } finally {
        setBusy(false);
      }
    },
    [login],
  );

  // A ref keeps fast keyboard entry from reading a stale PIN between renders.
  const pinRef = useRef('');
  const update = (next: string) => {
    pinRef.current = next;
    setPin(next);
  };
  const press = (d: string) => {
    if (busy || pinRef.current.length >= 4) return;
    const next = pinRef.current + d;
    update(next);
    if (next.length === 4) submit(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      if (e.key === 'Backspace') update(pinRef.current.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="grid min-h-screen place-items-center bg-espresso-900 px-4">
      <div className="w-full max-w-xs text-center">
        <Wordmark light />
        <p className="mt-6 text-sm text-cream-300">Enter your staff PIN</p>
        <div className="my-6 flex justify-center gap-3" aria-live="polite" aria-label={`${pin.length} of 4 digits entered`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={clsx('size-4 rounded-full transition', i < pin.length ? 'bg-clay-400' : 'bg-espresso-700')} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) =>
            k === '' ? (
              <span key="blank" />
            ) : (
              <button
                key={k}
                onClick={() => (k === '⌫' ? update(pinRef.current.slice(0, -1)) : press(k))}
                className="grid h-16 place-items-center rounded-2xl bg-espresso-800 text-2xl font-semibold text-cream-100 transition hover:bg-espresso-700 active:scale-95"
                aria-label={k === '⌫' ? 'Delete' : k}
              >
                {k === '⌫' ? <Delete className="size-6" /> : k}
              </button>
            ),
          )}
        </div>
        <div className="mt-5 min-h-12">{busy ? <Spinner className="text-clay-300" /> : <ErrorNote>{error}</ErrorNote>}</div>
      </div>
    </div>
  );
}

export interface StaffContext {
  session: StaffSession;
  orders: Order[];
  upsert: (o: Order) => void;
  reload: () => void;
}
export const useStaffContext = () => useOutletContext<StaffContext>();

/** Active orders kept live over the socket; chimes when a new online order arrives. */
function useLiveOrders(token: string, sound: boolean) {
  const [orders, setOrders] = useState<Order[]>([]);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const seen = useRef(new Set<string>());

  const upsert = useCallback((o: Order) => {
    if (!seen.current.has(o.id) && o.source === 'online' && soundRef.current) chime();
    seen.current.add(o.id);
    setOrders((xs) => {
      const active = ['pending', 'preparing', 'ready'].includes(o.status);
      const exists = xs.some((x) => x.id === o.id);
      if (!active) return xs.filter((x) => x.id !== o.id);
      return exists ? xs.map((x) => (x.id === o.id ? o : x)) : [...xs, o];
    });
  }, []);

  const reload = useCallback(() => {
    api<Order[]>('/staff/orders')
      .then((xs) => {
        xs.forEach((o) => seen.current.add(o.id));
        setOrders(xs);
      })
      .catch(() => {});
  }, []);

  useChannel('staff', token);
  useEffect(() => {
    reload();
    socket.on('order', upsert);
    socket.on('connect', reload);
    return () => {
      socket.off('order', upsert);
      socket.off('connect', reload);
    };
  }, [upsert, reload]);

  return { orders, upsert, reload };
}

function Shell({ session }: { session: StaffSession }) {
  const logout = useStaff((s) => s.logout);
  const [sound, setSound] = useState(true);
  const { orders, upsert, reload } = useLiveOrders(session.token, sound);
  const waiting = orders.filter((o) => o.status === 'pending' || o.paymentStatus === 'pending_verification').length;
  const manager = session.role === 'manager';

  const nav = [
    { to: '/staff/pos', label: 'Register', icon: ReceiptText },
    { to: '/staff/orders', label: 'Orders', icon: ClipboardList, badge: waiting },
    { to: '/staff/kitchen', label: 'Kitchen', icon: ChefHat },
    { to: '/staff/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/staff/events', label: 'Events', icon: CalendarHeart },
    ...(manager
      ? [
          { to: '/staff/reports', label: 'Reports', icon: BarChart3 },
          { to: '/staff/promos', label: 'Promos', icon: Tag },
        ]
      : []),
  ];

  return (
    <div className="flex h-screen flex-col bg-cream-100 md:flex-row">
      <aside className="flex shrink-0 items-center gap-1 overflow-x-auto bg-espresso-900 px-2 py-2 text-cream-200 md:w-56 md:flex-col md:items-stretch md:px-3 md:py-5">
        <div className="hidden px-2 pb-6 md:block">
          <Wordmark light className="items-start" />
          <p className="mt-2 text-xs text-cream-300/70">Staff · {session.name}</p>
        </div>
        {nav.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-clay-500 text-white' : 'hover:bg-espresso-800',
              )
            }
          >
            <Icon className="size-5" />
            <span className="hidden sm:inline">{label}</span>
            {!!badge && <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-xs font-bold text-espresso-950">{badge}</span>}
          </NavLink>
        ))}
        <div className="ml-auto flex gap-1 md:ml-0 md:mt-auto md:flex-col">
          <a href="/board" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-espresso-800">
            <Monitor className="size-5" /> <span className="hidden md:inline">Open queue board</span>
          </a>
          <button onClick={() => setSound((s) => !s)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-espresso-800" aria-pressed={sound}>
            {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />} <span className="hidden md:inline">Sound {sound ? 'on' : 'off'}</span>
          </button>
          <button onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-espresso-800">
            <LogOut className="size-5" /> <span className="hidden md:inline">Log out</span>
          </button>
        </div>
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Suspense fallback={<div className="p-6"><Spinner /></div>}>
          <Outlet context={{ session, orders, upsert, reload } satisfies StaffContext} />
        </Suspense>
      </main>
    </div>
  );
}

export default function StaffLayout() {
  const session = useStaff((s) => s.session);
  return session ? <Shell session={session} /> : <PinLogin />;
}
