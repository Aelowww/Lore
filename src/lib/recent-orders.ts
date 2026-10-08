// Remembers this device's online orders so customers can find them again on /track.
const KEY = 'lore-orders';

export function recentOrderIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function rememberOrder(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...recentOrderIds().filter((x) => x !== id)].slice(0, 10)));
  } catch {
    /* storage unavailable */
  }
}
