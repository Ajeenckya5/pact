/** Browser storage budget for one origin: IndexedDB, Cache Storage, and localStorage. */
export const STORAGE_BUDGET_BYTES = 5 * 1024 * 1024;
export const STORAGE_PRESSURE = 0.8;
export const SHELL_CACHE = "pact-shell-v3";
export const SHELL_BUDGET_BYTES = 2 * 1024 * 1024;

export function overStoragePressure(usage: number) {
  return usage > STORAGE_BUDGET_BYTES * STORAGE_PRESSURE;
}

/** Older shell names go first. The live shell is last. */
export function evictionOrder(names: string[], current = SHELL_CACHE) {
  const older = names.filter((name) => name !== current).sort();
  return names.includes(current) ? [...older, current] : older;
}

export function formatStorageMb(bytes: number) {
  const mb = Math.max(0, bytes) / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export async function storageUsage() {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return 0;
  const estimate = await navigator.storage.estimate();
  return estimate.usage ?? 0;
}

export async function enforceStorageBudget() {
  let usage = await storageUsage();
  if (!overStoragePressure(usage) || typeof caches === "undefined") return usage;
  for (const name of evictionOrder(await caches.keys())) {
    if (!overStoragePressure(usage)) break;
    await caches.delete(name);
    usage = await storageUsage();
  }
  return usage;
}

export async function clearBrowserData() {
  if (typeof caches !== "undefined") {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  }
  if (typeof localStorage !== "undefined") localStorage.clear();
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
  if (typeof indexedDB !== "undefined") {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase("pact");
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  }
  if (typeof navigator !== "undefined" && navigator.serviceWorker) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
}
