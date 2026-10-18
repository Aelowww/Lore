import { create } from 'zustand';
import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { StaffSession } from '../shared/types';

// Firebase Auth keeps the actual sign-in; this only remembers the name and role for the UI.
const KEY = 'lore-staff';

function load(): StaffSession | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}

function save(session: StaffSession | null) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: session lasts for this tab only */
  }
}

interface StaffState {
  session: StaffSession | null;
  login: (s: StaffSession & { customToken: string }) => Promise<void>;
  logout: () => void;
}

export const useStaff = create<StaffState>()((set) => ({
  session: load(),
  login: async ({ customToken, name, role }) => {
    await signInWithCustomToken(auth, customToken);
    const session = { name, role };
    save(session);
    set({ session });
  },
  logout: () => {
    save(null);
    set({ session: null });
    signOut(auth).catch(() => {});
  },
}));

// Signed out of Firebase (or never finished signing in): drop the remembered session too.
onAuthStateChanged(auth, (user) => {
  if (!user && useStaff.getState().session) useStaff.getState().logout();
});

// The server rejected our sign-in (expired after a shift, or the PIN was changed).
window.addEventListener('lore:logout', () => useStaff.getState().logout());
