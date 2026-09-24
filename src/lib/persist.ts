const DB_NAME = "pact";
const DB_VERSION = 2;
const STORE = "account";
const DEVICE_STORE = "device";
const KEY = "current";
const LEGACY = "pact.v1";

type Saved = { schema?: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(DEVICE_STORE)) db.createObjectStore(DEVICE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<Saved | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve((req.result as Saved | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(value: unknown) {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function readAccount(): Promise<Saved | null> {
  try {
    const fromDb = await idbGet();
    if (fromDb && fromDb.schema === 2) return fromDb;
  } catch {
    /* localStorage fallback */
  }
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LEGACY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Saved;
    if (parsed.schema !== 2) return null;
    await idbSet(parsed).catch(() => {});
    return parsed;
  } catch {
    return null;
  }
}

export async function writeAccount(value: unknown) {
  try {
    await idbSet(value);
  } catch {
    /* localStorage still holds a copy */
  }
}

export async function clearAccount() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(LEGACY);
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* already empty */
  }
}

export async function readDeviceKey<T>(): Promise<T | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DEVICE_STORE, "readonly");
      const req = tx.objectStore(DEVICE_STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function writeDeviceKey(value: unknown) {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DEVICE_STORE, "readwrite");
    tx.objectStore(DEVICE_STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function askPersistentStorage() {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
  void navigator.storage.persist();
}
