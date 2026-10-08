export const STORE = {
  name: 'Lore Coffee Station',
  tagline: 'Coffee · Anytime · Everywhere',
  address: 'Diversion Rd, Fajardo Subd., Sambag, Jaro, Iloilo City',
  phone: '0926 706 5742',
  mapsQuery: 'Lore Coffee Station, Diversion Rd, Jaro, Iloilo City',
  instagram: 'https://www.instagram.com/lorecoffeestation/',
  facebook: 'https://www.facebook.com/lorecoffeestation/',
  timeZone: 'Asia/Manila',
  // 0 = Sunday. Hours from the shop's Instagram bio.
  hours: [
    { day: 0, open: 12, close: 22 },
    { day: 1, open: 10, close: 22 },
    { day: 2, open: 10, close: 22 },
    { day: 3, open: 10, close: 22 },
    { day: 4, open: 10, close: 22 },
    { day: 5, open: 10, close: 22 },
    { day: 6, open: 10, close: 22 },
  ],
};

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Wall-clock parts in Manila, regardless of the viewer's own time zone. */
export function manilaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE.timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, hour: Number(get('hour')), minute: Number(get('minute')) };
}

export function businessDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: STORE.timeZone }).format(date);
}

export const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? ' AM' : ' PM'}`;

export function storeStatus(date = new Date()) {
  const { day, hour, minute } = manilaParts(date);
  const today = STORE.hours[day];
  const now = hour + minute / 60;
  if (now >= today.open && now < today.close) {
    return { open: true, label: `Open now · until ${fmtHour(today.close)}` };
  }
  if (now < today.open) return { open: false, label: `Closed · opens ${fmtHour(today.open)} today` };
  const tomorrow = STORE.hours[(day + 1) % 7];
  return { open: false, label: `Closed · opens ${fmtHour(tomorrow.open)} tomorrow` };
}

/**
 * Where customers send QR / bank payments. PLACEHOLDERS — replace with the shop's real details.
 * Put the shop's static QR Ph image in public/images (e.g. qrph.png) and set qrImage to '/images/qrph.png';
 * until then a demo QR is generated.
 */
export const PAYMENT_ACCOUNTS = {
  qrImage: null as string | null,
  bank: [
    { bank: 'BPI', accountName: 'Lore Coffee Station', accountNumber: '0000-0000-00 (placeholder)' },
    { bank: 'BDO', accountName: 'Lore Coffee Station', accountNumber: '0000-0000-0000 (placeholder)' },
  ],
};
