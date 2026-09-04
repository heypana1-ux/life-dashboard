"use client";

/*
  Image storage for journal photos and vision-board cards.

  These used to be base64 data: URLs inside the one big JSON blob in localStorage, which does
  not survive contact with real use. Measured: one resized photo is ~231 KB as a data URL,
  localStorage caps out around 4.9 MB, and the store wrote the blob twice (main + backup) — so
  roughly ten photos filled it. Worse, the write failure was swallowed, so the app kept running
  on in-memory state and everything since the first failed save vanished on reload.

  So the bytes live in IndexedDB as Blobs instead: no 5 MB ceiling, and Blobs skip base64's 33%
  overhead. The JSON keeps only a short reference ("idb:<id>"), which is what gets synced.

  Consequence worth knowing: an image is stored on the device that added it. Cross-device
  photos need object storage (e.g. a Supabase Storage bucket) — a separate step. References to
  images this device doesn't have resolve to null and render as a placeholder rather than a
  broken tile.
*/

const DB_NAME = "life-dashboard-media";
const STORE = "images";
const PREFIX = "idb:";

export const isBlobRef = (ref: string) => ref.startsWith(PREFIX);
/** Old entries still hold inline data: URLs; they stay renderable until migrated. */
export const isDataUrl = (ref: string) => ref.startsWith("data:");

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexeddb"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

function newId(): string {
  return `${PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Stores a blob and returns the reference to keep in the entry. */
export async function putImage(blob: Blob): Promise<string> {
  const id = newId();
  await tx("readwrite", (s) => s.put(blob, id));
  return id;
}

/** The stored blob, or null when this device doesn't have it. */
export async function getImage(ref: string): Promise<Blob | null> {
  if (!isBlobRef(ref)) return null;
  try {
    return (await tx<Blob | undefined>("readonly", (s) => s.get(ref))) ?? null;
  } catch {
    return null;
  }
}

export async function deleteImage(ref: string): Promise<void> {
  if (!isBlobRef(ref)) return;
  try {
    await tx("readwrite", (s) => s.delete(ref));
  } catch {
    /* a missing image is already the desired state */
  }
}

/**
 * Drops every stored image that nothing references any more — entries deleted while offline,
 * a restored backup, an import. Called on startup, after the migration.
 */
export async function collectGarbage(referenced: string[]): Promise<number> {
  try {
    const keep = new Set(referenced.filter(isBlobRef));
    const keys = await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
    const orphans = keys.map(String).filter((k) => !keep.has(k));
    for (const k of orphans) await tx("readwrite", (s) => s.delete(k));
    return orphans.length;
  } catch {
    return 0;
  }
}

/** Rough total of what the image store occupies, for the storage card in Settings. */
export async function imageBytes(): Promise<number> {
  try {
    const all = await tx<Blob[]>("readonly", (s) => s.getAll());
    return all.reduce((sum, b) => sum + (b?.size ?? 0), 0);
  } catch {
    return 0;
  }
}

/** Converts a legacy data: URL to a Blob so it can be moved into IndexedDB. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [head, b64] = dataUrl.split(",");
    const mime = /:(.*?);/.exec(head)?.[1] ?? "image/jpeg";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}
