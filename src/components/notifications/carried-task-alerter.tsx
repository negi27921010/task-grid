'use client';

// CarriedTaskAlerter — fires a browser Notification + soft chime when a
// user has open carried standup items at the morning (11 AM IST) and
// evening (6 PM IST) closure slots. Mounted once in the app shell.
//
// Why no service worker / push subscription:
//   We only need to alert when the app tab is open. Service-worker push
//   would let us nudge offline users but adds VAPID key management,
//   subscription storage, browser permission flows, and the existing
//   email cron already covers offline. Keep complexity low.
//
// Dedupe:
//   localStorage key `carried_alert_fired` stores `${date}-${slot}` so
//   each slot fires at most once per IST day even if the page is open
//   for hours or polled repeatedly.

import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';

const POLL_INTERVAL_MS = 5 * 60 * 1000;       // 5 min
const SLOT_WINDOW_MIN  = 30;                   // ±30 min around 11:00 / 18:00
const STORAGE_KEY      = 'carried_alert_fired_v1';

interface CarriedItem {
  id: string;
  title: string;
  carry_streak: number;
}

function nowIST(): { date: string; hour: number; minute: number } {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return {
    date: `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`,
    hour: ist.getUTCHours(),
    minute: ist.getUTCMinutes(),
  };
}

// Returns 'morning' | 'evening' | null based on current IST clock.
function activeSlot(): 'morning' | 'evening' | null {
  const ist = nowIST();
  const minutesSince = (h: number, m: number) =>
    Math.abs((ist.hour - h) * 60 + (ist.minute - m));
  if (minutesSince(11, 0) <= SLOT_WINDOW_MIN) return 'morning';
  if (minutesSince(18, 0) <= SLOT_WINDOW_MIN) return 'evening';
  return null;
}

function readFiredSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeFiredSet(s: Set<string>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(s))); }
  catch { /* quota / private mode — silently skip */ }
}

// Pruned to keep one IST-day's worth of keys; drops anything older than
// today so localStorage doesn't grow unbounded over months.
function pruneFiredSet(s: Set<string>, today: string): Set<string> {
  const fresh = new Set<string>();
  for (const k of s) if (k.startsWith(today)) fresh.add(k);
  return fresh;
}

// Single short chime via Web Audio. ~120ms of soft sine + envelope to
// avoid click. Generated inline so we don't ship an mp3 asset.
function playChime(): void {
  try {
    const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
    osc.onended = () => { void ctx.close(); };
  } catch { /* sound is best-effort */ }
}

// Lazy permission request — we only ask the first time we'd actually
// fire a notification, not on page load. Returns 'granted' | 'denied'
// | 'default'. If denied, we still show the in-app toast.
async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function CarriedTaskAlerter() {
  const { toast } = useToast();
  const router = useRouter();
  const tickingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (tickingRef.current) return;
      const slot = activeSlot();
      if (!slot) return;

      const ist = nowIST();
      const dedupeKey = `${ist.date}-${slot}`;
      const fired = pruneFiredSet(readFiredSet(), ist.date);
      if (fired.has(dedupeKey)) return;

      tickingRef.current = true;
      try {
        const res = await fetch('/api/standups/my-carried', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json() as { items: CarriedItem[]; standup_exists?: boolean };
        if (!data.items || data.items.length === 0) return;

        // Mark as fired BEFORE showing — even if the user dismisses or
        // the chime is blocked, we don't want to repeat-fire.
        fired.add(dedupeKey);
        writeFiredSet(fired);

        const count = data.items.length;
        const stuck = data.items.filter(i => i.carry_streak >= 3).length;
        const headline = slot === 'morning'
          ? `Carry-over: ${count} task${count === 1 ? '' : 's'} from yesterday`
          : `Close before EOD: ${count} carried task${count === 1 ? '' : 's'} open`;
        const body = stuck > 0
          ? `${stuck} stuck for 3+ days — open standup to unblock.`
          : `Open standup to update or close.`;

        const perm = await ensureNotificationPermission();
        if (perm === 'granted' && document.visibilityState !== 'visible') {
          // Only fire OS notification when the tab isn't already focused —
          // a banner in front of the same UI would be redundant.
          try {
            const n = new Notification(headline, { body, tag: dedupeKey });
            n.onclick = () => {
              window.focus();
              router.push('/standups');
              n.close();
            };
          } catch { /* fall through to in-app toast */ }
        }

        playChime();
        toast(`${headline} — ${body}`, 'warning');
      } finally {
        tickingRef.current = false;
      }
    };

    void tick();
    const id = setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [toast, router]);

  return null;
}
