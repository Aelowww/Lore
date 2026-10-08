import { useEffect, useRef, useState } from 'react';
import { socket, useChannel, chime } from '../lib/socket';
import type { BoardData } from '../shared/types';
import { orderNo } from '../components/ui';
import { Wordmark } from '../components/SiteLayout';

/** Customer-facing "Now serving" screen for a TV or tablet at the counter. */
export default function Board() {
  const [data, setData] = useState<BoardData>({ preparing: [], ready: [] });
  const prevReady = useRef<number[]>([]);
  const [clock, setClock] = useState(new Date());
  useChannel('board');

  useEffect(() => {
    const onBoard = (d: BoardData) => {
      if (d.ready.some((n) => !prevReady.current.includes(n))) chime();
      prevReady.current = d.ready;
      setData(d);
    };
    socket.on('board', onBoard);
    const t = setInterval(() => setClock(new Date()), 30_000);
    return () => {
      socket.off('board', onBoard);
      clearInterval(t);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-espresso-900 text-cream-100">
      <header className="flex items-center justify-between px-8 py-6">
        <Wordmark light className="items-start" />
        <span className="font-display text-3xl tabular-nums text-clay-300">
          {clock.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })}
        </span>
      </header>
      <div className="grid flex-1 gap-6 px-8 pb-8 md:grid-cols-2">
        <section className="rounded-[2rem] bg-espresso-800 p-8">
          <h2 className="eyebrow text-cream-300">Preparing</h2>
          <div className="mt-6 flex flex-wrap gap-4">
            {data.preparing.length === 0 && <p className="text-cream-300/60">—</p>}
            {data.preparing.map((n) => (
              <span key={n} className="font-display text-5xl font-semibold text-cream-200 lg:text-6xl">{orderNo(n)}</span>
            ))}
          </div>
        </section>
        <section className="rounded-[2rem] bg-clay-500 p-8 text-white">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-clay-200">Ready for pickup</h2>
          <div className="mt-6 flex flex-wrap gap-5">
            {data.ready.length === 0 && <p className="text-clay-200">—</p>}
            {data.ready.map((n) => (
              <span key={n} className="animate-pop font-display text-7xl font-semibold lg:text-8xl">{orderNo(n)}</span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
