/*
  Client helpers for real web push. The VAPID *public* key is exposed to the browser via
  NEXT_PUBLIC_VAPID_PUBLIC_KEY; the private key stays on the server. Subscriptions and the
  user's reminder time/timezone are stored server-side (Supabase) so a scheduled job can
  deliver the daily reminder even when the app is closed.
*/

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Whether push is set up on this deployment (server env present). */
export const pushConfigured = !!VAPID_PUBLIC;

export type PushError = "unsupported" | "not_configured" | "denied" | "server";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function supported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function postSubscription(sub: PushSubscription, checkinTime: string, habitReminders: boolean, language: string): Promise<boolean> {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      checkinTime,
      habitReminders,
      language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  return res.ok;
}

/** Ask permission, subscribe, and register the subscription + reminder time on the server. */
export async function enablePush(checkinTime: string, habitReminders: boolean, language: string): Promise<{ ok: boolean; error?: PushError }> {
  if (!supported()) return { ok: false, error: "unsupported" };
  if (!VAPID_PUBLIC) return { ok: false, error: "not_configured" };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, error: "denied" };
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    });
  }
  const ok = await postSubscription(sub, checkinTime, habitReminders, language);
  return ok ? { ok: true } : { ok: false, error: "server" };
}

/** Push the latest reminder time/settings to the server for the existing subscription. */
export async function syncPush(checkinTime: string, habitReminders: boolean, language: string): Promise<void> {
  if (!supported() || !VAPID_PUBLIC) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) await postSubscription(sub, checkinTime, habitReminders, language);
}

/** Unsubscribe locally and remove the subscription from the server. */
export async function disablePush(): Promise<void> {
  if (!supported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
