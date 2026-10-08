import { io } from 'socket.io-client';
import { useEffect } from 'react';

export const socket = io({ autoConnect: true });

/** Join a realtime channel and re-join automatically after reconnects. */
export function useChannel(channel: string | null, token?: string | null) {
  useEffect(() => {
    if (!channel) return;
    const join = () => socket.emit('subscribe', { channel, token });
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
    };
  }, [channel, token]);
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
