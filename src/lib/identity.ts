import { createBoxKey, createSigningKey } from "@pact/core";

const KEY = "pact.device-key";

export type DeviceKey = { pk: string; sk: string; boxPk: string; boxSk: string };

export async function deviceIdentity(): Promise<DeviceKey> {
  const existing = localStorage.getItem(KEY);
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as Partial<DeviceKey>;
      if (parsed.pk && parsed.sk && parsed.boxPk && parsed.boxSk) return parsed as DeviceKey;
      if (parsed.pk && parsed.sk) {
        const box = await createBoxKey();
        const next = { pk: parsed.pk, sk: parsed.sk, boxPk: box.publicKey, boxSk: box.secretKey };
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      }
    } catch {
      /* mint a new device key */
    }
  }
  const [signing, box] = await Promise.all([createSigningKey(), createBoxKey()]);
  const created = { pk: signing.pk, sk: signing.sk, boxPk: box.publicKey, boxSk: box.secretKey };
  localStorage.setItem(KEY, JSON.stringify(created));
  return created;
}
