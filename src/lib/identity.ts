import { createBoxKey, createSigningKey } from "@pact/core";
import { readDeviceKey, writeDeviceKey } from "./persist";

const LEGACY = "pact.device-key";

export type DeviceKey = { pk: string; sk: string; boxPk: string; boxSk: string };

let memory: DeviceKey | null = null;

function complete(value: Partial<DeviceKey> | null | undefined): DeviceKey | null {
  if (!value?.pk || !value.sk || !value.boxPk || !value.boxSk) return null;
  return { pk: value.pk, sk: value.sk, boxPk: value.boxPk, boxSk: value.boxSk };
}

function readLegacy(): Partial<DeviceKey> | null {
  if (typeof localStorage === "undefined") return null;
  const existing = localStorage.getItem(LEGACY);
  if (!existing) return null;
  try {
    return JSON.parse(existing) as Partial<DeviceKey>;
  } catch {
    return null;
  }
}

function dropLegacy() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LEGACY);
}

async function keep(key: DeviceKey) {
  memory = key;
  await writeDeviceKey(key);
  dropLegacy();
  return key;
}

/** Device signing key. Private material stays in IndexedDB, not localStorage. */
export async function deviceIdentity(): Promise<DeviceKey> {
  if (memory) return memory;
  const stored = complete(await readDeviceKey<Partial<DeviceKey>>());
  if (stored) {
    memory = stored;
    dropLegacy();
    return stored;
  }
  const legacy = readLegacy();
  const ready = complete(legacy);
  if (ready) return keep(ready);
  if (legacy?.pk && legacy.sk) {
    const box = await createBoxKey();
    return keep({ pk: legacy.pk, sk: legacy.sk, boxPk: box.publicKey, boxSk: box.secretKey });
  }
  const [signing, box] = await Promise.all([createSigningKey(), createBoxKey()]);
  return keep({ pk: signing.pk, sk: signing.sk, boxPk: box.publicKey, boxSk: box.secretKey });
}
