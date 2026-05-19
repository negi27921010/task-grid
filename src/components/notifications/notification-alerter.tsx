'use client';

// NotificationAlerter — fires a chime + browser notification + in-app
// toast whenever the user's unread count goes UP. Mounted once in the
// app shell so every page gets the live alert behavior. Distinct from
// CarriedTaskAlerter (which is time-windowed) — this one reacts to any
// new notification including admin nudges, comment mentions, and
// status-change writes.
//
// Why poll instead of push: avoids needing a service worker + VAPID
// keys + push subscription storage. The existing useUnreadCount already
// polls every 30s; we hook the same hook and react to deltas. When
// real-time becomes a hard requirement we can swap to Supabase Realtime
// without changing the alert UX.

import { useEffect, useRef } from 'react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useUnreadCount, useNotifications } from '@/lib/hooks/use-notifications';
import { useToast } from '@/components/ui/toast';

// Soft chime via Web Audio — same shape as the carried-task alerter so
// the audio identity is consistent across in-app alerts. Generated
// inline (no asset shipped).
function playChime(): void {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try { return await Notification.requestPermission(); }
  catch { return 'denied'; }
}

export function NotificationAlerter() {
  const { currentUser, isLoading } = useCurrentUser();
  const { toast } = useToast();
  const { data: unreadCount = 0 } = useUnreadCount(currentUser.id);
  // Pull the most recent notifications so we can describe what arrived
  // in the toast / OS-notification headline. Polled passively (15s
  // staleTime per the hook); only requested when user is signed in.
  const { data: notifications } = useNotifications(currentUser.id, !!currentUser.id);

  // Track last-seen unread count to detect deltas. Initialised to the
  // current count so we don't fire on the very first poll (which would
  // alert about pre-existing unreads from before the page loaded).
  const lastCountRef = useRef<number | null>(null);
  // Track the most recent notification id we've alerted on so we don't
  // re-alert if the count fluctuates due to mark-read race.
  const lastNotifIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || !currentUser.id) return;

    // Initialise on first observation — no alert.
    if (lastCountRef.current === null) {
      lastCountRef.current = unreadCount;
      lastNotifIdRef.current = notifications?.[0]?.id ?? null;
      return;
    }

    // Count went up → at least one new notification arrived.
    if (unreadCount > lastCountRef.current) {
      const latest = notifications?.[0];
      // If we have the freshest list and its top id differs from what
      // we last alerted on, use that as the headline. Otherwise fall
      // back to a generic message.
      const isNewLatest = latest && latest.id !== lastNotifIdRef.current;
      const headline = isNewLatest ? latest.title : 'New notification';
      const body = isNewLatest && latest.body ? latest.body : 'Open the bell to see it.';

      // Best-effort OS notification when the tab isn't focused.
      void (async () => {
        const perm = await ensureNotificationPermission();
        if (perm === 'granted' && document.visibilityState !== 'visible') {
          try {
            const n = new Notification(headline, { body, tag: latest?.id ?? `nudge-${Date.now()}` });
            n.onclick = () => { window.focus(); n.close(); };
          } catch { /* fall through to in-app toast */ }
        }
      })();

      playChime();
      toast(headline, 'warning');

      if (latest?.id) lastNotifIdRef.current = latest.id;
    }

    lastCountRef.current = unreadCount;
  }, [unreadCount, notifications, isLoading, currentUser.id, toast]);

  return null;
}
