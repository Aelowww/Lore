import { create } from 'zustand';
import type { StaffSession } from '../shared/types';

// Stored as plain JSON ({ token, name, role }) because api.ts reads the token directly.
const KEY = 'lore-staff';

function load(): StaffSession | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}

interface StaffState {
  session: StaffSession | null;
  login: (s: StaffSession) => void;
  logout: () => void;
}

export const useStaff = create<StaffState>()((set) => ({
  session: load(),
  login: (session) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      /* private mode: session lasts for this tab only */
    }
    set({ session });
  },
  logout: () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    set({ session: null });
  },
}));

// The server rejected our token (expired or server restarted).
window.addEventListener('lore:logout', () => useStaff.getState().logout());
