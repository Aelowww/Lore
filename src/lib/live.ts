import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from './firebase';

/*
 * Live updates come straight from Firestore. The server writes these documents whenever something changes:
 *   publicOrders/{id}  one customer's order, as the tracking page may see it
 *   public/board       order numbers for the "Now serving" board
 *   public/menu        a version stamp that changes whenever the menu does
 */

/** Calls `onChange` with the document's data now and on every change. Returns an unsubscribe function. */
export function watchDoc<T>(path: string, onChange: (data: T) => void) {
  return onSnapshot(
    doc(firestore, path),
    (snap) => snap.exists() && onChange(snap.data() as T),
    (err) => console.warn(`Live updates for ${path} stopped:`, err.message),
  );
}

/** Short chime for new orders, generated with Web Audio so no sound file is needed. */
export function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain).connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch {
    /* audio unavailable */
  }
}
