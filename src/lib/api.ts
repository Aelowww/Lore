import { useEffect, useState } from 'react';
import type { MenuItem } from '../shared/types';
import { auth } from './firebase';
import { watchDoc } from './live';

/** The signed-in staff member's Firebase ID token (refreshed automatically when it nears expiry). */
const getStaffToken = async () => (auth.currentUser ? auth.currentUser.getIdToken() : null);

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = path.startsWith('/staff') ? await getStaffToken() : null;
  let res: Response;
  try {
    res = await fetch('/api' + path, {
      method: init.method ?? (init.body ? 'POST' : 'GET'),
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Can’t reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event('lore:logout'));
    throw new ApiError(res.status, data.error ?? 'Something went wrong.');
  }
  return data as T;
}

/** Live menu: refetches whenever staff change availability or prices. */
export function useMenu() {
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const load = () =>
      api<MenuItem[]>('/menu')
        .then((m) => {
          setMenu(m);
          setError(null);
        })
        .catch((e) => setError(e.message));
    load();
    let first = true;
    return watchDoc('public/menu', () => {
      if (!first) load();
      first = false;
    });
  }, []);
  return { menu, error, setMenu };
}

export function useStoreStatus() {
  const [status, setStatus] = useState<{ open: boolean; label: string; categories: string[] } | null>(null);
  useEffect(() => {
    const load = () => api<typeof status>('/store').then(setStatus).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);
  return status;
}
