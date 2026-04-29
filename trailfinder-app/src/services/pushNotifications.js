// TrailHub – Web Push Notification Service
// Manages browser push subscriptions via the Web Push API (VAPID).

import { supabase } from './supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Convert base64url VAPID public key to Uint8Array for pushManager.subscribe()
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

const supported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Request push permission, create a push subscription, and persist it to DB.
 * Returns { ok: true } on success or { ok: false, reason } on failure.
 */
export async function requestAndSubscribePush(userId) {
  if (!supported)        return { ok: false, reason: 'unsupported' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'not_configured' };
  if (!userId)           return { ok: false, reason: 'no_user' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  try {
    const registration  = await navigator.serviceWorker.ready;
    let   subscription  = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const sub = subscription.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id:  userId,
        endpoint: sub.endpoint,
        p256dh:   sub.keys?.p256dh  ?? null,
        auth_key: sub.keys?.auth    ?? null,
        platform: 'web',
      },
      { onConflict: 'user_id,endpoint' }
    );

    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error('[TrailHub] Push subscription error:', err);
    return { ok: false, reason: 'error', error: err };
  }
}

/**
 * Re-subscribe silently if the user already granted permission but the
 * subscription was lost (e.g. browser update, SW reinstall).
 */
export async function ensurePushSubscribed(userId) {
  if (!supported || !VAPID_PUBLIC_KEY || !userId) return;
  if (Notification.permission !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing     = await registration.pushManager.getSubscription();
    if (!existing) await requestAndSubscribePush(userId);
  } catch {
    // Silent – don't interrupt normal app flow
  }
}

/**
 * Remove all push subscriptions for the user from both the browser and the DB.
 */
export async function unsubscribeFromPush(userId) {
  if (!supported || !userId) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const { endpoint } = subscription;
      await subscription.unsubscribe();
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint);
    }
  } catch (err) {
    console.error('[TrailHub] Push unsubscribe error:', err);
  }
}
